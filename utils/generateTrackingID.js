const crypto = require('crypto');
const Order = require('../models/orderModel');

const PREFIX = 'TR';
const ID_LENGTH = 8;

const APLPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const randomTrakingID = () => {
  const bytes = crypto.randomBytes(ID_LENGTH);
  let id = '';

  for (let i = 0; i < ID_LENGTH; i++) {
    id += APLPHABET[bytes[i] % APLPHABET.length];
  }

  return `${PREFIX}${id}`;
};

const generateTrackingID = async () => {
  let trackingID;
  let exists = true;

  while (exists) {
    trackingID = randomTrakingID();
    exists = await Order.exists({ trackingID });
  }

  return trackingID;
};

module.exports = generateTrackingID;