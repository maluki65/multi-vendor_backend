const User = require('../models/userModel');
const createError = require('../utils/appError');
const { sendMail } = require('../utils/nodemailer');

// On getting all vendors with pending status
exports.getPendingVendors = async (req, res, next) => {
  try{
    const pendingVendors = await User.find({
      role: 'Vendor',
      status: 'pending'
    }).select('-password');

    if (!pendingVendors || pendingVendors.length === 0 ){
      return res.status(404).json({
        status: 'Fail',
        message: 'No pending vendors found',
      });
    }

    res.status(200).json({
      status: 'success',
      count: pendingVendors.length,
      data: pendingVendors,
    });
  } catch (error) {
    next(error);
  }
};

// On approving vendor
exports.approveVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await User.findOneAndUpdate(
      { _id: id, role: 'Vendor'},
      { status: 'approved', rejectionreason: null },
      { new: true }
    ).select('-password');

    if (!vendor) return next(new createError('Vendor not found', 404));

    // On sending approve email
    await sendMail({
      email: vendor.email,
      subject: 'Vendor account approved',
      message: `<h2> Congratulations ${vendor.storeName}!</h2>
      <p>Your vendor account has been approved. You can now start listing your products on our marketplace.</p>`
    });

    res.status(200).json({
      status: 'success',
      message: `${vendor.storeName} has been approved as a vendor`, vendor
    });
  } catch (error) {
    next(error);
  }
};

// On rejecting vendor
exports.rejectVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vendor = await User.findOneAndUpdate(
      {_id: id, role: 'Vendor' },
      { status: 'rejected', rejectionreason: reason || 'Not specified' },
      { new: true }
    ).select('-password');

    if (!vendor) return next(new createError('Vendor not found', 404));

    // On sending mail
    await sendMail({
      email: vendor.email,
      subject: 'Vendor application rejected',
      message: `<h2>Hello ${vendor.storeName},</h2>
      <p>We regret to inform you that your vendor application was rejected.</p>
      <p>Reason: ${vendor.rejectionReason}</p>
      <p>You may log in to your account and request re-approval after addressing the issues.</p>`
    });

    res.status(200).json({
      status: 'success',
      message: `${vendor.username}'s vendor request has been rejected.`, vendor,
    });
  }  catch (error){
    next(error);
  }
};