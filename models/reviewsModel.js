const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'Product',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  rating: { type: Number, required: true, min: 1, max: 5, index: true },
  comment: { type : String, trim: true },
  createdAt: { type: Date, default: Date.now },
})

reviewSchema.index({ productId: 1, userId:1, rating: 1, createdAt: -1 });

module.exporsts = mongoose.model('Reviews', reviewSchema);