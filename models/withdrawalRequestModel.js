const mongoose =  require('mongoose');
const generateRequestUUID = require('../utils/generateRequestId');

const withdrawalRequestSchema = new mongoose.Schema({
  
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
  },

  requestUUID: {
    type: String,
    uniques: true,
    index: true,
  },

  amount: {
    type: Number,
    required: true,
    min: 1000,
  },

  paymentMethodSnapshot: {
    type: {
      type: String,
      enum: ['mpesa'],
      default: 'mpesa',
    },
    tillNumber: String,
    accountName: String,
  },

  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'paid',
      'rejected',
      'cancelled',
      'failed',
    ],
    default: 'pending',
    index: true,
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
  },

  vendorName: {
    type:String,
    required: true,
    trim: true,
    index: true,
  },
  paidAt: Date,
  rejectionReason: String,
  adminNotes: String,
  transactionReference: String,
}, { timestamps: true });

withdrawalRequestSchema.pre('save', function (next) {
  if (!this.requestUUID) {
    this.requestUUID = generateRequestUUID();
  }

  next();
});

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);