const mongoose = require('mongoose');
const Wallet = require('../models/walletModel');
const createError = require('../utils/appError');
const VendorProfile = require('../models/vendorProfileModel');
const WithdrawalRequest = require('../models/withdrawalRequestModel');
const { reserveWithdrawalFunds, approveWithdrawal, releaseReservedFunds } = require('../services/walletService');

// On vendor withdrawal request
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const vendorProfile = await VendorProfile.findOne({
      vendorId: userId,
    });

    if (!vendorProfile) {
      throw new createError('Vendor profile not found', 404);
    }

    const { amount, phoneNumber, accountName } = req.body;

    if (!amount) {
      throw new createError('Withdrawal amount is required!', 400);
    }

    const withdrawal = await reserveWithdrawalFunds({
      vendorId: vendorProfile._id,
      amount,
      payoutSnapshot: {
        method: 'mpesa',
        phoneNumber,
        accountName,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Withdarwal request submitted',
      withdrawal,
    });
  } catch (error) {
    console.error('Failed to process withdrawal request!', error);
    next(error);
  }
}

// On getting wallet
exports.getWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const vendorProfile = await VendorProfile.findOne({ vendorId: userId });

    if (!vendorProfile) {
      throw new createError('Vendor profile not found!', 404);
    }

    const wallet = await Wallet.findOne({ vendorId: vendorProfile._id });

    if (!wallet) {
      return res.status(200).json({
        status: 'success',
        wallet: {
          availableBalance: 0,
          pendingBalance: 0,
          reservedBalance: 0,
          withdrawanBalance: 0,
        },
      });
    }

    res.status(200).json({
      status: 'success',
      wallet,
    })
  } catch (error) {
    console.error('Failed to get wallet', error);
    next(error);
  }
}

// On getting vendor withdrawal history
exports.getVendorWithdrawalHistory = async(req, res, next) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parserInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const vendorProfile = await VendorProfile.findOne({ vendorId: userId });

    if (!vendorProfile) {
      throw new createError('Vendor profile not found!', 404);
    }

    const filter = {
      vendorId: vendorProfile._id,
    };

    const totalWithrawals = await WithdrawalRequest.countDocuments(filter);

    const withdrawals = await WithdrawalRequest.find(filter)
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limit);

    const totalPages = Math.ceil( totalWithrawals / limit );

    res.status(200).json({
      status: 'success',

      pagination: {
        currentPage: page,
        totalPages,
        totalResults: totalWithrawals,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },

      results: withdrawals.length,
      withdrawals,
    }) 
  } catch (error) {
    console.error('Failed to get withrawal requests!', error);
    next(error);
  }
}

// On getting all withdrawals for admin
exports.getAllWithdrawalRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status){
      filter.status = req.query.status;
    }

    if (req.query.vendorId) {
      filter.vendorId = req.query.vendorId;
    }

    const totalResults = await WithdrawalRequest.countDocuments(filter);

    const withdrawals =  await WithdrawalRequest.find(filter)
     .populate({
      path: 'vendorId',
      select : 'businessInfo.legalName',
     })
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limit);

    res.status(200).json({
      status: 'success',

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
        limit,
        hasNextPage: page * limit < totalResults,
        hasPrevPage: page > 1,
      },

      results: withdrawals.length,
      withdrawals,
    });
  } catch (error) {
    console.error('Failed to get withdrawal requests', error);
    next(error);
  }
}

// On getting a single withdrawal request
exports.getWithdrawalRequest = async (req, res, next) => {
  try {
    const { withdrawalId } = req.body;

    const withdrawal = await WithdrawalRequest.findById(withdrawalId)
    .populate({
      path: 'vendorId',
      select : 'businessInfo.legalName',
     })
    .populate('approvedBy');

    if (!withdrawal) {
      throw new createError('Withdrawal request not found!',404);
    }

    res.status(200).json({
      status: 'success',
      withdrawal,
    })
  } catch (error) {
    console.error('Failed to get withdrawal requests', error);
    next(error)
  }
}

exports.approveWithdrawalRequest = async (req, res, next) => {
  try{
    const adminId = req.user.id;
    const { withdrawalId, adminNotes } = req.body;

    const withdrawalRequest = await WithdrawalRequest.findById(withdrawalId);

    if (!withdrawalRequest) {
      throw new createError('withdrawal request ot found!', 404);
    }

    const updatedWithdrawal = await approveWithdrawal({
      withdrawalRequest,
      adminId,
      adminNotes
    });

    // Initialize M-pesa B2C here then call completeWithdrawal after success payment

    res.status(200).json({
      status: 'success',
      message: 'Withdrawal approved',
      withdrawal: updatedWithdrawal,
    });
  } catch (error) {
    console.error('failed to approve withdrawal', error);
    next(error);
  }
}

exports.rejectWithdrawalRequest = async (req, res, next) => {
  try {
    const { withdrawalId, rejectionReason } = req.body;

    const withdrawalRequest = await WithdrawalRequest.findById(withdrawalId);

    if(!withdrawalRequest) {
      throw new createError('Withdrawal request not found', 404);
    }

    await releaseReservedFunds(
      withdrawalRequest,
      rejectionReason
    );

    res.status(200).json({
      status: 'success',
      message: 'Withdrawal rejected and funds returned to availableBalance',
    });
  } catch (error) {
    console.error('Failed to reject withdrawal request', error);
    next(error);
  }
};