require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const generateUniqueUserId = require('../utils/generateUniqueUserId');

const MONGO_URI = process.env.MONGO_URI;

const migrate = async() => {
  await mongoose.connect(MONGO_URI);
  console.log('Scripts conncted to DB');

  const users = await User.find({
    $or:[
      { UUID: { $exists: false } }
    ]
  });

  console.log(`Found ${users.length} user to migrate`);

  for (const user of users){
    if (!user.UUID){
      user.UUID = await generateUniqueUserId(user.role);
    }

    await user.save({ validateBeforeSave: false });
    console.log(`Migrated user ${user.email}`);
  }

  console.log('Migration complete');
  process.exit(0);
};

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});