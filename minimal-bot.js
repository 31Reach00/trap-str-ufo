// Minimal Telegram bot using node-telegram-bot-api (Node.js 10 compatible)
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Create bot instance with polling
const TOKEN = process.env.BOT_TOKEN || "8027055639:AAElTX4rQUFkBEJYz80AAn5K7iFddExw4Nk";
const bot = new TelegramBot(TOKEN, { polling: true });

// Constants
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Barter31Babee";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "5666579908";

// Simple in-memory storage
const menu = [];
const carts = {};

// Create data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creating directory:", err);
    // For Node.js 10 without recursive option
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
  }
}

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome to TrapStr UFO Bot! Use /menu to see available items");
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = msg.from.username === ADMIN_USERNAME;

  let message = "🛍 *TrapStr UFO Bot Commands*\n\n";
  message += "Customer Commands:\n";
  message += "/start - Start ordering\n";
  message += "/menu - View available items\n";
  message += "/cart - View your cart\n";
  message += "/help - Show help message\n\n";

  if (isAdmin) {
    message += "Admin Commands:\n";
    message += "/additem - Add new menu item\n";
    message += "Send EITHER a photo OR video with caption to add new item\n";
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// Add item command (admin only)
bot.onText(/\/additem/, (msg) => {
  const chatId = msg.chat.id;
  if (msg.from.username !== ADMIN_USERNAME) return;

  bot.sendMessage(
    chatId,
    "📸 Send a photo OR video with caption in the format:\n\n" +
      "Name\n" +
      "Description\n" +
      "Quantity1 (price)\n" +
      "Quantity2 (price)...\n\n" +
      "Example:\n" +
      "Premium Flower\n" +
      "Top shelf indoor\n" +
      "2g (15)\n" +
      "1/8 (25)\n" +
      "1/4 (45)\n" +
      "1/2 (80)\n\n" +
      "💡 Tips:\n" +
      "• You only need EITHER a photo OR a video to add an item\n" +
      "• After adding an item, you'll see its ID in the confirmation message"
  );
});

// Menu command
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  if (menu.length === 0) {
    return bot.sendMessage(chatId, "📝 Menu is empty");
  }

  for (const item of menu) {
    if (!item.isAvailable) continue;

    // Format message
    const formattedPrice = item.quantities.map((q) => `• ${q.amount}: $${q.price}`).join("\n");
    const message = `*${item.name}*\n${item.description}\n\n${formattedPrice}`;

    // Show item ID for admin
    const isAdmin = username === ADMIN_USERNAME;
    const fullMessage = isAdmin ? `${message}\n\nItem ID: ${item.id}` : message;

    // Create inline keyboard
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Add to Cart", callback_data: `add_${item.id}` }]],
      },
    };

    // Send menu item
    bot.sendMessage(chatId, fullMessage, opts);
  }
});

// Handle photo messages (admin only)
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  if (msg.from.username !== ADMIN_USERNAME) return;

  const caption = msg.caption || "";

  // Process photo message
  if (!caption.includes("\n")) {
    return bot.sendMessage(
      chatId,
      "❌ Please include name, description, and at least one quantity option"
    );
  }

  const lines = caption.split("\n");
  const name = lines[0];
  const description = lines[1] || "";
  const quantities = [];

  // Parse quantities and prices
  for (let i = 2; i < lines.length; i++) {
    const match = lines[i].match(/(.+?)\s*\((\d+)\)/);
    if (match) {
      quantities.push({
        amount: match[1].trim(),
        price: parseInt(match[2]),
      });
    }
  }

  if (quantities.length === 0) {
    return bot.sendMessage(chatId, "❌ No valid quantity options found");
  }

  // Add to menu
  const id = Date.now().toString();
  menu.push({
    id,
    name,
    description,
    photoId: msg.photo[msg.photo.length - 1].file_id,
    quantities,
    isAvailable: true,
  });

  bot.sendMessage(chatId, `✅ Menu item added successfully!\n\nItem ID: ${id}`);
});

// Cart command
bot.onText(/\/cart/, (msg) => {
  const chatId = msg.chat.id;
  const cart = carts[chatId] || [];

  if (cart.length === 0) {
    return bot.sendMessage(chatId, "Your cart is empty. Use /menu to see available items.");
  }

  let total = 0;
  let message = "*Your Cart:*\n\n";

  cart.forEach((item, i) => {
    message += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  message += `\n*Total: $${total}*`;

  // Create keyboard for cart actions
  const opts = {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [["✅ Confirm Order", "❌ Cancel Order"], ["📋 View Menu"]],
      resize_keyboard: true,
    },
  };

  bot.sendMessage(chatId, message, opts);
});

// Handle callback queries (for inline buttons)
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Add to cart
  if (data.startsWith("add_")) {
    const itemId = data.replace("add_", "");
    const item = menu.find((i) => i.id === itemId);

    if (!item) return bot.answerCallbackQuery(query.id, "Item not found");
    if (!item.isAvailable) return bot.answerCallbackQuery(query.id, "Item is sold out");

    bot.answerCallbackQuery(query.id, "Choose quantity:");

    // Create keyboard for quantity selection
    const keyboard = item.quantities.map((q) => [`${q.amount} ($${q.price})`]);
    const opts = {
      reply_markup: {
        keyboard: keyboard,
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    };

    bot.sendMessage(chatId, `Select quantity for ${item.name}:`, opts);
  }
});

// Handle quantity selection
bot.onText(/^.+\s\(\$\d+\)$/, (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const match = text.match(/^(.+)\s\(\$(\d+)\)$/);

  if (!match) return;

  const amount = match[1];
  const price = parseInt(match[2]);

  if (!carts[chatId]) carts[chatId] = [];

  // Find which item this is from
  let itemName = "Item";
  for (const item of menu) {
    for (const q of item.quantities) {
      if (q.amount === amount && q.price === price) {
        itemName = item.name;
        carts[chatId].push({
          itemId: item.id,
          itemName,
          amount,
          price,
        });
        break;
      }
    }
  }

  // Create keyboard for cart actions
  const opts = {
    reply_markup: {
      keyboard: [
        ["📋 View Menu", "🛒 View Cart"],
        ["✅ Confirm Order", "❌ Cancel Order"],
      ],
      resize_keyboard: true,
    },
  };

  bot.sendMessage(
    chatId,
    `Added ${amount} of ${itemName} to cart!\n\nUse /cart to view your cart or /menu to continue shopping.`,
    opts
  );
});

// Confirm order
bot.onText(/✅ Confirm Order/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  const cart = carts[chatId] || [];

  if (cart.length === 0) {
    return bot.sendMessage(chatId, "Your cart is empty");
  }

  const orderId = Date.now().toString();
  let total = 0;
  let items = "";

  cart.forEach((item, i) => {
    items += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  // Notify admin of new order
  bot.sendMessage(
    ADMIN_CHAT_ID,
    `🔔 *NEW ORDER #${orderId}*\n\nFrom: @${username}\n\n${items}\nTotal: $${total}`,
    { parse_mode: "Markdown" }
  );

  // Clear user's cart
  delete carts[chatId];

  bot.sendMessage(
    chatId,
    "✅ Your order has been placed! You will be notified when it is confirmed."
  );
});

// Cancel order
bot.onText(/❌ Cancel Order/, (msg) => {
  const chatId = msg.chat.id;
  delete carts[chatId];
  bot.sendMessage(chatId, "Order cancelled. Use /menu to browse items.");
});

// View menu shortcut
bot.onText(/📋 View Menu/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "/menu");
});

// View cart shortcut
bot.onText(/🛒 View Cart/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "/cart");
});

console.log("Starting bot...");
console.log("🚀 TrapStr UFO Bot is running");
