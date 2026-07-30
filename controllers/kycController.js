const Kyc = require('../models/kyc');
const createError = require('../utils/appError');
const User = require('../models/userModel');

exports.addKycInfo = async(req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { kycFiles,  signature, termsConditions } = req.body;

    if (
        !Array.isArray(kycFiles) || kycFiles.length === 0 ||
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

    const existing = await Kyc.findOne({ userId });
    if (existing) {
      return next(new createError('Kyc already submitted for this profile', 403));
    }

    const kyc = await Kyc.create({
      kycId: userId,
      kycFiles,
      signature,
      termsConditions,
    });

    res.status(201).json({
      status: 'success',
      kyc,
    })
  } catch(error){
    console.error('Failed to add Kyc docs', error);
    next(error);
  }
}

exports.getKycInfo = async(req, res, next) => {
  try {
    if (req.user.role === 'Admin') {
      const kycs = await Kyc.find()
        .populate('kycId', 'storeName email role')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: 'success',
        results: kycs.length,
        kycs,
      });
    }

    if (req.user.role === 'Vendor') {
      const kyc = await Kyc.findOne({ kycId: req.user.id })
        .populate('kycId', 'storeName email role status rejectionReason');

      /*if (!kyc) {
        return next(new createError('kyc record not found!', 404));
      }*/

      if (!kyc) {
        return res.status(200).json({
          status: 'success',
          kyc: null,
        });
      }

      return res.status(200).json({
        status: 'success',
        kyc,
      });
    } 

    return next(new createError('Access denied', 403));
  } catch(error) {
    console.error('Failed to get kyc info', error);
    next(error);
  }
};

exports.getKycByUserId = async(req, res, next) => {
  try{    
    if (req.user.role !== 'Admin') return next(new createError('Access denied', 403));

    const { id } = req.params;

    const kyc = await Kyc.findOne({ kycId: id });
    if (!kyc) return res.status(200).json({
      status:'success',
      kyc: null
    });

    res.status(200).json({
      status: 'success',
      kyc
    });
  } catch(error) {
    console.error('Failed to fetch vendor kyc', error);
    next(error);
  }
};

exports.updateKycInfo = async(req, res, next) => {
  try{
    const userId = req.user.id;

    const { kycFiles,  signature, termsConditions } = req.body;


    if (
      !Array.isArray(kycFiles) || kycFiles.length === 0 ||
      termsConditions !== true 
      || !signature
    ) {
    return next(new createError('Missing or invalid required fields!', 400));
  }

    const user = await User.findById(userId);
    if(!user) {
      return next(new createError('User not found', 404));
    }

    if (user.role !== 'Vendor') {
      return next(new createError('Only vendors can update kyc info', 403));
    }

    if (user.status !== 'rejected') {
      return next(new createError('Kyc can only be updated if status is rejected', 403));
    }

    const kyc = await Kyc.findOne({ kycId: userId })
    .populate('kycId', 'storeName email role status rejectionReason')

    if(!kyc) {
      return next(new createError('kyc record not found!', 404));
    }

    kyc.kycFiles = kycFiles;
    kyc.termsConditions = termsConditions;
    kyc.signature = signature;

    await kyc.save();

    user.status = 'pending';
    user.rejectionReason = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Kyc resubmitted successfully!',
      kyc,
    });
  } catch(error) {
    console.error('Failed to resubmit kyc info', error);
    next(error);
  }
};