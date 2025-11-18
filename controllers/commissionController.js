const Order = require('../models/orderModel');

// On getting all commissions from all vendors
exports.getAllCommissions = async (req, res, next) => {
  try{
    const orders = await Order.find({ paymentStatus: 'completed'}).populate('vendorId', 'storeName');

      const result = orders.flatMap(order => order.products.map(item => ({
        vendor: order.vendorId?.storeName,
        vendorId: order.vendorId?._id,
        productId: item.productId,
        commissionRate:  item.commissionRate,
        commissionAmount: item.commissionAmount,
        orderId: order._id,
        createdAt: orders.createdAt,
      }))
    );

    res.status(200).json({
      status: 'success',
      results: result.length,
      commission: result,
    });

  } catch (error) {
    next(error);
  }
}

// on getting commissions for a specific vendor
exports.getCommissionByVendor = async (req, res, next) => {
  try{
    const { vendorId } = req.params;
    
    const orders = await Order.find({
      paymentStatus: 'completed',
      vendorId,
    });

    const commission = orders.flatMap(order => order.products.map(item => ({
        orderId: order._id,
        productId: item.productId,
        commissionAmount: item.commissionAmount,
        commissionRate: item.commissionRate,
        createdAt: order.createdAt,
      }))
    );

    const totalVendorCommission = commission.reduce((sum, c) => sum + c.commissionAmount, 0);

    res.status(200).json({
      status: 'success',
      vendorId,
      totalVendorCommission,
      commission,
    });

  } catch (error) {
    next(error);
  }
};

// On calculating total commission platform-wide
exports.getTotalAdminCommission = async (req, res, next) => {
  try{
    const orders = await Order.find({ paymentStatus: 'completed' });

    const totalCommission = orders.reduce((sum, order) => {
      const productCommission = order.products.reduce((subSum, item) => subSum + item.commissionAmount, 0);

      return sum + productCommission;
    }, 0);

    res.status(200).json({
      status: 'success',
      totalCommission,
    });
  } catch (error) {
    next(error);
  }
};