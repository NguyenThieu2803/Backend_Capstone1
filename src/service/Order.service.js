const User = require("../model/Usermodel/User");
const Card = require("../model/Usermodel/Card");
const Order = require("../model/Usermodel/Order");
const ShoppingCart = require("../model/Usermodel/ShoppingCart");
const StripeService = require("../service/stripe.service");
const CartService = require("../service/cart.service");

const createOrder = async (params) => {
    try {
      const userDB = await User.findById(params.userId);
      if (!userDB) throw new Error('User not found');

      let stripeCustomerID = userDB.stripeCustomerID;

      if (!stripeCustomerID) {
        const customerResult = await StripeService.createCustomer({
          name: userDB.user_name,
          email: userDB.email
        });
        stripeCustomerID = customerResult.id;
        userDB.stripeCustomerID = stripeCustomerID;
        await userDB.save();
      }
  
      const cardDB = await Card.findOne({
        customerId: stripeCustomerID,
        Cardnumber: params.cardNumber,
        cardExpmonth: params.cardExMonth,
        cardExpyears: params.cardExYear,
      });
  
      let cardId;
      if (cardDB) {
        cardId = cardDB.cardId;
      } else {
        const cardResult = await StripeService.addCard({
          Card_name: params.cardName,
          Cardnumber: params.cardNumber,
          cardExpmonth: params.cardExMonth,
          cardExpyears: params.cardExYear,
          cardCVC: params.cardCVC,
          customerId: stripeCustomerID
        });
        cardId = cardResult.card;
      }
  
      const paymentIntent = await StripeService.createPaymentIntent({
        Payment_receipt_email: userDB.email,
        amount: params.amount,
        customer_id: stripeCustomerID,
        paymentMethodId: params.paymentMethodId,
      });
  
      const cartDB = await CartService.ServiceGetallCartByUser({ userId: userDB._id });
      if (!cartDB) throw new Error('Cart not found');
  
      const products = cartDB.product.map(item => ({
        product: item.product._id,
        amount: item.price * item.quantity,
        quantity: item.quantity
      }));
  
      const order = await Order.create({
        user_id: userDB._id,
        Products: products,
        total_amount: params.amount,
        transaction_id: paymentIntent.id
      });
  
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
