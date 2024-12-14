const User = require("../model/Usermodel/User");
const Card = require("../model/Usermodel/Card");
const Order = require("../model/Usermodel/Order");
const ShoppingCart = require("../model/Usermodel/ShoppingCart");
const Inventory = require("../model/Usermodel/Inventory");
const StripeService = require("../service/stripe.service");
const CartService = require("../service/cart.service");
const { STRIPE_CONFIG } = require("../config/config");
const Address = require("../model/Usermodel/Address");
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const createOrder = async (params) => {
  try {
    // làm trong và chuyển params.totalPrices thành kiểu integer
    params.totalPrices = Math.round(params.totalPrices);
    console.log('Total Prices:', params.totalPrices);
    const user = await User.findById(params.userId);
    if (!user) throw new Error('User not found');

    // Fetch products directly using provided product IDs
    const collectQuantitiesByProductId = await CartService.getTotalQuantitiesByUserAndProductIds(params.userId, params.products);
    const productDetails = await Promise.all(
      params.products.map(async (product) => {
        console.log('Product:', product);
        const productDetail = await Inventory.findOne({ productId: product.productId });
        console.log('Product Detail:', productDetail.stockQuantity)
        if (!productDetail || productDetail.stockQuantity < product.quantity) {
          throw new Error(`Not enough stock for product ${productDetail?.name || 'unknown'}`);
        }
        return {
          product: productDetail,
          quantity: collectQuantitiesByProductId.find(item => item.productId.toString() === product.productId.toString()).totalQuantity || product.quantity
        };
      })
    );
    if (productDetails.length == 0) {
      throw new Error('You did not select any products');
    }
    console.log('Product Details:', productDetails);

    if (!user.stripeCustomerId) {
      const customer = await StripeService.createCustomer({
        name: user.name,
        email: user.email
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    let paymentIntent;
    let card;
    let paymentStatus = 'Pending'; // Đặt giá trị mặc định cho paymentStatus

    if (params.paymentMethod === 'Credit Card' && params.cardToken) {
      card = await StripeService.addCard({
        customerId: user.stripeCustomerId,
        cardToken: params.cardToken
      });

      if (params.paymentMethod === 'Credit Card') {
        paymentIntent = await StripeService.createPaymentIntent({
          Payment_receipt_email: user.email,
          amount: params.totalPrices,
          customer_id: user.stripeCustomerId,
          currency: params.currency || STRIPE_CONFIG.CURRENCY
        });

        if (paymentIntent.status === 'succeeded') {
          paymentStatus = 'Completed'; // Cập nhật trạng thái thanh toán nếu thành công
        }
      }
    }
    // remove product from cart




    const address = await Address.findById(params.addressId);
    if (!address) throw new Error('Address not found');
    console.log(params.products)
    
    console.log('Collect Quantities:',  collectQuantitiesByProductId.at(0).totalQuantity)

    const order = await Order.create({
      user_id: user._id,
      products: productDetails.map(item => ({
        product: item.product.productId,
        amount: item.product.price,
        quantity: item.quantity
      })),
      total_amount: params.totalPrices,
      transaction_id: paymentIntent?.id || null,
      shipping_address: address._id,
      payment_method: params.paymentMethod,
      payment_status: paymentStatus, // Đặt trạng thái thanh toán
      delivery_status: 'Shipping'
    });

    for (const item of productDetails) {
      await Inventory.findOneAndUpdate(
        { productId: item.product.productId },
        { $inc: { stockQuantity: -collectQuantitiesByProductId.at(0).totalQuantity } }
      );
    }
    await CartService.serviceRemoveProductFromCart(params.userId, params.products);
   

    return order;
  } catch (error) {
    throw new Error(error.message || "Error creating order");
  }
};

const updateOrder = (params, callback) => {
  const model = {
    payment_status: params.payment_status,  // Ensure this matches your Order schema
    transactionId: params.transaction_id // Ensure you have this field in your Order schema
  };

  // Update the order by its ID
  Order.findByIdAndUpdate(params.orderId, model, { new: true, useFindAndModify: false })
    .then((response) => {
      if (!response) {
        return callback('Order update failed: Order not found');
      }
      return callback(null, response);  // Return the updated order
    })
    .catch((err) => {
      return callback(err);
    });
};

const getOrdersByUserId = async (userId) => {
  try {
    // Kiểm tra nếu userId không phải là ObjectId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    // Tìm các đơn hàng theo userId và populate để lấy thông tin chi tiết về product và shipping_address
    const orders = await Order.find({ user_id: new mongoose.Types.ObjectId(userId) })
      .populate('products.product')
      .populate('shipping_address');// Populate thông tin chi tiết của địa chỉ giao hàng

    if (!orders || orders.length === 0) {
      throw new Error('No orders found for this user');
    }

    return orders;
  } catch (error) {
    // Xử lý lỗi và trả về thông báo lỗi phù hợp
    console.error('Error fetching orders:', error.message);
    throw new Error(error.message || 'Error fetching orders');
  }
};
const deleteOrder = async (orderId) => {
  try {
    const result = await Order.findByIdAndDelete(orderId);
    if (!result) {
      throw new Error('Order not found');
    }
    return { message: 'Order deleted successfully' };
  } catch (error) {
    throw new Error(error.message || 'Error deleting order');
  }
};
const autoUpdateDeliveryStatus = async () => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const orders = await Order.updateMany(
      { order_date: { $lte: threeDaysAgo }, delivery_status: 'Pending' },
      { $set: { delivery_status: 'Delivered' } }
    );

    return { message: `Updated ${orders.nModified} orders to 'Delivered' status` };
  } catch (error) {
    throw new Error(error.message || 'Error updating delivery status');
  }
};

const getOrderStatusDistribution = async () => {
  try {
    // First, get total count of orders
    const totalOrders = await Order.countDocuments();
    
    const statusDistribution = await Order.aggregate([
      {
        $group: {
          _id: "$delivery_status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: "$_id",
          percentage: {
            $multiply: [
              { $divide: ["$count", totalOrders] },
              100
            ]
          }
        }
      }
    ]);

    return statusDistribution.map(item => ({
      status: item.status,
      percentage: parseFloat(item.percentage.toFixed(2))
    }));
  } catch (error) {
    throw new Error("Error fetching order status distribution: " + error.message);
  }
};

const getDailyOrders = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%m/%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    return dailyOrders.map(item => ({
      date: item._id,
      Orders: item.count
    }));
  } catch (error) {
    throw new Error("Error fetching daily orders: " + error.message);
  }
};

module.exports = {
  createOrder,
  updateOrder,
  getOrdersByUserId,
  deleteOrder,
  autoUpdateDeliveryStatus,
  getOrderStatusDistribution,
  getDailyOrders,
};
