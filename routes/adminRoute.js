const express = require('express');
const authController = require('../controllers/authController');
const { getAllUsers, getPendingVendors, searchUsers, approveVendor, rejectVendor, getAllCancelledOrders, deleteUser } = require('../controllers/adminController');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const User = require('../models/userModel');
const { getAllCommissions, getCommissionByVendor, getTotalAdminCommission } = require('../controllers/commissionController');

const router = express.Router();

// On creating admin
router.post('/create', protect, restrictTo('Admin'), authController.admin);

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

// On getting all vendors with status pending
router.get('/vendor/pending', protect, restrictTo('Admin'), getPendingVendors);

// On searching users
router.get('/search', protect, restrictTo('Admin'), searchUsers);

// On approving vendor
router.put('/vendor/approve/:id', protect, restrictTo('Admin'), approveVendor);

// On rejecting vendor
router.put('/vendor/reject/:id', protect, restrictTo('Admin'), rejectVendor);

// On admin commissions
router.get('/vendor/commissions/all', protect, restrictTo('Admin'), getAllCommissions);

router.get('/vendor/commissions/:vendorId', protect, restrictTo('Admin'), getCommissionByVendor);

router.get('/vendor/commissions/total', protect, restrictTo('Admin'), getTotalAdminCommission);

router.get('/cancelledOrders', protect, restrictTo('Admin'), getAllCancelledOrders);


router.delete('/delete/user/:userId', protect, restrictTo('Admin'), deleteUser);

module.exports = router;