const mongoose = require('mongoose');
const Review = require('./Review');

const userSchema = mongoose.Schema({
  user_name: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
    select: true // do not return password in response
  },
  phone_number: String,
  addresses: {
    type: [String],  // Array of strings
    default: []  // Default is an empty array
  },
  role: {
    type: Number,
    default: 1,  // 1 for normal user, 0 for admin
    enum: [0, 1]  // Only allow these values
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  purchaseHistory: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    confirmedReviews: {
      type: Boolean,
    default: false
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    }
  }],
  stripeCustomerId: {
    type: String,
    default: null // Default to null if not set
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  profileImage: {  // New field for profile image
    type: String,
    default: null // Default to null if not set
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
