const CheckoutSession = require('../models/checkoutSessionModel');
const { buildPricing } = require('../utils/pricing/service');

/**
 * Refreshes the shipping address and pricing of an active checkout session
 * after the buyer updates their delivery address.
 *
 * @param {String|ObjectId} buyerId
 * @param {Object} address
 * @returns {Object|null} Updated checkout session or null if none exists
 */

const refreshCheckoutShipping = async (buyerId, address) => {
  if (!buyerId || !address) return null;

  const { city, street } = address;

  const session = await CheckoutSession.findOne({
    buyerId,
    //status: 'active',
  });

  if (!session) return null;

  const pricing = /* await*/ buildPricing({
    items: session.items.map((item) => ({
      price: item.basePrice,
      disount: item.discount,
      discountPrice: item.finalPrice,
      quantity: item.quantity,
    })),
    location: {
      county: city,
      area: street,
    }
  });

  session.shippingAddress = {
    county: city,
    area: street,
  };

  session.pricing = pricing;

  await session.save();

  return session;
};

module.exports = refreshCheckoutShipping;