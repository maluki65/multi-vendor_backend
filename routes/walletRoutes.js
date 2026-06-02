const express = require('express');
const { protect } = require('../middlewares/middleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { requestWithdrawal, getWallet, getVendorWithdrawalHistory, getPendingWithdrawalRequests, approveWithdrawalRequest, rejectWithdrawalRequest } = require('../controllers/walletController');

const router = express.Router();

router.post('/withdrawal', protect, restrictTo('Vendor'), requestWithdrawal);

router.get('/', protect, restrictTo('Vendor'), getWallet);
router.get('/pending/withdrawals', protect, restrictTo('Admin'), getPendingWithdrawalRequests);
router.get('/withdrawals/history', protect, restrictTo('Vendor'), getVendorWithdrawalHistory);

router.patch('/reject/withdrawal/:withdrawalId', protect, restrictTo('Admin'), rejectWithdrawalRequest);
router.patch('/approve/withdrawal/:withdrawalId', protect, restrictTo('Admin'), approveWithdrawalRequest);

module.exports = router;