//const { getShippingFee } = require('./shipping');
const { calculateItemTax } = require('./tax');

const calculateCartPricing = (cart) => {
  let subtotal = 0;
  let tax = 0;

  for (const item of cart.items) {
    const unitPrice = item.discount > 0 ?
      item.discountPrice : item.price;

      const itemTotal = unitPrice * item.quantity;

      subtotal += itemTotal;
      tax += calculateItemTax(itemTotal);
  }

  //const shipping = location ? getShippingFee(location) : 0;

  return {
    subtotal,
    tax,
    //shipping,
    total: subtotal + tax //+ shipping
  };
};

module.exports = { 
  calculateCartPricing
};