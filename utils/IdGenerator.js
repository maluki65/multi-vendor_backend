const crypto = require('crypto');

const PREFIX_MAP = {
  Vendor: 'VEN',
  Buyer: 'BUY',
  Admin: 'ADM'
};

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const All = UPPERCASE + DIGITS;

const randomChar = () => 
  All[crypto.randomInt(0, All.length)];

const shuffle = (str) =>
  str.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');

const generateUserId = (role, length = 5) => {
  const prefix = PREFIX_MAP[role] || 'USR';

  // On generating at least one capital letter
  let body = UPPERCASE[crypto.randomInt(0, UPPERCASE.length)];

  for (let i = 1; i < length; i++){
    body += randomChar();
  }

  return `${prefix}-${shuffle(body)}`;
}

module.exports = generateUserId;