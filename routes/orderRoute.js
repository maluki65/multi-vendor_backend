const express =  require('express');
const { getVendorOrders, getAllOrders, getOrderbyId, getBuyerOrders, updateOrderStatus, createOrder, cancelOrder } = require('../controllers/orderController');
const { getBuyerCancelledOrders  } = require('../controllers/buyerController');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { protect } = require('../middlewares/middleware');

const router = express.Router();

// On creating an order (Buyer)
router.post('/orders', protect, restrictTo('Buyer'), createOrder);

// On geting orders
router.get('/vendor', protect, restrictTo('Vendor'), getVendorOrders);

router.get('/order/:id', protect, getOrderbyId);

router.get('/buyer', protect, restrictTo('Buyer'), getBuyerOrders);

router.get('/admin/all', protect, restrictTo('Admin'), getAllOrders);


router.get('/orders/buyer/cancelled', protect, restrictTo('Buyer'), getBuyerCancelledOrders);

// On updating order status
router.patch('/orders/:id/status', protect, updateOrderStatus);

router.patch('/orders/cancel/:id', protect, restrictTo('Buyer'), cancelOrder);

module.exports = router;