"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit =
  exports.rateLimiter =
  exports.handleError =
  exports.isValidUser =
  exports.isAdmin =
    void 0;
const isAdmin = async (ctx, next) => {
  var _a;
  const username = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.username;
  const adminUsername = process.env.ADMIN_USERNAME;
  if (!username || username !== adminUsername) {
    await ctx.reply("⛔️ Sorry, this command is only available to administrators.");
    return;
  }
  return next();
};
exports.isAdmin = isAdmin;
const isValidUser = async (ctx, next) => {
  if (!ctx.from) {
    await ctx.reply("⚠️ Could not identify user.");
    return;
  }
  if (!ctx.from.username) {
    await ctx.reply("⚠️ You need to set up a Telegram username to use this bot.");
    return;
  }
  return next();
};
exports.isValidUser = isValidUser;
const handleError = async (error, ctx) => {
  console.error("Bot error:", error);
  const errorMessage = error.description || error.message || "An unexpected error occurred";
  try {
    await ctx.reply(`❌ Error: ${errorMessage}\nPlease try again or contact support.`);
  } catch (e) {
    console.error("Error sending error message:", e);
  }
};
exports.handleError = handleError;
exports.rateLimiter = new Map();
const rateLimit = async (ctx, next) => {
  if (!ctx.from) return next();
  const now = Date.now();
  const userId = ctx.from.id;
  const limit = 20; // messages per minute
  const window = 60000; // 1 minute in milliseconds
  const userRate = exports.rateLimiter.get(userId) || { count: 0, timestamp: now };
  // Reset counter if window has passed
  if (now - userRate.timestamp > window) {
    userRate.count = 0;
    userRate.timestamp = now;
  }
  // Increment counter
  userRate.count++;
  exports.rateLimiter.set(userId, userRate);
  // Check if limit exceeded
  if (userRate.count > limit) {
    await ctx.reply("⚠️ Please slow down. Try again in a minute.");
    return;
  }
  return next();
};
exports.rateLimit = rateLimit;
//# sourceMappingURL=auth.js.map
