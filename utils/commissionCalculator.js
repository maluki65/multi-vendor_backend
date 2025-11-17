const Product = require('../models/productModel');
const Category = require('../models/CategoryModel');

async function calculateOrderTotals(cartItems) {
  // CartItem: [{productId, quantity}]
  let totalAmount = 0;
  let totalCommission = 0;
  let TotalVendorEarnings = 0;
  const processedItems = [];

  for (const item of cartItems ) {
    const product = await Product.findById(item.productId).populate('category');
    if (!product) throw new Error(`Product ${item.productId} not found`);

    const qty = item.quantity;
    if (qty <= 0 ) throw new Error('Quantity must be greaater than 0');

    const price = product.price;
    const lineTotal = price * qty;
    const commissionRate = (product.category && product.category.commissionRate) ? product.category.commissionRate : 0;
    const commissionAmount = Number((lineTotal * commissionRate).toFixed(2));
    const vendorEarnings = Number((lineTotal - commissionAmount).toFixed(2));

    totalAmount += lineTotal;
    totalCommission += commissionAmount;
    TotalVendorEarnings += vendorEarnings;

    processedItems.push({
      productId: product._id,
      name: product.name,
      price,
      quantity: qty,
      commissionRate,
      commissionAmount,
      vendorEarnings
    });
  }

  return {
    items: processedItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    totalCommission: Number(totalCommission.toFixed(2)),
    TotalVendorEarnings: Number(TotalVendorEarnings.toFixed(2)),
  };
}

module.exports = { calculateOrderTotals };