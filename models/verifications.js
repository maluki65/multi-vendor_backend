const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  verificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
    index: true,
  },

  verificationFiles:[
    {
      url: { type: String, required: true },
      fileId: { type: String, required: true },
    },
  ],

  signature: { type: String, required: true, index: true },
  termsConditions: { type: Boolean, required: true },    
}, { timestamps: true });

verificationSchema.index({ verificationId: 1, signature: 1, createdAt: -1 });

module.exports = mongoose.model('verificationDocs', verificationSchema);