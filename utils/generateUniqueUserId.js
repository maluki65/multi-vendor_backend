const generateUserId = require('./IdGenerator');
const User = require('../models/userModel');

const MAX_RETRIES = 5;

const generateUniqueUserId = async(role) => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const uuId = generateUserId(role);

    const exists = await User.exists({ uuId });
    if(!exists) return uuId;
  }

  throw new Error('Unable to generate unique UUID');
};

module.exports = generateUniqueUserId;