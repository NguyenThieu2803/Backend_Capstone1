const User = require("../model/Usermodel/User");
const Card = require("../model/Usermodel/Card");
const Order = require("../model/Usermodel/Order");
const ShoppingCart = require("../model/Usermodel/ShoppingCart");
const Inventory = require("../model/Usermodel/Inventory");
const StripeService = require("../service/stripe.service");
const CartService = require("../service/cart.service");
const { STRIPE_CONFIG } = require("../config/config");
const Address = require("../model/Usermodel/Address");

const createOrder = async (params) => {
  try {
    // làm trong và chuyển params.totalPrices thành kiểu integer
    params.totalPrices = Math.round(params.totalPrices);
    console.log('Total Prices:', params.totalPrices);
    const user = await User.findById(params.userId);
    if (!user) throw new Error('User not found');

    // Fetch products directly using provided product IDs
    const productDetails = await Promise.all(
      params.products.map(async (product) => {
        console.log('Product:', product);
        const productDetail = await Inventory.findOne({ productId: product.productId });
        console.log('Product Detail:', productDetail.stockQuantity)
        if (!productDetail || productDetail.stockQuantity < product.quantity) {
          throw new Error(`Not enough stock for product ${productDetail?.name || 'unknown'}`);
        }
        return {
          product: productDetail
        };
      })
    );
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
    const collectQuantitiesByProductId = await CartService.getTotalQuantitiesByUserAndProductIds(params.userId,params.products);
console.log('Collect Quantities:', collectQuantitiesByProductId)

    const order = await Order.create({
      user_id: user._id,
      products: productDetails.map(item => ({
        product: item.product._id,
        amount: params.totalPrices,
        quantity: collectQuantitiesByProductId.at(0).totalQuantity || item.totalQuantity
      })),
      total_amount: params.totalPrices,
      transaction_id: paymentIntent?.id || null,
      shipping_address: address._id,
      payment_method: params.paymentMethod,
      payment_status: paymentStatus, // Đặt trạng thái thanh toán
      delivery_status: 'Pending'
    });

    for (const item of productDetails) {
      await Inventory.findOneAndUpdate(
        { productId: item.product.productId },
        { $inc: { stockQuantity: -collectQuantitiesByProductId.at(0).totalQuantity } }
      );
    }
    await CartService.serviceRemoveProductFromCart(params.userId, params.products);
    await User.findByIdAndUpdate(
      user._id,
      {
        $push: {
          purchaseHistory: {
            $each: productDetails.map(item => ({
              product: item.product.productId,
              purchaseDate: new Date()
            }))
          }
        }
      },
      { new: true }
    );

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

const GetOrder = (params, callback) => {
  Order.findOne({ userId: params.userId })
    .populate({
      path: 'products.product', // Ensure this matches your Order schema
      populate: {
        path: 'product',
        model: 'Product',
        populate: {
          path: 'category',
          model: 'Category',
          select: 'name'
        }
      }
    })
    .then((response) => {
      if (!response) {
        return callback('Order not found');
      }
      return callback(null, response);  // Return the order
    })
    .catch((err) => {
      return callback(err);
    });
};

module.exports = {
  createOrder,
  updateOrder,
  GetOrder,
};
