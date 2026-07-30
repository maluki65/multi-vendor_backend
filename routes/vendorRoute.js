const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { createVendorProfile, updateVendorProfile, updateVendorMedia, getVendorStats, getVendorProfile, getVendorAnalytics  } = require('../controllers/vendorController');
const { getVendorEarnings } = require('../controllers/vendorEarningsController'); 
const { createProduct, getVendorProducts, getProductById, updateProduct, deleteProduct, vendorGuard } = require('../controllers/productController');
const { addKycInfo, getKycInfo, updateKycInfo } = require('../controllers/kycController');
const User = require('../models/userModel');
const { getAllActiveCategories } = require('../controllers/categoryController');

const router = express.Router();

// On re-applying kyc
router.patch('/vendor/request-approval', protect, restrictTo('Vendor'), async (req, res, next) => {
  try {
    const vendor = await User.findByIdAndUpdate(
      req.user.id,
      { status: 'pending', rejectionReason: null },
      { new: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Your re-approval has been submitted. Please wait for admin review.', vendor,
    });
  } catch (error) {
    next(error);
  }
});

// On authenticated vendor route
router.post('/profile', protect, restrictTo('Vendor'), createVendorProfile);
router.post('/kyc', protect, restrictTo('Vendor', 'Admin'), addKycInfo);

router.patch('/profile/update', protect, restrictTo('Vendor'), updateVendorProfile);
router.patch('/update/media', protect, restrictTo('Vendor'), updateVendorMedia);

router.get('/vendor/:id/stats', protect, restrictTo('Vendor'), getVendorStats);

router.get('/categories', protect, restrictTo('Vendor', 'Admin', 'Buyer'), getAllActiveCategories);

// On creating a public route
router.get('/profile', protect, getVendorProfile);
router.get('/dashboard/analytics', protect, restrictTo('Vendor'), getVendorAnalytics);

// On Vendor products 
router.post('/add-product', protect, restrictTo('Vendor'), vendorGuard, createProduct);

router.get('/products/:id', protect, restrictTo('Vendor', 'Buyer'), getVendorProducts);

router.get('/product/:id', protect, restrictTo('Vendor', 'Buyer'), getProductById);

router.get('/kyc/me', protect, restrictTo('Vendor', 'Admin'), getKycInfo);

router.patch('/product/update/:id', protect, restrictTo('Vendor'), updateProduct);
router.patch('/kyc/resubmit', protect, restrictTo('Vendor', 'Admin'), updateKycInfo);

router.delete('/product/delete/:id', protect, restrictTo('Vendor'), deleteProduct);

// On vendor earnings
router.get('/vendor/earnings', protect, restrictTo('Vendor', 'Admin'), getVendorEarnings);


module.exports = router