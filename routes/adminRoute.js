const express = require('express');
const authController = require('../controllers/authController');
const { getAllUsers, getPendingVendors, searchUsers, approveVendor, rejectVendor, getAllCancelledOrders, deleteUser, createAdminProfile, getAdminProfile, updateAdminProfile } = require('../controllers/adminController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const User = require('../models/userModel');
const { getAllCommissions, getCommissionByVendor, getTotalAdminCommission } = require('../controllers/commissionController');
const { addVerificationInfo, getVerificationInfo, getVerificationByUserId  } = require('../controllers/verificationController');
const { getBuyerProfileById } = require('../controllers/buyerController');
const { getVendorProfileById } = require('../controllers/vendorController');
const { getPendingProducts, approveProducts, rejectProducts } = require('../controllers/productController');
const { AddCategory, getAllCategories, updateCategory, toggleCategoryStatus } = require('../controllers/categoryController');

const router = express.Router();

// On creating admin
router.post('/categories', protect, restrictTo('Admin'), AddCategory);
router.post('/profile', protect, restrictTo('Admin'), createAdminProfile);
router.post('/create', protect, restrictTo('Admin'), authController.admin);
router.post('/verification', protect, restrictTo('Vendor', 'Admin'), addVerificationInfo);

// On promoting user to admin
router.patch('/promote/:id', protect, restrictTo('Admin'), async(req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'Admin', status: 'approved'},
    {new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({
      message: 'User not found'
    });

    res.status(200).json({
      status: 'success',
      message: `${user.username} has been promoted to Admin`,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// On getting all users
router.get('/users', protect, restrictTo('Admin'), getAllUsers);
router.get('/profile', protect, restrictTo('Admin'), getAdminProfile);
router.get('/categories', protect, restrictTo('Admin'), getAllCategories);
router.get('/products/pending', protect, restrictTo('Admin'), getPendingProducts);

// On getting all vendors with status pending
router.get('/vendor/pending', protect, restrictTo('Admin', 'Vendor'), getPendingVendors);

// On searching users
router.get('/search', protect, restrictTo('Admin'), searchUsers);
router.get('/verification/all', protect, restrictTo('Admin'), getVerificationInfo);
router.get('/verification/:id', protect, restrictTo('Admin'), getVerificationByUserId);
router.get('/vendors/:id/profile', protect, restrictTo('Admin'), getVendorProfileById);
router.get('/buyers/:id/profile', protect, restrictTo('Admin'), getBuyerProfileById);


// On approving vendor
router.put('/vendor/approve/:id', protect, restrictTo('Admin'), approveVendor);

// On rejecting vendor
router.put('/vendor/reject/:id', protect, restrictTo('Admin'), rejectVendor);

// On admin commissions
router.get('/vendor/commissions/all', protect, restrictTo('Admin'), getAllCommissions);

router.get('/vendor/commissions/:vendorId', protect, restrictTo('Admin'), getCommissionByVendor);

router.get('/vendor/commissions/total', protect, restrictTo('Admin'), getTotalAdminCommission);

router.get('/cancelledOrders', protect, restrictTo('Admin'), getAllCancelledOrders);

router.patch('/products/:id/approve', protect, restrictTo('Admin'), approveProducts);
router.patch('/categories/update/:id', protect, restrictTo('Admin'), updateCategory);
router.patch('/products/:id/reject', protect, restrictTo('Admin'), rejectProducts);
router.patch('/categories/:id/status', protect, restrictTo('Admin'), toggleCategoryStatus);
router.patch('/profile', protect, restrictTo('Admin'), updateAdminProfile);


router.delete('/delete/user/:userId', protect, restrictTo('Admin'), deleteUser);

module.exports = router;