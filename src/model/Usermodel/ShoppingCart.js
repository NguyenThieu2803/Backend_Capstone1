const mongoose = require('mongoose');

const shoppingCartSchema = new mongoose.Schema({

  user_id: String,
  product : [
    {
      product : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      name:String,
      quantity: Number,
      price: Number,
      total: Number,
      discount: Number,
      addedAt: Date,
    }
  ]
});

module.exports = mongoose.model('ShoppingCart', shoppingCartSchema);
