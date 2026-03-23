const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { createVendorProfile, updateVendorProfile, updateVendorMedia, getVendorStats, getVendorOrders, getVendorProfile  } = require('../controllers/vendorController');
const { getVendorEarnings } = require('../controllers/vendorEarningsController'); 
const { createProduct, getVendorProducts, getProductById, updateProduct, deleteProduct, vendorGuard } = require('../controllers/productController');
const { addVerificationInfo, getVerificationInfo, updateVerificationInfo } = require('../controllers/verificationController');
const User = require('../models/userModel');
const { getAllActiveCategories } = require('../controllers/categoryController');

const router = express.Router();

// On re-applying verification
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
router.post('/verification', protect, restrictTo('Vendor', 'Admin'), addVerificationInfo);

router.patch('/profile/update', protect, restrictTo('Vendor'), updateVendorProfile);
router.patch('/update/media', protect, restrictTo('Vendor'), updateVendorMedia);

router.get('/vendor/:id/stats', protect, restrictTo('Vendor'), getVendorStats);

router.get('/vendor/:id/profile', protect, restrictTo('Vendor'), getVendorOrders);
router.get('/categories', protect, restrictTo('Vendor', 'Admin'), getAllActiveCategories);

// On creating a public route
router.get('/profile', protect, getVendorProfile);

// On Vendor products 
router.post('/add-product', protect, restrictTo('Vendor'), vendorGuard, createProduct);

router.get('/products/:id', protect, restrictTo('Vendor', 'Buyer'), getVendorProducts);

router.get('/product/:id', protect, restrictTo('Vendor', 'Buyer'), getProductById);

router.get('/verification/me', protect, restrictTo('Vendor', 'Admin'), getVerificationInfo);

router.put('/product/update/:id', protect, restrictTo('Vendor'), updateProduct);
router.patch('/verification/resubmit', protect, restrictTo('Vendor', 'Admin'), updateVerificationInfo);

router.delete('/product/delete/:id', protect, restrictTo('Vendor'), deleteProduct);

// On vendor earnings
router.get('/vendor/earnings', protect, restrictTo('Vendor', 'Admin'), getVendorEarnings);


module.exports = router