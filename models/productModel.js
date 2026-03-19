const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

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
    index: true,
  },
  name:{ type: String, required: true, index: true },
  slug: { type: String, index: true },
  description: { type: String, required: true },
  tags: [String],
  price: { type: Number, required: [true, 'Product price is required'], index: true },
  quantity: { type: Number, required:true, min: 0 },

  MainIMg: { type: String, required: true, index: true },
  MainIMgId: { type: String, required: true  },

  supportImgs: { type: [String], default: [] },
  supportImgsId: { type: [String], default: [] },

  /*status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },*/
  imageCompliance: {
    backgroundCheck: { type: Boolean, default: false },
    resolutionCheck: { type: Boolean, default: false },
    aspectRatioCheck: { type: Boolean, default: false },
    manuallyReviewed: { type: Boolean, default: false },
  },
  mainImageMeta: {
    width: Number,
    height: Number,
    aspectRatio: Number
  },

  attributes: [
    {
      attributeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryAttribute'
      },
      name: String,
      value: mongoose.Schema.Types.Mixed
    }
  ],

  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  visibility: {
    type: String,
    enum: ['published', 'unpublished'],
    default: 'unpublished',
    index: true,
  },

  rejectionReason: { type: String, default: '' },

  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reviews',
    }
  ],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

productSchema.index({ vendorId:1, visibility: 1, /*status: 1,*/ price: 1, MainIMg: 1, slug: 1, moderationStatus: 1, createdAt: -1 });

productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

productSchema.pre('save', function(next) {
  if(this.isModified('name')) {
    this.slug = slugify(this.name, {lower: true });
  }
  next();
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