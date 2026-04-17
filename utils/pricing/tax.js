const VAT_RATE = 0.16;

const calculateItemTax = (amount) => {
  return amount * VAT_RATE;
};

module.exports = {
  VAT_RATE,
  calculateItemTax
};