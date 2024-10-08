const mongoose = require('mongoose');
const Product = require('./Product');

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,  // Should be an ObjectId
    ref: 'User',  // Reference to User model
    required: true
  },
  Products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
    }
  ],
  total_amount: {
    type: Number,
    required: true,
    default: 0,
  },
  order_date: Date,
  payment_status:{
    type:String,
    default: 'Pending'
  } ,
  delivery_status: {
   type:String,
    default: 'Pending'
  }
}, { timestamps: true }); 

module.exports = mongoose.model('Order', orderSchema);
