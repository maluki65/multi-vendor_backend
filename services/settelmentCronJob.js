const cron = require('node-cron');
const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const WalletTransaction = require('../models/walletTransactionModel');


const runSettlement = async () => {
  console.log('Running settlement cron...');

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const maturedOrders = await Order.find({
      orderStatus: 'completed',
      earningsCredited: true,
      settled: false,
      settlementDate: { $lte: new Date() },
    }).session(session);

    if (!maturedOrders.length){
      console.log('No matured orders found!');

      await session.commitTransaction();

      return;
    }

    for (const order of maturedOrders) {
      const wallet = await Wallet.findOne({
        vendorId: order.vendorId,
      }).session(session);

      if (!wallet) {
        console.warn(`Wallet not found for vendor ${order.vendorId}`);

        continue;
      }

      if (wallet.pendingBalance < order.vendorEarnings) {
        console.warn(`Insufficient pending balance for order ${order._id}`);

        continue;
      }

      const pendingBefore =  wallet.pendingBalance;
      const availableBefore = wallet.availableBalance;

      // On moving funds
      wallet.pendingBalance -= order.vendorEarnings;
      wallet.availableBalance += order.vendorEarnings;

      await WalletTransaction.create([{
        vendorId: order.vendorId,
        walletId: wallet._id,

        type: 'settlement',
        direction: 'credit',

        amount: order.vendorEarnings,

        balanceBefore: pendingBefore,
        balanceAfter: wallet.pendingBalance,

        referenceId: order._id,
        referenceModel: 'Order',

        description: `Funds settled for order ${order.orderNumber}`,

        status: 'completed',

        metadata: {
          orderNumber: order.orderNumber,
          settlementDate: order.settlementDate,
          availableBalanceBefore: availableBefore,
          availableBalanceAfter: wallet.availableBalance,
        },
      }], { session });

      order.settled = true;
      order.settledAt = new Date();

      await wallet.save({ session });
      await order.save({ session });

      console.log(`Settled order ${order.orderNumber}`);
    } 

    await session.commitTransaction();

    console.log('Settelment cron completed');
  } catch (error) {
    await session.abortTransaction();
    console.error('Settlment cron failed', error);
  } finally {
    session.endSession();
  }
};

const startSettlementCron = () => {
  //runSettlement()

  cron.schedule('*/10 * * * *', async() => {
    await runSettlement();
  });

  console.log('Settelement cron initialized');
};

module.exports = startSettlementCron;