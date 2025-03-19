// Simple test script for the Telegram bot
const { Telegraf } = require('telegraf');
require('dotenv').config();

// Get the bot token from environment variables
const token = process.env.BOT_TOKEN || '8027055639:AAElTX4rQUFkBEJYz80AAn5K7iFddExw4Nk';

// Create a new bot instance
const bot = new Telegraf(token);

// Log the bot info
console.log('Bot info:', bot.telegram);

// Add a simple start command
bot.start((ctx) => {
  console.log('Received start command');
  return ctx.reply('Hello! I am the TrapStr UFO Bot. I am running in test mode.');
});

// Add a simple help command
bot.help((ctx) => {
  console.log('Received help command');
  return ctx.reply('This is a test version of the TrapStr UFO Bot.');
});

// Handle errors
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  return ctx.reply('An error occurred. Please try again later.');
});

// Start the bot
console.log('Starting bot in polling mode...');
bot.launch().then(() => {
  console.log('Bot started successfully!');
}).catch((error) => {
  console.error('Failed to start bot:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
