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
      throw new Error(error.message);
    }
  };
  
const addCard = async (params) => {
    try {
      const card_token = await stripe.tokens.create({
        card: {
          name: params.Card_name,
          number: params.Cardnumber,
          exp_month: params.cardExpmonth,
          exp_year: params.cardExpyears,
          cvc: params.cardCVC
        }
      });

      const card = await stripe.customers.createSource(params.customerId, {
        source: card_token.id
      });

      return { card: card.id };
    } catch (error) {
      throw new Error(error.message);
    }
  };
  
const createPaymentIntent = async (params) => {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        receipt_email: params.Payment_receipt_email,
        amount: params.amount,
        currency: STRIPE_CONFIG.CURRENCY,
        customer: params.customer_id,
        payment_method: params.paymentMethodId,
        payment_method_types: ['card'],
        confirm: true,
        off_session: true
      });
  
      return paymentIntent;
    } catch (error) {
      throw new Error(error.message);
    }
  };

module.exports = {
    createCustomer,
    addCard,
    createPaymentIntent
};
