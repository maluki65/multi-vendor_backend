const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
    index: true,
  },

  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true,
  },

  type: {
    type: String,
    enum: [
      'sale',
      'withdrawal_request',
      'withdrawal_paid',
      'withdrawal_rejected',
      'refund',
      'adjustment',
      'commission',
      'reserve_release',
      'settlement'
    ],
    required: true,
  },

  amount: {
    type: Number,
    required: true,
    min: 0,
  },


  balanceBefore: Number,
  balanceAfter: Number,

  referenceId: mongoose.Schema.Types.ObjectId,

  referenceModel: {
    type: String,
    enum: [
      'Order',
      'WithdrawalRequest',
      'Refund'
    ],
  },

  description: String,

  status: {
    type: String,
    enum: [
      'pending',
      'completed',
      'failed',
      'reversed',
    ],
    default: 'completed',
  },

  direction: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },

  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema)