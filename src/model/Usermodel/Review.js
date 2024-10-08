const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review_id: String,
  product_id: String,
  user_id: String,
  rating: Number,
  comment: String,
  review_date: Date
});

module.exports = mongoose.model('Review', reviewSchema);