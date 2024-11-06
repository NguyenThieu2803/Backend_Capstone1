const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  },
  review_date: {
    type: Date,
    default: Date.now
  },
  images: {
    type: [String],
    default: []
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Thêm virtual field để lấy thông tin user
reviewSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
