const cloudinary = require('cloudinary').v2;

const STRIPE_CONFIG = {
    STRIPE_KEY : "sk_test_51Q4IszJ48Cc6e6PCqLUztrVyJYvPsIWd1hAOFRN842Jj7ldseweNpvw7eXXhBF26YTRZc3dvqEFAcRK8hCSFPSF400utPbzD2Q",
    CURRENCY : "USD"
}
cloudinary.config({
    cloud_name: process.env.AVATA_CLOUDINARY_NAME,
    api_key: process.env.AVATA_CLOUDINARY_KEY,
    api_secret: process.env.AVATA_CLOUDINARY_SECRET,
  });


module.exports = {
    STRIPE_CONFIG,
    cloudinary
};