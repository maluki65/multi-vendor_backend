const express = require('express');
const authController = require('../controllers/authController');
const { getPendingVendors, approveVendor, rejectVendor, getAllCancelledOrders } = require('../controllers/adminController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const User = require('../models/userModel');
const { getAllCommissions, getCommissionByVendor, getTotalAdminCommission } = require('../controllers/commissionController');

const router = express.Router();

// On creating admin
router.post('/create/admin', protect, restrictTo('Admin'), authController.admin);

// On promoting user to admin
router.patch('/promote/:id', protect, restrictTo('Admin'), async(req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'Admin'},
    {new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({
      message: 'User not found'
    });

    res.status(200).json({
      status: 'success',
      message: `${user.username} has been promotet to Admin`,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// On getting all vendors with status pending
router.get('/vendor/pending', protect, restrictTo('Admin', getPendingVendors));

// On approving vendor
router.patch('/vendor/approve', protect, restrictTo('Admin', approveVendor));

// On rejecting vendor
router.patch('/vendor/reject', protect, restrictTo('Admin', rejectVendor));

// On admin commissions
router.get('/vendor/commissions/all', protect, restrictTo('Admin'), getAllCommissions);

router.get('/vendor/commissions/:vendorId', protect, restrictTo('Admin'), getCommissionByVendor);

router.get('/vendor/commissions/total', protect, restrictTo('Admin'), getTotalAdminCommission);

router.get('/admin/cancelledOrders', protect, restrictTo('Admin'), getAllCancelledOrders);

module.exports = router;