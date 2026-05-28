const mongoose = require('mongoose');

const VendorWalletSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
    unique: true,
    index: true,
  },

  availableBalance: {
    type: Number,
    default: 0,
    min: 0,
  },

  pendingBalance: {
    type: Number,
    default: 0,
    min:0,
  },

  reservedBalance: {
    type: Number,
    default: 0,
    min: 0,
  },

  withdrawnBalance: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalCommissionGenerated: {
    type: Number,
    default: 0,
    min: 0,
  },

  lastWithdrawalAt: Date,

  dailyWithdrawalAmount: {
    type: Number,
    default: 0,
  },

  dailyWithdrawalDate: Date,
}, {timestamps: true });

module.exports = mongoose.model('Wallet', VendorWalletSchema);