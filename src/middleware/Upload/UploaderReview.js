const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config()

cloudinary.config({
  cloud_name: process.env.REVIEW_CLOUDINARY_NAME,
  api_key: process.env.REVIEW_CLOUDINARY_KEY,
  api_secret: process.env.REVIEW_CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ['jpg', 'png'],
  params: {
    folder: 'review_images'
  }
});

const uploadCloud = multer({ storage });

module.exports = uploadCloud;
