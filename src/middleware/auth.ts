import { Context } from "telegraf";

export const isAdmin = async (ctx: Context, next: () => Promise<void>) => {
  const username = ctx.from?.username;
  const adminUsername = process.env.ADMIN_USERNAME;

  if (!username || username !== adminUsername) {
    await ctx.reply("⛔️ Sorry, this command is only available to administrators.");
    return;
  }

  return next();
};

export const isValidUser = async (ctx: Context, next: () => Promise<void>) => {
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

export const handleError = async (error: any, ctx: Context) => {
  console.error("Bot error:", error);

  const errorMessage = error.description || error.message || "An unexpected error occurred";

  try {
    await ctx.reply(`❌ Error: ${errorMessage}\nPlease try again or contact support.`);
  } catch (e) {
    console.error("Error sending error message:", e);
  }
};

export const rateLimiter = new Map<number, { count: number; timestamp: number }>();

export const rateLimit = async (ctx: Context, next: () => Promise<void>) => {
  if (!ctx.from) return next();

  const now = Date.now();
  const userId = ctx.from.id;
  const limit = 20; // messages per minute
  const window = 60000; // 1 minute in milliseconds

  const userRate = rateLimiter.get(userId) || { count: 0, timestamp: now };

  // Reset counter if window has passed
  if (now - userRate.timestamp > window) {
    userRate.count = 0;
    userRate.timestamp = now;
  }

  // Increment counter
  userRate.count++;
  rateLimiter.set(userId, userRate);

  // Check if limit exceeded
  if (userRate.count > limit) {
    await ctx.reply("⚠️ Please slow down. Try again in a minute.");
    return;
  }

  return next();
};
