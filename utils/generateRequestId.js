const crypto = require('crypto');

const generateRequestUUID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let results = '';

  for (let i = 0; i < 7; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    results += chars[randomIndex];
  }

  return `REQ-${results}`;
};

module.exports = generateRequestUUID;