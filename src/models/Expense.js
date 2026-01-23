const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: [0, 'Amount must be positive']
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splitBetween: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  perPersonAmount: {
    type: Number
  }
}, {
  timestamps: true
});

expenseSchema.pre('save', function(next) {
  if (this.splitBetween.length > 0) {
    this.perPersonAmount = this.amount / this.splitBetween.length;
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
