const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  images: [String]
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
