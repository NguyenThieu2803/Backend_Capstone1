const Wishlist = require("../model/Usermodel/Wishlist");
const mongoose = require('mongoose');
const removeProductFromWishlist = async (userId, productId) => {
    try {
      let wishlist = await Wishlist.findOne({ user_id: userId });
      if (!wishlist) {
        return { message: 'Wishlist not found', wishlist: null };
      }
  
      const initialLength = wishlist.product.length;  // Check initial length
  
      wishlist.product = wishlist.product.filter(item => {
        if (item.product) { // Handle potential undefined item.product
            return !item.product.equals(productId);
        }
        return true; // Keep items where item.product is undefined (avoid errors)
      });
  
       // Only save if something changed
      if(wishlist.product.length < initialLength){
          await wishlist.save();
          return { message: 'Product removed from wishlist', wishlist: wishlist };
      } else {
          return {message: 'Product not found in wishlist', wishlist: wishlist};
      }
  
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  };
  

module.exports = {
    removeProductFromWishlist,
};