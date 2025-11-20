const express =  require('express');
const { getVendorOrders, getAllOrders, getOrderbyId, getBuyerOrders, updateOrderStatus, createOrder, cancleOrder } = require('../controllers/orderController');
const { getBuyerCancelledOrders  } = require('../controllers/buyerController');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { protect } = require('../middlewares/middleware');

const router = express.Router();

// On creating an order (Buyer)
router.post('/orders', protect, restrictTo('Buyer'), createOrder);

// On geting orders
router.get('/orders/vendor', protect, restrictTo('Vendor'), getVendorOrders);

router.get('/order/:id', protect, getOrderbyId);

router.get('/orders/buyer', protect, restrictTo('Buyer'), getBuyerOrders);

router.get('/orders/admin/all', protect, restrictTo('Admin'), getAllOrders);

router.get('/orders/buyer', protect, restrictTo('Buyer'), getBuyerOrders);

router.get('/orders/buyer/cancelled', protect, restrictTo('Buyer'), getBuyerCancelledOrders);

// On updating order status
router.patch('/orders/:id/status', protect, updateOrderStatus);

router.patch('/orders/cancel/:id', protect, restrictTo('Buyer'), cancleOrder);

module.exports = router;