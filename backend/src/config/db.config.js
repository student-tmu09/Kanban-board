const mongoose = require('mongoose');

const connectDB = async() => {
  const connectionOption={
    maxPoolSize: 20,
  minPoolSize: 5,

  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
  waitQueueTimeoutMS: 5000,

  maxIdleTimeMS: 60000
  }
  try {
    await mongoose.connect(process.env.MONGO_URI,connectionOption);
    console.log('MongoDB Connected Successfully!');

    // Ensure existing accounts registered before OTP verification remain active
    try {
      const { User } = require("../models/user.model");
      await User.updateMany({ isVerified: { $exists: false } }, { $set: { isVerified: true } });
      const WorkspaceMember = require("../models/workspacemember.model");
      await WorkspaceMember.updateMany(
        { role: { $in: ['VIEWER', 'EDITOR'] } },
        { $set: { role: 'MEMBER' } }
      );

      // Clean up any historical duplicate in-app notifications
      const Notification = require("../models/notification.model");
      const allNotifs = await Notification.find({}).sort({ createdAt: 1 });
      const toDeleteIds = [];
      const seen = new Map();

      for (const notif of allNotifs) {
        const userStr = String(notif.user || "");
        const taskStr = String(notif.task || notif.workspace || "");
        const key = `${userStr}_${taskStr}`;
        const notifTime = new Date(notif.createdAt).getTime();

        if (seen.has(key)) {
          const lastTime = seen.get(key);
          if (Math.abs(notifTime - lastTime) < 15000) {
            toDeleteIds.push(notif._id);
            continue;
          }
        }
        seen.set(key, notifTime);
      }

      if (toDeleteIds.length > 0) {
        await Notification.deleteMany({ _id: { $in: toDeleteIds } });
        console.log(`[DB Cleanup] Cleaned up ${toDeleteIds.length} historical duplicate notifications.`);
      }
    } catch (migErr) {
      // ignore
    }
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;