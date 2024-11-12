const Wishlist = require('../model/Usermodel/Wishlist');

async function isProductInWishlist(userId, productId) {
  try {
    
    const wishlist = await Wishlist.findOne({
      user_id: userId,
      'product.product': productId, // MongoDB query to check if productId is in the array
    });

    // If wishlist is found, it means the product exists in the wishlist
    return wishlist ? true : false;
  } catch (error) {
    console.error('Error checking product in wishlist:', error);
    return false;
  }
}

module.exports = isProductInWishlist;