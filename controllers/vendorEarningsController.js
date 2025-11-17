const  Order = require('../models/orderModel');
const Payout = require('../models/payoutModel');

exports.getVendorEarnings = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const orders = await Order.find({ vendorId, paymentStatus: 'completed'});

    const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalCommission = orders.reduce((s, o) => s + o.commissionAmount, 0);
    const TotalVendorEarnings = orders.reduce((s, o) => s + o.vendorEarnings, 0);

    // On considering 'eligible' orders: paymentStatus complete AND not included in any payout
    const payoutsForVendor = await Payout.find({ vendorId });
    const paidOrderIds = payoutsForVendor.flatMap(p => p.orders.map(id => id.toString()));

    const unpaidOrders = orders.filter(o => !paidOrderIds.includes(o._id.toString()));
    const unpaidAmount = unpaidOrders.reduce((s, o) => s + o.vendorEarnings, 0);

    // On pending payouts
    const pendingPayouts = await Payout.find({ vendorId, status: 'pending' });

    res.status(200).json({
      status: 'success',
      data: {
        totalSales,
        totalCommission,
        TotalVendorEarnings,
        unpaidAmount,
        unpaidOrdersCount: unpaidOrders.length,
        pendingPayoutsCount: pendingPayouts.length,
      }
    });
  } catch (error) {
    next(error);
  }
};