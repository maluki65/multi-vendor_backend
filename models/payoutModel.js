const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  }], // Orders covered by this payout method
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'released', 'failed'], default: 'pending' },
  releasedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

payoutSchema.index({ vendorId:1, orders: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);