const cron = require('node-cron');
const mongoose = require('mongoose');
const CheckoutSession = require('../models/checkoutSessionModel');

const runCheckoutExpiry = async() => {
  console.log('Running checkout expiry cron...');
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const expiredSessions = await CheckoutSession.find({
      status: 'active',
      expiresAt: { $lte: new Date() },
      paymentStatus: { $in: ['pending', 'failed'] },
    }).session(session);

    /*if (!expiredSessions.length) {
      console.log('No expired checkout session found!');

      await session.commitTransaction();
      return;
    }*/

    for (const checkout of expiredSessions) {
      checkout.status = 'expired';

      await checkout.save({ session });

      console.log(
        `Expired checkout session ${checkout.checkoutUUID}`
      );
    }

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const deleteResults = await CheckoutSession.deleteMany(
      {
        status: 'expired',
        paymentStatus: { $in: ['pending', 'failed'] },
        expiresAt: { $lte: sevenDaysAgo },
      },
      { session }
    );

    if (deleteResults.deletedCount > 0) {
      console.log(`Deleted ${deleteResults.deletedCount} expired checkout session(s)`);
    }

    await session.commitTransaction();
    
    console.log('Checkout expiry cron completed');
  } catch (error) {
    await session.abortTransaction();
    console.error('Checkout expiry cron failed:', error);
  } finally {
    await session.endSession();
  }
};

const startCheckoutExpiryCron = () => {
  runCheckoutExpiry();

  cron.schedule('*/10 * * * *', async() => {
    await runCheckoutExpiry();
  });

  console.log('Checkout expiry cron initialized');
};

module.exports = startCheckoutExpiryCron