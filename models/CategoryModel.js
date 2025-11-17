const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type:String, required: true, unique: true },
  commissionRate: { type: Number, required: true, default: 0.05 }
})

module.exports = mongoose.model('Category', categorySchema);