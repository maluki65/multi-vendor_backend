const mongoose = require('mongoose');

const buyerProfileSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  fullname: { type: String, required: true },
  phone: { type: String, required: true },
  gender: { type: String, required: true },
  addresses: [
    {
      label: String,
      country: String,
      city: String,
      street: String,
      postalCode: String,
      //isDefault:Boolean
    }
  ],
  preferences: {
    currency: String,
    //language: String,
    notification: {
      email: Boolean,
      sms: Boolean,
      push: Boolean
    }
  },
  stats: {
    orderCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  avatar: { type: String, default: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg?semt=ais_wordcount_boost&w=740&q=80' },
  avatarId:{type: String, default: 'none09763' },
  //createdAt: {type: Date, default: Date.now },
}
, {timestamps: true });

buyerProfileSchema.index({ buyerId: 1, createdAt: -1 });

module.exports = mongoose.model('BuyerProfile', buyerProfileSchema);