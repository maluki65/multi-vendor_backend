const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { createUpdateVendorProfile, getVendorStats, getVendorOrders, getVendorProfile  } = require('../controllers/vendorController');
const { getVendorEarnings } = require('../controllers/vendorEarningsController'); 
const { createProduct, getVendorProducts, getProductById, updateProduct, deleteProduct, vendorGuard } = require('../controllers/productController');
const { addVerificationInfo, getVerificationInfo, updateVerificationInfo } = require('../controllers/verificationController');
const User = require('../models/userModel');

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
router.post('/vendor/profile', protect, restrictTo('Vendor'), createUpdateVendorProfile);
router.post('/verification/', protect, restrictTo('Vendor', 'Admin'), addVerificationInfo);

router.patch('/vendor/profile', protect, restrictTo('Vendor'), createUpdateVendorProfile);

router.get('/vendor/:id/stats', protect, restrictTo('Vendor'), getVendorStats);

router.get('/vendor/:id/profile', protect, restrictTo('Vendor'), getVendorOrders);

// On creating a public route
router.get('/:id/vendor/profile', getVendorProfile);

// On Vendor products 
router.post('/vendor/product', protect, restrictTo('Vendor'), vendorGuard, createProduct);

router.get('/vendor/products', protect, restrictTo('Vendor', 'Buyer'), getVendorProducts);

router.get('/vendor/product/:id', protect, restrictTo('Vendor', 'Buyer'), getProductById);

router.get('/verification/me', protect, restrictTo('Vendor'), getVerificationInfo);

router.put('/vendor/product/:id', protect, restrictTo('Vendor'), updateProduct);
router.patch('/verification/resubmit', protect, restrictTo('Vendor', 'Admin'), updateVerificationInfo);

router.delete('/vendor/product/:id', protect, restrictTo('Vendor'), deleteProduct);

// On vendor earnings
router.get('/vendor/earnings', protect, restrictTo('Vendor', 'Admin'), getVendorEarnings);


module.exports = router