const { getShippingFee } = require('./shipping');
const { calculateItemTax } = require('./tax');

const calculateCartPricing = (cart, location) => {
  let subtotal = 0;
  let tax = 0;
  let shipping = 0;

  const processedVendors = new Set();

  for (const item of cart.items) {
    const unitPrice = item.discount > 0 ? item.discountPrice : item.price
    const itemTotal = unitPrice * item.quantity;

    subtotal += itemTotal;

    tax += calculateItemTax(itemTotal);

    const vendorId = item.vendorId.toString();

    if (!processedVendors.has(vendorId)) {
      shipping += getShippingFee(location);
      processedVendors.add(vendorId);
    }
  }

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping
  };
};

module.exports = { 
  calculateCartPricing
};