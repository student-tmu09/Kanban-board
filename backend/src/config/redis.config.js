const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying if not available
    }
    return 2000;
  }
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  // Silent or mild log so it doesn't crash node
});

module.exports = redis;
