const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema({
  name: { type:String, required: true, unique: true, index: true },
  commissionRate: { 
    type: Number, 
    required: true, 
    default: 0.05, 
    min: 0, 
    max:10, 
    index: true 
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
  },

  slug: { type: String, unique: true },

  createdBy: { type: String, require: true },
  createdById: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedBy: String,
  updatedById: String,
}, {timestamps: true });

categorySchema.pre('save', function(next) {
  if(this.isModified('name')) {
    this.slug = slugify(this.name, {lower: true });
  }
  next();
});

categorySchema.index({ name: 1, commissionRate: 1, createdAt: -1 })

module.exports = mongoose.model('Category', categorySchema);