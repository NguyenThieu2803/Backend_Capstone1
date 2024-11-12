const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // Assuming you're using ObjectIds to link users
    ref: 'User', // Reference to your User model
    required: true
  },
  // Add the 'products' field to store an array of WishlistProduct IDs
  product: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    }
  ],
});

module.exports = mongoose.model('Wishlist', wishlistSchema);