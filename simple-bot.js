// Ultra-simple Telegram bot for Node.js 10
const TelegramBot = require("telegram-bot-api");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Create bot instance
const bot = new TelegramBot({
  token: process.env.BOT_TOKEN || "8027055639:AAElTX4rQUFkBEJYz80AAn5K7iFddExw4Nk",
  updates: { enabled: true },
});

// Constants
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Barter31Babee";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "5666579908";

// Simple in-memory storage
const menu = [];
const carts = {};

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to send messages
async function sendMessage(chatId, text, options = {}) {
  try {
    return await bot.sendMessage({
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || "Markdown",
      reply_markup: options.reply_markup,
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// Command handler middleware
bot.on("message", async (message) => {
  try {
    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.from.username || "";

    // Handle commands
    if (text.startsWith("/start")) {
      await sendMessage(chatId, "Welcome to TrapStr UFO Bot! Use /menu to see available items");
    } else if (text.startsWith("/menu")) {
      await handleMenuCommand(chatId, username);
    } else if (text.startsWith("/additem") && username === ADMIN_USERNAME) {
      await sendMessage(
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
    } else if (text.startsWith("/help")) {
      const isAdmin = username === ADMIN_USERNAME;

      let helpMsg = "🛍 *TrapStr UFO Bot Commands*\n\n";
      helpMsg += "Customer Commands:\n";
      helpMsg += "/start - Start ordering\n";
      helpMsg += "/menu - View available items\n";
      helpMsg += "/cart - View your cart\n";
      helpMsg += "/help - Show help message\n\n";

      if (isAdmin) {
        helpMsg += "Admin Commands:\n";
        helpMsg += "/additem - Add new menu item\n";
        helpMsg += "Send EITHER a photo OR video with caption to add new item\n";
      }

      await sendMessage(chatId, helpMsg);
    } else if (text.startsWith("/cart")) {
      await handleCartCommand(chatId);
    }
    // Handle quantity selection for cart
    else if (text.match(/^.+\s\(\$\d+\)$/)) {
      await handleQuantitySelection(chatId, text, username);
    }
    // Handle cart actions
    else if (text === "✅ Confirm Order") {
      await handleConfirmOrder(chatId, username);
    } else if (text === "❌ Cancel Order") {
      await handleCancelOrder(chatId);
    } else if (text === "📋 View Menu") {
      await handleMenuCommand(chatId, username);
    } else if (text === "🛒 View Cart") {
      await handleCartCommand(chatId);
    }

    // Handle photos for adding menu items (admin only)
    if (message.photo && message.photo.length > 0 && username === ADMIN_USERNAME) {
      await handlePhotoMessage(message);
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
});

// Handle menu command
async function handleMenuCommand(chatId, username) {
  if (menu.length === 0) {
    return sendMessage(chatId, "📝 Menu is empty. Add items using /additem");
  }

  for (const item of menu) {
    if (!item.isAvailable) continue;

    // Format message
    const formattedPrice = item.quantities.map((q) => `• ${q.amount}: $${q.price}`).join("\n");
    const message = `*${item.name}*\n${item.description}\n\n${formattedPrice}`;

    // Show item ID for admin
    const isAdmin = username === ADMIN_USERNAME;
    const fullMessage = isAdmin ? `${message}\n\nItem ID: ${item.id}` : message;

    // Create keyboard for adding to cart
    const inlineKeyboard = {
      inline_keyboard: [[{ text: "Add to Cart", callback_data: `add_${item.id}` }]],
    };

    // Send menu item
    await sendMessage(chatId, fullMessage, { reply_markup: inlineKeyboard });
  }
}

// Handle photo messages
async function handlePhotoMessage(message) {
  const chatId = message.chat.id;
  const caption = message.caption || "";

  // Parse caption for item details
  if (!caption.includes("\n")) {
    return sendMessage(
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
    return sendMessage(chatId, "❌ No valid quantity options found");
  }

  // Add to menu
  const id = Date.now().toString();
  menu.push({
    id,
    name,
    description,
    photoId: message.photo[0].file_id, // Store photo ID for sending later
    quantities,
    isAvailable: true,
  });

  return sendMessage(chatId, `✅ Menu item added successfully!\n\nItem ID: ${id}`);
}

// Handle cart command
async function handleCartCommand(chatId) {
  const cart = carts[chatId] || [];

  if (cart.length === 0) {
    return sendMessage(chatId, "Your cart is empty. Use /menu to see available items.");
  }

  let total = 0;
  let message = "*Your Cart:*\n\n";

  cart.forEach((item, i) => {
    message += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  message += `\n*Total: $${total}*`;

  // Create cart actions keyboard
  const keyboard = {
    keyboard: [["✅ Confirm Order", "❌ Cancel Order"], ["📋 View Menu"]],
    resize_keyboard: true,
  };

  return sendMessage(chatId, message, { reply_markup: keyboard });
}

// Handle quantity selection
async function handleQuantitySelection(chatId, text, username) {
  const match = text.match(/^(.+)\s\(\$(\d+)\)$/);
  if (!match) return;

  const amount = match[1];
  const price = parseInt(match[2]);

  if (!carts[chatId]) carts[chatId] = [];

  // Find which item this is from (simplified)
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
  const keyboard = {
    keyboard: [
      ["📋 View Menu", "🛒 View Cart"],
      ["✅ Confirm Order", "❌ Cancel Order"],
    ],
    resize_keyboard: true,
  };

  return sendMessage(
    chatId,
    `Added ${amount} of ${itemName} to cart!\n\nUse /cart to view your cart or /menu to continue shopping.`,
    { reply_markup: keyboard }
  );
}

// Handle confirm order
async function handleConfirmOrder(chatId, username) {
  const cart = carts[chatId] || [];

  if (cart.length === 0) {
    return sendMessage(chatId, "Your cart is empty");
  }

  const orderId = Date.now().toString();
  let total = 0;
  let items = "";

  cart.forEach((item, i) => {
    items += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  // Notify admin of new order
  await sendMessage(
    ADMIN_CHAT_ID,
    `🔔 *NEW ORDER #${orderId}*\n\nFrom: @${username}\n\n${items}\nTotal: $${total}`
  );

  // Clear user's cart
  delete carts[chatId];

  return sendMessage(
    chatId,
    "✅ Your order has been placed! You will be notified when it is confirmed."
  );
}

// Handle cancel order
async function handleCancelOrder(chatId) {
  delete carts[chatId];
  return sendMessage(chatId, "Order cancelled. Use /menu to browse items.");
}

// Handle callback queries (for inline buttons)
bot.on("callback_query", async (query) => {
  try {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Add to cart button
    if (data.startsWith("add_")) {
      const itemId = data.replace("add_", "");
      const item = menu.find((i) => i.id === itemId);

      if (!item) return;
      if (!item.isAvailable) return;

      // Create keyboard with quantity options
      const keyboard = {
        keyboard: item.quantities.map((q) => [`${q.amount} ($${q.price})`]),
        one_time_keyboard: true,
        resize_keyboard: true,
      };

      await sendMessage(chatId, `Select quantity for ${item.name}:`, { reply_markup: keyboard });
    }
  } catch (error) {
    console.error("Error handling callback query:", error);
  }
});

console.log("Starting bot...");
bot
  .start()
  .then(() => {
    console.log("🚀 TrapStr UFO Bot is running");
  })
  .catch((error) => {
    console.error("Error starting bot:", error);
  });
