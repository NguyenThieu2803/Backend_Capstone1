const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  inventory_id: String,
  product_id: String,
  quantity_in_stock: Number
});

module.exports = mongoose.model('Inventory', inventorySchema);
