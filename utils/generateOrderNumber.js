const crypto = require('crypto');

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ALL = DIGITS + CHARS;

const randomChar = (chars) => 
  chars[crypto.randomInt(0, chars.length)];

const shuffle = (str) => 
  str
   .split('')
   .sort(() => crypto.randomInt(0, 2) - 0.5)
   .join('');

const generateOrderNumber = async(Order) => {
  let id;
  let exists = true;

  while (exists) {
    let body = '';

    for (let i = 0; i < 3; i++) {
      body+= randomChar(DIGITS);
    }

    for (let i = 0; i < 5; i++){
      body += randomChar(ALL);
    }

    body = shuffle(body);

    id = `#${body}`;

    exists = await Order.findOne({ orderNumber: id });
  }

  return id;
};

module.exports = generateOrderNumber;