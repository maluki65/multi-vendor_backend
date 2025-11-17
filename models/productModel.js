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

module.exports = mongoose.model('Product', productSchema);