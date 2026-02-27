const User = require('../models/userModel');
const Order = require('../models/orderModel');
const createError = require('../utils/appError');
//const Profile = require('../models/UserProfile');
const AdminProfile = require('../models/AdminProfile');
const removeUndefined = require('../utils/removeUndefined');
const { sendMail } = require('../utils/nodemailer');
const mongoose = require('mongoose');

const safeUser = (user) => ({
  _id: user._id,
  storeName: user.storeName,
  storeSlug: user.storeSlug,
  username: user.username,
  date: user.createdAt,
  status: user.status,
  email: user.email,
  UUID: user.UUID,
  role: user.role,
})

// On creating Admin profile
exports.createAdminProfile = async(req, res, next) => {
  try{
    const userId = req.user.id;
    const { addresses, phoneNo, fullNames, IDPassport, nextOfKin, avatar, avatarId } = req.body;

    const user = await User.findById(userId);
    if(!user) return next(new createError('User not found!', 404));

    if (user.role !== 'Admin') {
      return next(new createError('Only Admins can create this profile', 403));
    }

    const existingProfile = await AdminProfile.findOne({
      adminId: userId
    });
    if (existingProfile) {
      return next(new craeteError('Admin profile already exists', 400));
    }

    const profile = await AdminProfile.create({
      adminId: userId,
      addresses,
      phoneNo,
      fullNames,
      IDPassport,
      nextOfKin,
      avatar,
      avatarId,
    });

    user.adminProfile = profile._id;
    await user.save();

    res.status(200).json({
      status: 'success',
      profile,
    })
  } catch(error) {
    console.error('Failed to create profile!', error);
    next(error);
  }
};

// On getting Admin profile
exports.getAdminProfile = async(req, res, next) => {
  try{
    const userId = req.user.id;

    const user = await User.findById(userId)
     .select('-password')
     .populate('adminProfile');

    if(!user) {
      return next(new createError('Only admin can access this profile', 403));
    }

    res.status(200).json({
      status: 'success',
      user,
      profile: user.adminProfile || null,
    });
  } catch(error) {
    console.error('Error getting admin profile!', error);
    next(error);
  }
}

// On updating Admin profile
exports.updateAdminProfile = async(req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try{
    const adminId = req.user.id;

    if (!adminId) return next(new createError('Unauthorized access!', 401));

    const { username, ...profileFields } = req.body;

    const updateData = removeUndefined(profileFields);

    const updatedProfile = await AdminProfile.findOneAndUpdate(
      { adminId },
      updateData,
      { 
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    let updatedUser = null;
    if (username) {
      updatedUser = await User.findByIdAndUpdate(
        adminId,
        { username },
        { 
          new: true, 
          runValidators: true,
          session
        }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      profile: updatedProfile,
      user: updatedUser || undefined,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Failed to update admin profile', error);
    next(error);
  }
};

// On getting all users
exports.getAllUsers = async(req, res, next) => {
  try { 
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();

    const users = await User.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-password');

    res.status(200).json({
      status: 'success',
      page,
      pages: Math.ceil(total / limit),
      total,
      count: users.length,
      data: users.map(safeUser),
    });
  } catch(error) {
    next(error);
    console.error('Failded to fetch users:', error);
  }
};

// On searching users
exports.searchUsers = async(req, res, next) => {
  try{
    let { 
      search = '',
      page = 1,
      limit = 10
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // on building search query
    const query = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    };

    if (req.user?.id) {
      query._id = { $ne: req.user._id };
    }

    const total = await User.countDocuments(query);

    const users = await User.find(query)
     .skip((page - 1) * limit)
     .limit(limit)
     .sort({ username: 1 });

     res.status(200).json({
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
     });
  } catch(error){
    console.error('Error searching user:', error);
    next(createError(500, error.message));
  }
};

// On getting all vendors with pending status
exports.getPendingVendors = async (req, res, next) => {
  try{
    const pendingVendors = await User.find({
      role: 'Vendor',
      status: 'pending'
    }).select('-password');

    /*if (!pendingVendors || pendingVendors.length === 0 ){
      return res.status(404).json({
        status: 'Fail',
        message: 'No pending vendors found',
      });
    }*/

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

    /* On sending approve email
    await sendMail({
      email: vendor.email,
      subject: 'Vendor account approved',
      message: `<h2> Congratulations ${vendor.storeName}!</h2>
      <p>Your vendor account has been approved. You can now start listing your products on our marketplace.</p>`
    });*/

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

   /* // On sending mail
    await sendMail({
      email: vendor.email,
      subject: 'Vendor application rejected',
      message: `<h2>Hello ${vendor.storeName},</h2>
      <p>We regret to inform you that your vendor application was rejected.</p>
      <p>Reason: ${vendor.rejectionReason}</p>
      <p>You may log in to your account and request re-approval after addressing the issues.</p>`
    });*/

    res.status(200).json({
      status: 'success',
      message: `${vendor.storeName}'s vendor request has been rejected.`, vendor,
    });
  }  catch (error){
    console.error('Vendor rejectio failed:', error);
    next(error);
  }
};

// On getting all cancelled orders
exports.getAllCancelledOrders = async (req, res, next) => {
  try{
    const orders = await Order.find({ orderStatus: 'cancelled'})
    .populate('buyerId', 'username email')
    .populate('vendorId', 'storeName')
    .populate('products.productId', 'name MainIMg price');

    res.status(200).json({
      status: 'success',
      orders
    });

  } catch(error){
    next(error);
  }
};

// On deleting a user
exports.deleteUser = async(req, res, next) => {
  try{
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if(!user) return next (new createError('User not found!', 404));

    //await Profile.findOneAndDelete({ userId });

    res.status(200).json({
      status: 'success',
      message: 'User deleted',
      deletedUserId: userId,
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    next(error);
  }
};