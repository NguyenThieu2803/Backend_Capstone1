const { STRIPE_CONFIG } = require('../config/config');
const stripe = require('stripe')(STRIPE_CONFIG.STRIPE_KEY);

const createCustomer = async (params) => {
    try {
      const customer = await stripe.customers.create({
        name: params.name,
        email: params.email
      });
      return customer;
    } catch (error) {
      throw new Error(`Stripe error: ${error.message}`);
    }
  };
  
const addCard = async (params) => {
    try {
      const card = await stripe.customers.createSource(params.customerId, {
        source: params.cardToken
      });
      return { card: card.id };
    } catch (error) {
      throw new Error(`Stripe error: ${error.message}`);
    }
  };
  
const createPaymentIntent = async (params) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      receipt_email: params.Payment_receipt_email,
      amount: params.amount,
      currency: params.currency || STRIPE_CONFIG.CURRENCY,
      customer: params.customer_id,
      automatic_payment_methods: {
        enabled: true,
      },
      confirm: true,
      off_session: true
    });

    return paymentIntent;
  } catch (error) {
    throw new Error(`Stripe error: ${error.message}`);
  }
};

module.exports = {
    createCustomer,
    addCard,
    createPaymentIntent
};
