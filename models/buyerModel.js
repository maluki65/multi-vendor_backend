const mongoose = require('mongoose');

const buyerProfileSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  username: { type: String, required: true },
  phone: { type: Number, required: true },
  address: { type: String, required: true },
  avatar: { type: String },
  avatarId:{type: String },
  createdAt: {type: Date, default: Date.now },
});

buyerProfileSchema.index({ buyerId: 1, createdAt: -1 });

module.exports = mongoose.model('BuyerProfile', buyerProfileSchema);