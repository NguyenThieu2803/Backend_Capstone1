const mongoose = require('mongoose');

const wishlistProductSchema = new mongoose.Schema({
  wishlist_id: {
    type: mongoose.Schema.Types.ObjectId, // Reference to Wishlist
    ref: 'Wishlist' 
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId, // Reference to Product
    ref: 'Product'
  },
  productName: String // Add productName here
});

module.exports = mongoose.model('WishlistProduct', wishlistProductSchema);