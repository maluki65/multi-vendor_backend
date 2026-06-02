const mongoose =  require('mongoose');

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

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);