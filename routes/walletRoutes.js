const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { requestWithdrawal, getWallet, getVendorWithdrawalHistory } = require('../controllers/walletController');

const router = express.Router();

router.post('/wallet/withdrawal', protect, restrictTo('Vendor'), requestWithdrawal);

router.get('/wallet', protect, restrictTo('Vendor'), getWallet);
router.get('/vendor/withdrawals', protect, restrictTo('Vendor'), getVendorWithdrawalHistory);

module.exports = router;