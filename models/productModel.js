const mongoose = require('mongoose');
const slugify = require('../utils/slugify');
const nanoid = require('nanoid');

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
  shortId: {
    type: String,
    unique: true,
    index: true,
  },

  name:{ type: String, required: true, index: true },
  slug: { type: String, index: true },
  discount: { type: Number},
  description: { type: String, required: true },
  discountPrice: { type: Number, required: false },
  tags: [String],
  brand: { type: String, required: true, index: true },
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
      name: [String],
      default: [],
      value: mongoose.Schema.Types.Mixed
    }
  ],

  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  featured: { 
    type: Boolean,
    default: false,
    index: true,
  },

  sponsored : {
    type: Boolean,
    default: false,
    index: true,
  },

  visibility: {
    type: String,
    enum: ['published', 'unpublished'],
    default: 'unpublished',
    index: true,
  },

  rejectionReason: { type: String, default: '' },

  ratingCounts: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 },
  },

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

productSchema.index({ vendorId:1, visibility: 1, /*status: 1,*/ price: 1, MainIMg: 1, slug: 1, moderationStatus: 1, featured: -1, brand: -1, sponsored: -1, shortId: -1, createdAt: -1 });

productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  brand: 'text' 
});

productSchema.pre('save', function(next) {
  if(this.isModified('name')) {
    this.slug = slugify(this.name, {lower: true });
  }
  next();
});

productSchema.pre('save', function (next) {
  if (!this.shortId) {
    this.shortId = nanoid(6);
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
        totalReviews: { $sum: 1 },
        ratings: {
          $push: '$rating'
        }
      }
    }
  ]);

  let ratingCounts = { 1:0, 2:0, 3:0, 4:0, 5:0 };

  if (stats.length) {
    stats[0].ratings.forEach(r => {
      ratingCounts[r] += 1;
    });
  }

  await this.findByIdAndUpdate(productId, {
    averageRating: stats.length ? stats[0].avgRating : 0,
    totalReviews: stats.length ? stats[0].totalReviews : 0,
    ratingCounts
  });
};

module.exports = mongoose.model('Product', productSchema);