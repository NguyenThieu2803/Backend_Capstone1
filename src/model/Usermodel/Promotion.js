const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  promotion_id: String,
  name: String,
  description: String,
  discount_percentage: Number,
  start_date: Date,
  end_date: Date
});

module.exports = mongoose.model('Promotion', promotionSchema); 
