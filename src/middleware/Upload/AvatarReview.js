const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config()

cloudinary.config({
  cloud_name: process.env.AVATAR_CLOUDINARY_NAME,
  api_key: process.env.AVATAR_CLOUDINARY_KEY,
  api_secret: process.env.AVATAR_CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ['jpg', 'png'],
  params: {
    folder: 'avatar_images',
  }
});

const uploadCloudAvatar = multer({ storage });

module.exports = uploadCloudAvatar;