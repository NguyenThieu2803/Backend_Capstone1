const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    stockQuantity: { type: Number, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true },
    material: { type: String },
    color: { type: String }
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;