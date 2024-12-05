const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Configure AWS SDK v3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Configure Multer-S3
const s3Storage = multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
        cb(null, Date.now().toString() + '-' + file.originalname);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
});

const awsUpload = multer({
    storage: s3Storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'model/gltf-binary') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type! Please upload only .glb files.'), false);
        }
    }
});

module.exports = awsUpload;