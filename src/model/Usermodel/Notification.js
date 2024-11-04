const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'Đơn hàng đã được đặt'
  },
  message: {
    type: String,
    required: true,
    default: 'Cảm ơn bạn đã mua sắm cùng FurniFit AR'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  notification_type: {
    type: String,
    enum: ['ORDER', 'PROMOTION', 'SYSTEM'],
    default: 'ORDER'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tạo virtual field để lấy hình ảnh từ product
notificationSchema.virtual('image').get(function() {
  if (this.product && this.product.images && this.product.images.length > 0) {
    return this.product.images[0]; // Lấy hình ảnh đầu tiên
  }
  return null;
});

// Tạo index để tìm kiếm nhanh hơn
notificationSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
