const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Product = require('../../model/Usermodel/Product');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.REVIEW_CLOUDINARY_NAME,
    api_key: process.env.REVIEW_CLOUDINARY_KEY,
    api_secret: process.env.REVIEW_CLOUDINARY_SECRET
});

// Configure AWS S3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Multer setup for memory storage
const storage = multer.memoryStorage();
const updateUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'images') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Not an image! Please upload only images.'), false);
            }
        } else if (file.fieldname === 'model3d') {
            if (file.mimetype === 'model/gltf-binary' || file.mimetype === 'application/octet-stream') {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type! Please upload only .glb files.'), false);
            }
        } else {
            cb(new Error('Unexpected field'), false);
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Handle file updates
const handleFileUpdates = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Handle image updates - Thay thế ảnh cũ
        if (req.files?.images) {
            // Xóa ảnh cũ trên Cloudinary nếu có
            if (product.images && product.images.length > 0) {
                for (const imageUrl of product.images) {
                    try {
                        // Lấy public_id từ URL
                        const publicId = imageUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(`product_images/${publicId}`);
                    } catch (error) {
                        console.error('Error deleting old image:', error);
                    }
                }
            }

            // Upload ảnh mới
            const imagePromises = req.files.images.map(file => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'product_images',
                            resource_type: 'auto',
                            transformation: [{ width: 800, height: 800, crop: 'limit' }]
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
            });

            try {
                const newImageUrls = await Promise.all(imagePromises);
                // Thay thế mảng images cũ bằng mảng mới
                req.body.images = newImageUrls;
            } catch (error) {
                console.error('Error uploading new images:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error uploading images' 
                });
            }
        }

        // Handle 3D model update - Thay thế model cũ
        if (req.files?.model3d) {
            // Xóa model cũ trên AWS S3 nếu có
            if (product.model3d) {
                try {
                    const oldKey = product.model3d.split('/').pop();
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: `models/${oldKey}`
                    }));
                } catch (error) {
                    console.error('Error deleting old 3D model:', error);
                }
            }

            // Upload model mới
            const file = req.files.model3d[0];
            const key = `models/${Date.now()}-${file.originalname}`;
            
            try {
                await s3Client.send(new PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    ACL: 'public-read'
                }));

                // Thay thế URL model cũ bằng URL mới
                req.body.model3d = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
            } catch (error) {
                console.error('Error uploading new 3D model:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error uploading 3D model' 
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error in handleFileUpdates:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error processing files',
            error: error.message 
        });
    }
};

module.exports = {
    updateUpload,
    handleFileUpdates
};
