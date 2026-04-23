const { getShippingFee } = require('./shipping');
const { calculateItemTax } = require('./tax');

const buildPricing = ({ items, location }) => {
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const unitPrice =
      item.discount > 0 ? item.discountPrice : item.price;

    const itemTotal = unitPrice * item.quantity;

    subtotal += itemTotal;
    tax += calculateItemTax(itemTotal);
  }

  const shipping = getShippingFee(location);

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
  };
};

module.exports = {
  buildPricing,
};