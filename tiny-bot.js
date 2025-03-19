// Ultra minimal test bot - just to confirm Telegram API works
console.log("Starting minimal test...");

// Try to load dependencies
try {
  const TelegramBot = require("node-telegram-bot-api");
  console.log("✅ Successfully loaded node-telegram-bot-api");

  // Create bot with polling
  const TOKEN = "8027055639:AAElTX4rQUFkBEJYz80AAn5K7iFddExw4Nk";
  console.log("Creating bot with token...");
  const bot = new TelegramBot(TOKEN, { polling: true });

  // Basic command
  bot.onText(/\/start/, (msg) => {
    console.log("Received /start command");
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Bot is working! Basic functionality confirmed.");
  });

  console.log("🚀 Bot started successfully! Test with /start");
} catch (error) {
  console.error("❌ Error loading dependencies:", error.message);
  console.log("Current directory:", __dirname);
  console.log("Module paths:", module.paths);
}
