const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const createError = require('../utils/appError');
const WalletTransaction = require('../models/walletTransactionModel');
const WithdrawalRequest = require('../models/withdrawalRequestModel');

// On Crediting pending balance (called after buyer marks order as complete: moves credits vendorEarnings to reservedBal)
exports.creditPendingBalance = async (orderId, session) => {
  const order = await Order.findById(orderId).session(session);

  if (!order) {
    throw new createError('Order not found', 404);
  }

  if (order.earningsCredited) {
    return;
  }

  let wallet = await Wallet.findOne({
    vendorId: order.vendorId,
  }).session(session);

  if (!wallet) {
    const created = await Wallet.create(
      [{ vendorId: order.vendorId }],
      { session }
    );

    wallet = created[0];
  }

  const balanceBefore = wallet.pendingBalance;

  wallet.pendingBalance += order.vendorEarnings;
  wallet.totalEarnings += order.vendorEarnings;
  wallet.totalCommissionGenerated += order.platformCommission || 0;

  const balanceAfter = wallet.pendingBalance;

  await WalletTransaction.create([{
    vendorId: order.vendorId,
    walletId: wallet._id,

    type: 'sale',
    direction: 'credit',

    amount: order.vendorEarnings,

    balanceBefore,
    balanceAfter,

    referenceId: order._id,
    referenceModel: 'Order',

    description: `Order earnings credited for ${order.orderNumber}`,

    status: 'completed',

    metadata: {
      orderNumber: order.orderNumber,
      paymentReference: order.paymentReference,
    },
  }], { session });

  //const ONE_HOUR = 60 * 60 * 1000;
  const THREE_DAYS = 3 * 25 * 60 * 60 * 1000;

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        earningsCredited: true,
        earningsCreditedAt: new Date(),
        settlementDate: new Date(Date.now() + THREE_DAYS),
      },
    },
    { session }
  );

  await wallet.save({ session });

  return wallet;
};

// On reserving withdrawals (called when vendor request a withdrawal request: moves funds from available bal to reserved bal)
exports.reserveWithdrawalFunds = async ({ 
  walletId,
  vendorId, 
  amount, 
  vendorName,
  payoutSnapshot 
 }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const wallet = await Wallet.findById(walletId).session(session);

    if (!wallet) {
      throw new createError('Wallet not found!', 404);
    }

    const MIN_WITHDRAWAL = 1000 * 100;
    const MAX_DAILY_AMOUNT = 100000 * 100;

    if (amount < MIN_WITHDRAWAL) {
      throw new createError('Minimum withdrawal amount is KES 1,000', 400);
    }

    const today = new Date().toDateString();

    if (
      wallet.dailyWithdrawalDate &&
      wallet.dailyWithdrawalDate.toDateString() === today
    ) {
      if (
        wallet.dailyWithdrawalAmount + amount > MAX_DAILY_AMOUNT
      ) {
        throw new createError(
          'Maximum daily withdrawal limit exceeded', 400
        );
      }
    }

    /*if (wallet.lastWithdrawalAt) {
      const diff = Date.now() - wallet.lastWithdrawalAt.getTime();

      const hours = diff / (1000 * 60 * 60);

      if (hours < 24 ) {
        throw new createError(
          'Withdrawal cooldown active. Try again later.', 400
        );
      }
    }*/

    if (wallet.availableBalance < amount) {
      throw new createError('Insufficient available balance', 400);
    }

    const balanceBefore = wallet.availableBalance;

    wallet.availableBalance -= amount;
    wallet.reservedBalance += amount;

    const balanceAfter = wallet.availableBalance;

    // on creating a withdrawal request
    const withdrawal = await WithdrawalRequest.create([{
      vendorId,
      walletId: wallet._id,
      vendorName,

      amount,

      paymentMethodSnapshot: payoutSnapshot,

      status: 'pending',
    }], { session });

    await WalletTransaction.create([{
      vendorId,
      walletId: wallet._id,

      type: 'withdrawal_request',
      direction: 'debit',

      amount,
      balanceBefore,
      balanceAfter,

      referenceId: withdrawal[0]._id,
      referenceModel: 'WithdrawalRequest',

      description: 'Withdrawal funds reserved',
      status: 'completed',
    }], { session });

    await wallet.save({ session });

    await session.commitTransaction();

    return withdrawal[0];
  } catch (error) {
    await session.abortTransaction()
    console.error('Failed to reserve withdrawal', error);
    throw error;
  } finally {
    session.endSession();
  }
}

// On releasing funds (called when withdrawal request is rejeted, cancelled or fails)
exports.releaseReservedFunds = async (
  withdrawalRequest,
  rejectionReason = ''
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if(withdrawalRequest.status === 'rejected') {
      throw new createError('Withdrawal already rejected', 400);
    }

    const wallet = await Wallet.findById(
      withdrawalRequest.walletId
    ).session(session);

    if (!wallet) {
      throw new createError('Wallet not found', 400);
    }

    const balanceBefore = wallet.availableBalance;

    if (wallet.reservedBalance < withdrawalRequest.amount) {
      throw new createError('Reserved balance insufficient', 400);
    }

    if (withdrawalRequest.status !== 'pending' && withdrawalRequest.status !== 'approved') {
      throw new createError('Cannot reject this withdarawal', 400);
    }

    wallet.reservedBalance -= withdrawalRequest.amount;

    wallet.availableBalance += withdrawalRequest.amount;

    const balanceAfter = wallet.availableBalance;

    withdrawalRequest.status = 'rejected';

    withdrawalRequest.rejectionReason = rejectionReason;

    await WalletTransaction.create([{
      vendorId: withdrawalRequest.vendorId,
      walletId: wallet._id,

      type: 'withdrawal_rejected',
      direction: 'credit',

      amount: withdrawalRequest.amount,

      balanceBefore,
      balanceAfter,

      referenceId: withdrawalRequest._id,
      referenceModel: 'WithdrawalRequest',

      description: 'Reserved withdrawal funds released',

      status: 'completed',
    }], { session });

    await wallet.save({ session });
    await withdrawalRequest.save({ session });

    await session.commitTransaction();

    return wallet;
  } catch (error) {
    await session.abortTransaction();
    console.error('Failed to releaseFunds', error);
    throw error;
  } finally {
    session.endSession();
  }
}

// On approving withdrawal request
exports.approveWithdrawal = async ({
  withdrawalRequest,
  adminId,
  adminNotes = '',
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (withdrawalRequest.status === 'approved') {
      throw new createError('Withdrawal request already approved', 400);
    }

    if (withdrawalRequest.status === 'paid') {
      throw new createError('Withdrawal request has already been paid', 400);
    } 

    if (withdrawalRequest.status === 'rejected') {
      throw new createError('Cannot approve a rejected withdrawal request', 400);
    } 

    if (withdrawalRequest.status !== 'pending') {
      throw new createError(
        `Cannot approve withdrawal with status ${withdrawalRequest.status}`,
        400
      );
    }

    withdrawalRequest.status = 'approved';
    withdrawalRequest.approvedBy = adminId;
    //withdrawalRequest.paidAt = Date.now();

    if (adminNotes) {
      withdrawalRequest.adminNotes = adminNotes;
    }

    await withdrawalRequest.save({ session });

    await session.commitTransaction();

    return withdrawalRequest;    
  } catch (error) {
    await session.abortTransaction();
    console.error('Failed to approve withdrawal', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// On completing withdrawal request (called after successfull vendor payment through m-pesa)
exports.completeWithdrawal = async ({
  withdrawalRequest,
  adminId,
  transactionReference,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if(withdrawalRequest.status === 'paid') {
      throw new createError('Withdrawal already paid', 400);
    }

    if (withdrawalRequest.status !== 'approved') {
      throw new createError('Withdrawal must be approved before payout', 400);
    }

    const wallet = await Wallet.findById(
      withdrawalRequest.walletId
    ).session(session);

    if (!wallet) {
      throw new createError('Wallet not found!', 404);
    }

    const balanceBefore = wallet.reservedBalance;

    if (wallet.reservedBalance < withdrawalRequest.amount) {
      throw new createError('Reserved balance insufficient', 400)
    }

    if (withdrawalRequest.status !== 'approved') {
      throw new createError('Withdrawal must be approved first', 400);
    }

    wallet.reservedBalance -= withdrawalRequest.amount;

    wallet.withdrawnBalance += withdrawalRequest.amount;

    const today = new Date().toDateString();

    if (
      wallet.dailyWithdrawalDate &&
      wallet.dailyWithdrawalDate.toDateString() === today
    ) {
      wallet.dailyWithdrawalAmount += withdrawalRequest.amount;
    } else {
      wallet.dailyWithdrawalAmount = withdrawalRequest.amount;

      wallet.dailyWithdrawalDate = new Date();
    }

    wallet.lastWithdrawalAt = new Date();

    const balanceAfter = wallet.reservedBalance;

    withdrawalRequest.status = 'paid';
    withdrawalRequest.approvedBy = adminId;
    withdrawalRequest.transactionReference = transactionReference;
    withdrawalRequest.paidAt = new Date();

    // on loggin transaction
    await WalletTransaction.create([{
      vendorId: withdrawalRequest.vendorId,
      walletId: wallet._id,

      type: 'withdrawal_paid',
      direction: 'debit',

      amount: withdrawalRequest.amount,

      balanceBefore,
      balanceAfter,

      referenceId: withdrawalRequest._id,
      referenceModel: 'WithdrawalRequest',

      description: 'Withdrawal payout completed',

      status: 'completed',

      metadata: {
        transactionReference,
      },
    }], { session });

    await wallet.save({ session });
    await withdrawalRequest.save({ session });

    await session.commitTransaction();

    return wallet;
  } catch (error) {
    await session.abortTransaction();
    console.error('Failed to complete withdrawal', error);
    throw error;
  } finally {
    session.endSession();
  }
};