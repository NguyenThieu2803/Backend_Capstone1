const mongoose = require('mongoose');

const productShoppingCartSchema = new mongoose.Schema({
  shopping_cart_id: String,
  product_id: String
});

module.exports = mongoose.model('ProductShoppingCart', productShoppingCartSchema);
