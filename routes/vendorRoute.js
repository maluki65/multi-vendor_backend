const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { createUpdateVendorProfile, getVendorStats, getVendorOrders, getVendorProfile  } = require('../controllers/vendorController');
const { createProduct, getVendorProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/productController');
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
      message: 'Your re-approval has been sunmitted. Please wait for admin review.', vendor,
    });
  } catch (error) {
    next(error);
  }
});

// On authenticated vendor route
router.post('/vendor/profile', protect, restrictTo('Vendor'), createUpdateVendorProfile);

router.patch('/vendor/profile', protect, restrictTo('Vendor'), createUpdateVendorProfile);

router.get('/vendor/:id/stats', protect, restrictTo('Vendor'), getVendorStats);

router.get('/vendor/:id/profile', protect, restrictTo('Vendor'), getVendorOrders);

// On creating a public route
router.get('/:id/vendor/profile', protect, getVendorProfile);

// On Vendor products 
router.post('/vendor/product', protect, restrictTo('Vendor'), createProduct);

router.get('/vendor/products', protect, restrictTo('Vendor'), getVendorProducts);

router.get('/vendor/product/:id', protect, restrictTo('Vendor', 'Buyer'), getProductById);

router.put('/vendor/product/:id', protect, restrictTo('Vendor'), updateProduct);

router.delete('/vendor/product/:id', protect, restrictTo('Vendor'), deleteProduct);


module.exports = router