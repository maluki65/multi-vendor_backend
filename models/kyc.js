const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  kycId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },

  kycFiles:[
    {
      url: { type: String, required: true },
      fileId: { type: String, required: true },
    },
  ],

  signature: { type: String, required: true, index: true },
  termsConditions: { type: Boolean, required: true },    
}, { timestamps: true });

kycSchema.index({ kycId: 1, signature: 1, createdAt: -1 });

module.exports = mongoose.model('kycDocs', kycSchema);