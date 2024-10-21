const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({

  name: {
    type: String,
    required: true,
    trim: true 
  },
  description: {
    type: String,
    required: true,
    trim: true 
  },
  shortDescription: { 
    type: String,
    trim: true
  },
  price: {
    type: Number, 
    required: true,
    min: 0
  },
  dimensions: { 
    height: { type: Number, min: 0 }, 
    width: { type: Number, min: 0 },
    depth: { type: Number, min: 0 },
    unit: { type: String, enum: ['in', 'cm'], default: 'in' } 
  },
  stockQuantity: { 
    type: Number,
    required: true,
    min: 0,
    default: 0 
  },
  material: {
    type: String,
    trim: true,
  },
  color: {
    type: Object,
    trim: true
  }, 
  images: [String],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category', 
    required: true 
  },
  discount: {
    type: Number,
    min: 0, 
    max: 100, 
    default: 0
  },
  promotionId: { 
    type: Schema.Types.ObjectId,
    ref: 'Promotion'  
  },
  brand: {
    type: String,
    trim: true
  },
  style: { 
    type: String,
    trim: true,
  }, 
  assemblyRequired: {
    type: Boolean,
    default: false
  },
  weight: {
    type: Number,
    min: 0
  },
  sold: { 
    type: Number,
    default: 0,
    min: 0
  },
  rating: { 
    type: Number,
    min: 0,
    max: 5,
    default: 0
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
