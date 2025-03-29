const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function migrateFloorFormat() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/outing-db');
    console.log('Connected to MongoDB');

    const users = await User.find({ role: 'student' });
    let updated = 0;

    for (const user of users) {
      const oldFloor = user.floor;
      const formattedFloor = User.formatFloor(oldFloor);
      
      if (oldFloor !== formattedFloor) {
        await User.updateOne(
          { _id: user._id },
          { $set: { floor: formattedFloor } }
        );
        updated++;
        console.log(`Updated user ${user.email} floor from ${oldFloor} to ${formattedFloor}`);
      }
    }

    console.log(`Migration complete. Updated ${updated} users.`);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateFloorFormat();
