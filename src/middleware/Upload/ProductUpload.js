const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

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

// Temporary storage for files
const storage = multer.memoryStorage();

// Multer setup
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        console.log('Processing file:', file.fieldname, file.mimetype); // Debug log

        if (file.fieldname === 'images') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Not an image! Please upload only images.'), false);
            }
        } else if (file.fieldname === 'model3d') {
            // Accept more 3D file types if needed
            if (file.mimetype === 'model/gltf-binary' || 
                file.mimetype === 'application/octet-stream') { // Some systems might use this MIME type
                cb(null, true);
            } else {
                cb(new Error('Invalid file type! Please upload only .glb files.'), false);
            }
        } else {
            cb(new Error('Unexpected field'), false);
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
}).fields([
    { name: 'images', maxCount: 1 },
    { name: 'model3d', maxCount: 1 }
]);

// Upload to Cloudinary
const uploadToCloudinary = async (file) => {
    try {
        console.log('Uploading to Cloudinary:', file.originalname); // Debug log

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'product_images',
                    resource_type: 'auto', // Add this line
                    transformation: [{ width: 800, height: 800, crop: 'limit' }]
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error); // Debug log
                        reject(error);
                    } else {
                        console.log('Cloudinary upload success:', result.secure_url); // Debug log
                        resolve(result);
                    }
                }
            );

            uploadStream.end(file.buffer);
        });

        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload failed:', error); // Debug log
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
};

// Upload to AWS S3
const uploadToS3 = async (file) => {
    try {
        console.log('Uploading to S3:', file.originalname); // Debug log

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `models/${Date.now()}-${file.originalname}`, // Add folder structure
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read' // Make sure the file is publicly accessible
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
        console.log('S3 upload success:', fileUrl); // Debug log
        return fileUrl;
    } catch (error) {
        console.error('S3 upload failed:', error); // Debug log
        throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
};

// Middleware to handle file uploads
const handleUploads = async (req, res, next) => {
    try {
        console.log('Files received:', req.files); // Debug log

        if (!req.files) {
            console.log('No files uploaded'); // Debug log
            return next();
        }

        // Handle image upload to Cloudinary
        if (req.files.images && req.files.images.length > 0) {
            const imageUrls = await Promise.all(
                req.files.images.map(file => uploadToCloudinary(file))
            );
            req.body.images = imageUrls.filter(url => url != null); // Filter out null values
            console.log('Processed image URLs:', req.body.images); // Debug log
        }

        // Handle 3D model upload to S3
        if (req.files.model3d && req.files.model3d.length > 0) {
            const modelUrl = await uploadToS3(req.files.model3d[0]);
            if (modelUrl) {
                req.body.model3d = modelUrl;
                console.log('Processed model URL:', req.body.model3d); // Debug log
            }
        }

        next();
    } catch (error) {
        console.error('Handle uploads error:', error); // Debug log
        next(error);
    }
};

module.exports = {
    upload,
    handleUploads
};
