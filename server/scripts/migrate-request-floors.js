const mongoose = require('mongoose');
const OutingRequest = require('../models/OutingRequest');
require('dotenv').config();

async function migrateRequestFloors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/outing-db');
    console.log('Connected to MongoDB');

    const requests = await OutingRequest.find({});
    let updated = 0;

    for (const request of requests) {
      const oldFloor = request.floor;
      const normalizedFloor = OutingRequest.normalizeFloor(oldFloor);
      
      if (oldFloor !== normalizedFloor) {
        await OutingRequest.updateOne(
          { _id: request._id },
          { $set: { floor: normalizedFloor } }
        );
        updated++;
        console.log(`Updated request ${request._id} floor from ${oldFloor} to ${normalizedFloor}`);
      }
    }

    console.log(`Migration complete. Updated ${updated} requests.`);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateRequestFloors();
