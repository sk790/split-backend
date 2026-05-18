const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    trim: true
  },
  icon: {
    type: String,
    default: 'receipt-outline'
  },
  color: {
    type: String,
    default: '#6C63FF'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null represents system/default categories
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
