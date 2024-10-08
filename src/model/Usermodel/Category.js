const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  category_id: String,
  name: String,
  description: String
});

module.exports = mongoose.model('Category', categorySchema); // Export Category model

