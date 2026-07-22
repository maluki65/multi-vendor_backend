const crypto = require('crypto');
const Checkout = require('../models/checkoutSessionModel');

const PREFIX = 'CH';
const ID_LENGTH = 8;

const APLPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const randomCheckoutID = () => {
  const bytes = crypto.randomBytes(ID_LENGTH);
  let id = '';

  for (let i = 0; i < ID_LENGTH; i++) {
    id += APLPHABET[bytes[i] % APLPHABET.length];
  }

  return `${PREFIX}${id}`;
};

const generateCheckoutID = async () => {
  let checkoutID;
  let exists = true;

  while (exists) {
    checkoutID = randomCheckoutID();
    exists = await Checkout.exists({ checkoutUUID: checkoutID });
  }

  return checkoutID
};

module.exports = generateCheckoutID;