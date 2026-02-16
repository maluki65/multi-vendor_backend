const Verification = require('../models/verifications');
const createError = require('../utils/appError');
const User = require('../models/userModel');

exports.addVerificationInfo = async(req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { verificationFiles,  signature, termsConditions } = req.body;

    if (
        !Array.isArray(verificationFiles) || verificationFiles.length === 0 ||
        termsConditions !== true 
        || !signature
      ) {
      return next(new createError('Missing or invalid required fields!', 400));
    }

    const user = await User.findById(userId);
    if (!user) return next(new createError('User not found!', 404));

    if (user.role !== 'Vendor') {
      return next(new createError('Only vendors can verify profile', 403));
    }

    const existing = await Verification.findOne({ userId });
    if (existing) {
      return next(new createError('Verification already submitted for this profile', 403));
    }

    const verify = await Verification.create({
      verificationId: userId,
      verificationFiles,
      signature,
      termsConditions,
    });

    res.status(201).json({
      status: 'success',
      verify,
    })
  } catch(error){
    console.error('Failed to add verification docs', error);
    next(error);
  }
}

exports.getVerificationInfo = async(req, res, next) => {
  try {
    if (req.user.role === 'Admin') {
      const verifications = await Verification.find()
        .populate('verificationId', 'storeName email role')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: 'success',
        results: verifications.length,
        verifications,
      });
    }

    if (req.user.role === 'Vendor') {
      const verification = await Verification.findOne({ verificationId: req.user.id })
        .populate('verificationId', 'storeName email role status rejectionReason');

      /*if (!verification) {
        return next(new createError('Verification record not found!', 404));
      }*/

      if (!verification) {
        return res.status(200).json({
          status: 'success',
          verification:null,
        });
      }

      return res.status(200).json({
        status: 'success',
        verification,
      });
    } 

    return next(new createError('Access denied', 403));
  } catch(error) {
    console.error('Failed to get verification info', error);
    next(error);
  }
};

exports.getVerificationByUserId = async(req, res, next) => {
  try{    
    if (req.user.role !== 'Admin') return next(new createError('Access denied', 403));

    const { id } = req.params;

    const verification = await Verification.findOne({ verificationId: id });
    if (!verification) return res.status(200).json({
      status:'success',
      verification: null
    });

    res.status(200).json({
      status: 'success',
      verification
    });
  } catch(error) {
    console.error('Failed to fetch vendor verification', error);
    next(error);
  }
};

exports.updateVerificationInfo = async(req, res, next) => {
  try{
    const userId = req.user.id;

    const { verificationImg, verificationImgIds, termsConditions } = req.body;

    if (
      !Array.isArray(verificationImg) || verificationImg.length === 0 ||
      !Array.isArray(verificationIds) || verificationIds.length === 0 ||
      termsConditions !== true
    ) {
      return next(new createError('Missing or invalid required fields', 400));
    }

    const user = await User.findById(userId);
    if(!user) {
      return next(new createError('User not found', 404));
    }

    if (user.role !== 'Vendor') {
      return next(new createError('Only cendors can update verification info', 403));
    }

    if (user.status !== 'rejected') {
      return next(new createError('Verification can only be updated if status is rejected', 403));
    }

    const verification = await Verification.findOne({ verificationId: userId });

    if(!verification) {
      return next(new createError('Verification record not found!', 404));
    }

    verification.verificationImg = verificationImg;
    verification.verificationImgIds = verificationImgIds;
    verification.termsConditions = termsConditions;

    await verification.save();

    user.status = 'pending';
    user.rejectionReason = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Verification resubmitted successfully!',
      verification,
    });
  } catch(error) {
    console.error('Failed to resubmit verification info', error);
    next(error);
  }
};