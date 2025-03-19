// Simple Telegram bot with minimal dependencies for Node.js
const { Telegraf } = require("telegraf");
const express = require("express");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// Load environment variables
require("dotenv").config();

// Create Express app
const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// Create bot instance
const bot = new Telegraf(process.env.BOT_TOKEN || "8027055639:AAElTX4rQUFkBEJYz80AAn5K7iFddExw4Nk");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Barter31Babee";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "5666579908";

// Simple in-memory storage
const menu = [];
const carts = {};

// Ensure images directory exists
const IMAGES_DIR = process.env.IMAGES_PATH || path.join(__dirname, "data/images");
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Save media to disk (simplified)
async function saveMedia(url, filename) {
  try {
    const response = await fetch(url);
    const buffer = await response.buffer();
    const fullPath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    return filename;
  } catch (error) {
    console.error("Error saving media:", error);
    return null;
  }
}

// Start command
bot.start((ctx) => {
  ctx.reply("Welcome to TrapStr UFO Bot! Use /menu to see available items");
});

// Help command
bot.command("help", (ctx) => {
  const isAdmin = ctx.from.username === ADMIN_USERNAME;

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
    message += 'To add/update media later, send photo/video with "ID:[itemId]" in caption\n';
  }

  ctx.reply(message, { parse_mode: "Markdown" });
});

// Admin commands
bot.command("additem", (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  ctx.reply(
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
      "1/2 (80)\n" +
      "⚡️ (145)\n\n" +
      "💡 Tips:\n" +
      "• You only need EITHER a photo OR a video to add an item\n" +
      "• After adding an item, you'll see its ID in the confirmation message\n" +
      '• To add/update media later, send photo/video with "ID:[item-id]" in caption'
  );
});

// Handle photo messages for adding/updating items (admin only)
bot.on("photo", async (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  const caption = ctx.message.caption || "";
  const itemIdMatch = caption.match(/^ID:(\w+)/);

  // Update existing item
  if (itemIdMatch) {
    const itemId = itemIdMatch[1];
    const item = menu.find((i) => i.id === itemId);

    if (!item) {
      return ctx.reply("❌ Item not found");
    }

    // Get photo URL
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Save photo
    const filename = `photo_${Date.now()}.jpg`;
    const savedFile = await saveMedia(fileUrl, filename);

    if (savedFile) {
      item.photoId = fileId;
      item.photoFile = savedFile;
      ctx.reply("✅ Photo updated successfully!");
    } else {
      ctx.reply("❌ Error saving photo");
    }

    return;
  }

  // Add new item
  if (!caption.includes("\n")) {
    return ctx.reply("❌ Please include name, description, and at least one quantity option");
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
    return ctx.reply("❌ No valid quantity options found");
  }

  // Get photo info
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const file = await ctx.telegram.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

  // Save photo
  const filename = `photo_${Date.now()}.jpg`;
  const savedFile = await saveMedia(fileUrl, filename);

  if (!savedFile) {
    return ctx.reply("❌ Error saving photo");
  }

  // Add to menu
  const id = Date.now().toString();
  menu.push({
    id,
    name,
    description,
    photoId: fileId,
    photoFile: savedFile,
    quantities,
    isAvailable: true,
  });

  ctx.reply(`✅ Menu item added successfully!\n\nItem ID: ${id}`);
});

// Handle video messages similar to photos
bot.on("video", async (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  const caption = ctx.message.caption || "";
  const itemIdMatch = caption.match(/^ID:(\w+)/);

  // Update existing item
  if (itemIdMatch) {
    const itemId = itemIdMatch[1];
    const item = menu.find((i) => i.id === itemId);

    if (!item) {
      return ctx.reply("❌ Item not found");
    }

    // Get video URL
    const fileId = ctx.message.video.file_id;
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Save video
    const filename = `video_${Date.now()}.mp4`;
    const savedFile = await saveMedia(fileUrl, filename);

    if (savedFile) {
      item.videoId = fileId;
      item.videoFile = savedFile;
      ctx.reply("✅ Video updated successfully!");
    } else {
      ctx.reply("❌ Error saving video");
    }

    return;
  }

  // Add new item
  if (!caption.includes("\n")) {
    return ctx.reply("❌ Please include name, description, and at least one quantity option");
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
    return ctx.reply("❌ No valid quantity options found");
  }

  // Get video info
  const fileId = ctx.message.video.file_id;
  const file = await ctx.telegram.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

  // Save video
  const filename = `video_${Date.now()}.mp4`;
  const savedFile = await saveMedia(fileUrl, filename);

  if (!savedFile) {
    return ctx.reply("❌ Error saving video");
  }

  // Add to menu
  const id = Date.now().toString();
  menu.push({
    id,
    name,
    description,
    videoId: fileId,
    videoFile: savedFile,
    quantities,
    isAvailable: true,
  });

  ctx.reply(`✅ Menu item added successfully!\n\nItem ID: ${id}`);
});

// Menu command
bot.command("menu", async (ctx) => {
  if (menu.length === 0) {
    return ctx.reply("📝 Menu is empty. Add items using /additem");
  }

  for (const item of menu) {
    if (!item.isAvailable) continue;

    // Format message
    const formattedPrice = item.quantities.map((q) => `• ${q.amount}: $${q.price}`).join("\n");
    const message = `*${item.name}*\n${item.description}\n\n${formattedPrice}`;

    // Show item ID for admin
    const isAdmin = ctx.from.username === ADMIN_USERNAME;
    const fullMessage = isAdmin ? `${message}\n\nItem ID: ${item.id}` : message;

    try {
      // Send media with message
      if (item.photoId) {
        await ctx.replyWithPhoto(item.photoId, {
          caption: fullMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "Add to Cart", callback_data: `add_${item.id}` }]],
          },
        });
      } else if (item.videoId) {
        await ctx.replyWithVideo(item.videoId, {
          caption: fullMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "Add to Cart", callback_data: `add_${item.id}` }]],
          },
        });
      } else {
        await ctx.reply(fullMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "Add to Cart", callback_data: `add_${item.id}` }]],
          },
        });
      }
    } catch (error) {
      console.error(`Error sending menu item ${item.id}:`, error);
      // Fallback to text only
      await ctx.reply(fullMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "Add to Cart", callback_data: `add_${item.id}` }]],
        },
      });
    }
  }
});

// Add to cart
bot.action(/^add_(\w+)$/, (ctx) => {
  const itemId = ctx.match[1];
  const item = menu.find((i) => i.id === itemId);

  if (!item) return ctx.answerCbQuery("Item not found");
  if (!item.isAvailable) return ctx.answerCbQuery("Item is sold out");

  ctx.answerCbQuery("Choose quantity:");

  // Add a meme option for quantity 10
  const keyboard = item.quantities.map((q) => [`${q.amount} ($${q.price})`]);
  
  // Add meme option for quantity 10 if it doesn't exist
  const has10Option = item.quantities.some(q => q.amount === "10" || q.amount === "10g");
  if (!has10Option) {
    keyboard.push(["🔥 Meme Lord Special (10) ($100)"]);
  }

  ctx.reply(`Select quantity for ${item.name}:`, {
    reply_markup: {
      keyboard: keyboard,
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// Handle quantity selection
bot.hears(/^.+\s\(\$\d+\)$/, (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const match = text.match(/^(.+)\s\(\$(\d+)\)$/);

  if (!match) return;

  const amount = match[1];
  const price = parseInt(match[2]);

  if (!carts[userId]) carts[userId] = [];

  // Check for meme option
  if (amount.includes("Meme Lord Special")) {
    // Find the last item shown in the menu
    const lastItemShown = menu.find(i => i.isAvailable);
    if (lastItemShown) {
      carts[userId].push({
        itemId: lastItemShown.id,
        itemName: lastItemShown.name,
        amount: "10",
        price: 100,
      });
      
      ctx.reply(
        `🔥🔥🔥 MEME LORD SPECIAL ADDED! 🔥🔥🔥\n\nAdded 10 of ${lastItemShown.name} to cart!\n\nUse /cart to view your cart or /menu to continue shopping.`,
        {
          reply_markup: {
            keyboard: [
              ["📋 View Menu", "🛒 View Cart"],
              ["✅ Confirm Order", "❌ Cancel Order"],
            ],
            resize_keyboard: true,
          },
        }
      );
      return;
    }
  }

  // Regular quantity option
  // Find which item this is from
  let itemName = "Item";
  for (const item of menu) {
    for (const q of item.quantities) {
      if (q.amount === amount && q.price === price) {
        itemName = item.name;
        carts[userId].push({
          itemId: item.id,
          itemName,
          amount,
          price,
        });
        break;
      }
    }
  }

  ctx.reply(
    `Added ${amount} of ${itemName} to cart!\n\nUse /cart to view your cart or /menu to continue shopping.`,
    {
      reply_markup: {
        keyboard: [
          ["📋 View Menu", "🛒 View Cart"],
          ["✅ Confirm Order", "❌ Cancel Order"],
        ],
        resize_keyboard: true,
      },
    }
  );
});

// View cart
bot.command("cart", (ctx) => {
  const userId = ctx.from.id;
  const cart = carts[userId] || [];

  if (cart.length === 0) {
    return ctx.reply("Your cart is empty. Use /menu to see available items.");
  }

  let total = 0;
  let message = "*Your Cart:*\n\n";

  cart.forEach((item, i) => {
    message += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  message += `\n*Total: $${total}*`;

  ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [["✅ Confirm Order", "❌ Cancel Order"], ["📋 View Menu"]],
      resize_keyboard: true,
    },
  });
});

// Confirm order
bot.hears("✅ Confirm Order", (ctx) => {
  const userId = ctx.from.id;
  const cart = carts[userId] || [];

  if (cart.length === 0) {
    return ctx.reply("Your cart is empty");
  }

  const orderId = Date.now().toString();
  let total = 0;
  let items = "";

  cart.forEach((item, i) => {
    items += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  // Notify admin of new order
  bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `🔔 *NEW ORDER #${orderId}*\n\nFrom: @${ctx.from.username}\n\n${items}\nTotal: $${total}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Accept", callback_data: `accept_${orderId}_${userId}` },
            { text: "❌ Reject", callback_data: `reject_${orderId}_${userId}` },
          ],
        ],
      },
    }
  );

  // Clear user's cart
  delete carts[userId];

  ctx.reply("✅ Your order has been placed! You will be notified when it is confirmed.");
});

// Cancel order
bot.hears("❌ Cancel Order", (ctx) => {
  const userId = ctx.from.id;
  delete carts[userId];
  ctx.reply("Order cancelled. Use /menu to browse items.");
});

// Common text commands
bot.hears("📋 View Menu", (ctx) => {
  ctx.reply("/menu");
});

bot.hears("🛒 View Cart", (ctx) => {
  ctx.reply("/cart");
});

// Admin order management
bot.action(/^accept_(\w+)_(\d+)$/, (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  const orderId = ctx.match[1];
  const userId = ctx.match[2];
  
  ctx.answerCbQuery("Order accepted");

  // Notify customer
  bot.telegram.sendMessage(userId, `✅ Your order #${orderId} has been confirmed!`);
});

bot.action(/^reject_(\w+)_(\d+)$/, (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  const orderId = ctx.match[1];
  const userId = ctx.match[2];
  
  ctx.answerCbQuery("Order rejected");

  // Notify customer
  bot.telegram.sendMessage(userId, `❌ Your order #${orderId} has been rejected.`);
});

// In-transit notification
bot.command("intransit", (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  const args = ctx.message.text.split(" ");
  if (args.length < 3) {
    return ctx.reply("Usage: /intransit [orderId] [userId]");
  }

  const orderId = args[1];
  const userId = args[2];

  bot.telegram.sendMessage(userId, `🚚 Your order #${orderId} is on the way!`);
  ctx.reply(`Notification sent for order #${orderId}`);
});

// Delivered notification
bot.command("delivered", (ctx) => {
  if (ctx.from.username !== ADMIN_USERNAME) return;

  const args = ctx.message.text.split(" ");
  if (args.length < 3) {
    return ctx.reply("Usage: /delivered [orderId] [userId]");
  }

  const orderId = args[1];
  const userId = args[2];

  bot.telegram.sendMessage(userId, `🎉 Your order #${orderId} has been delivered! Enjoy!`);
  ctx.reply(`Notification sent for order #${orderId}`);
});

// Handle errors
bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  ctx.reply("An error occurred. Please try again later.");
});

// Set up webhook endpoint for Render.com
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TrapStr UFO Bot is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/webhook", async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.sendStatus(500);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Set webhook for production or use polling for development
  if (process.env.NODE_ENV === "production") {
    const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://trap-str-ufo-2.onrender.com/webhook";
    bot.telegram.setWebhook(WEBHOOK_URL)
      .then(() => {
        console.log(`Webhook set to ${WEBHOOK_URL}`);
      })
      .catch((error) => {
        console.error("Error setting webhook:", error);
      });
  } else {
    // Start bot with polling for local development
    bot.launch()
      .then(() => {
        console.log("Bot started in polling mode");
      })
      .catch((error) => {
        console.error("Error starting bot:", error);
      });
  }
});
