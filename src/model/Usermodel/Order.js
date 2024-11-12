const mongoose = require('mongoose');
const Product = require('./Product');

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,  // ID của người dùng
    ref: 'User',
    required: true
  },
  products: [  // Danh sách sản phẩm trong đơn hàng
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ],
  total_amount: {
    type: Number,
    required: true
  },
  transaction_id: {
    type: String,
    default: null
  },
  waiting_confirmation: {
    type: Boolean,
    default: false
  },
  order_date: {
    type: Date,
    default: Date.now
  },
  payment_status: {  // Trạng thái thanh toán
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  delivery_status: {  // Trạng thái giao hàng
    type: String,
    enum: ['Shipping', 'Delivered', 'Cancelled', 'Returned'],
    default: 'Pending'
  },
  shipping_address: {  // Tham chiếu đến mô hình Address
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true  // Bắt buộc phải có địa chỉ giao hàng
  },
  payment_method: {  // Phương thức thanh toán
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
