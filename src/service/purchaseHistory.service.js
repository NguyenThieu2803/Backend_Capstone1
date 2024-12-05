// e:\Capstone1\Capstone 1\Backend_Capstone1\src\service\purchaseHistory.service.js
const Order = require("../model/Usermodel/Order");
const User = require("../model/Usermodel/User");
const Review = require("../model/Usermodel/Review"); // Import the Review model

const purchaseHistoryService = {
  updatePurchaseHistory: async (userId) => {
    try {
      // 1. Find completed orders for the user
      const completedOrders = await Order.find({
        user_id: userId,
        delivery_status: 'Delivered',
        payment_status: 'Completed'
      }).populate('products.product');

      if (!completedOrders || completedOrders.length === 0) {
        return; // No completed orders to process
      }
      let updatedProducts = [];

      for (const order of completedOrders) {
        for (const orderProduct of order.products) {
          const productAlreadyAdded = updatedProducts.some(p => p.product.toString() === orderProduct.product._id.toString());

          if (!productAlreadyAdded) {
            // Check if a review exists for this product by this user
            const reviewExists = await Review.exists({
              user_id: userId,
              product_id: orderProduct.product._id
            });

            updatedProducts.push({
              product: orderProduct.product._id,
              purchaseDate: order.order_date,
              confirmed: reviewExists // Set confirmed based on review existence
            });
          }
        }
      }

      // 2. Update the user's purchase history
      await User.findByIdAndUpdate(userId, {
        $addToSet: { 
          purchaseHistory: { $each: updatedProducts } // Use $each to add multiple entries
        }
      });

    } catch (error) {
      console.error("Error updating purchase history:", error);
      throw error; // Re-throw the error
    }
  }
};

module.exports = purchaseHistoryService;
