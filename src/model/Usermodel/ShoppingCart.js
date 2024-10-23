const mongoose = require('mongoose');

const shoppingCartSchema = new mongoose.Schema({
  user_id: String,
  product: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      name: String,
      quantity: { type: Number, min: 0, default: 1 },
      price: { type: Number, min: 0 },
      total: { type: Number, min: 0 },
      discount: { type: Number, min: 0, max: 100, default: 0 },
      addedAt: { type: Date, default: Date.now },
    }
  ],
  cartTotal: { type: Number, default: 0 }
});

module.exports = mongoose.model('ShoppingCart', shoppingCartSchema);
