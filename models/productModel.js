const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
    index: true,
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  name:{ type: String, required: true, index: true },
  description: { type: String, required: true },
  tags: [String],
  price: { type: Number, required: [true, 'Product price is required'], index: true },
  MainIMg: { type: String, required: true, index: true },
  MainIMgId: { type: String, required: true  },
  supportImgs: { type: [String], default: [] },
  supportImgsId: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reviews',
    }
  ],
  quantity: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

productSchema.index({ vendorId:1, status: 1, price: 1, createdAt: -1 });

productSchema.index({
  name: 'text',
  desciption: 'text',
  category: 'text'
});

productSchema.statics.updateAverageRating = async function (productId) {
  const Review = mongoose.model('Reviews');

  const stats = await Review.aggregate([
    { $match: { productId }},
    {
      $group: {
        _id: '$productId',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  await this.findByIdAndUpdate(productId, {
    averageRating: stats.length ? stats[0].avgRating : 0,
    totalReviews: stats.length ? stats[0].totalReviews : 0
  });
};

module.exports = mongoose.model('Product', productSchema);