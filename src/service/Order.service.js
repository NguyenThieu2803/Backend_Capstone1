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
    const user = await User.findById(params.userId);
    if (!user) throw new Error('User not found');

    const cart = await ShoppingCart.findOne({ user_id: params.userId }).populate('product.product');
    if (!cart || cart.product.length === 0) throw new Error('Cart is empty');

    for (const cartItem of cart.product) {
      const inventory = await Inventory.findOne({ productId: cartItem.product._id });
      if (!inventory || inventory.stockQuantity < cartItem.quantity) {
        throw new Error(`Not enough stock for product ${cartItem.product.name}`);
      }
    }

    if (!user.stripeCustomerId) {
      const customer = await StripeService.createCustomer({
        name: user.name,
        email: user.email
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    let card;
    if (params.paymentMethod === 'Credit Card' && params.cardToken) {
      card = await StripeService.addCard({
        customerId: user.stripeCustomerId,
        cardToken: params.cardToken
      });
    }

    const totalAmount = cart.product.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let paymentIntent;
    if (params.paymentMethod === 'Credit Card') {
      paymentIntent = await StripeService.createPaymentIntent({
        Payment_receipt_email: user.email,
        amount: totalAmount*100,
        customer_id: user.stripeCustomerId,
        currency: params.currency || STRIPE_CONFIG.CURRENCY
      });
    }

    const address = await Address.findById(params.addressId);
    if (!address) throw new Error('Address not found');

    const order = await Order.create({
      user_id: user._id,
      products: cart.product.map(item => ({
        product: item.product._id,
        amount: item.price * item.quantity,
        quantity: item.quantity
      })),
      total_amount: totalAmount,
      transaction_id: paymentIntent?.id || null,
      shipping_address: address._id,
      payment_method: params.paymentMethod,
      delivery_status: 'Pending'
    });

    for (const cartItem of cart.product) {
      await Inventory.findOneAndUpdate(
        { productId: cartItem.product._id },
        { $inc: { stockQuantity: -cartItem.quantity } }
      );
    }

    await User.findByIdAndUpdate(
      user._id,
      {
        $push: {
          purchaseHistory: {
            $each: cart.product.map(item => ({
              product: item.product._id,
              purchaseDate: new Date()
            }))
          }
        }
      },
      { new: true }
    );

    await ShoppingCart.findOneAndUpdate(
      { user_id: params.userId },
      { $set: { product: [] } }
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
