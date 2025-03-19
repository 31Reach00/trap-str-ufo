import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { Telegraf } from "telegraf";
import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import fetch from "node-fetch";

// Load environment variables
dotenv.config();

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

// Create bot instance
const bot = new Telegraf(process.env.BOT_TOKEN || "8027055639:AAElTX4rQUFkBEJYz80AAn5K7iFddExw4Nk");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Barter31Babee";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "5666579908";

// Temporary directory for media files
const TEMP_DIR = os.tmpdir();

// Helper function to save media temporarily
async function saveMedia(url: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const fullPath = path.join(TEMP_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(buffer));
    return filename;
  } catch (error) {
    logger.error("Error saving media:", error);
    return null;
  }
}

// Firestore collections
const MENU_COLLECTION = "menu";
const CARTS_COLLECTION = "carts";
const ORDERS_COLLECTION = "orders";

// Start command
bot.start((ctx) => {
  ctx.reply("Welcome to TrapStr UFO Bot! Use /menu to see available items");
});

// Help command
bot.command("help", (ctx) => {
  const isAdmin = ctx.from?.username === ADMIN_USERNAME;

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
  if (ctx.from?.username !== ADMIN_USERNAME) return;

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
  if (ctx.from?.username !== ADMIN_USERNAME) return;

  const caption = ctx.message?.caption || "";
  const itemIdMatch = caption.match(/^ID:(\w+)/);

  // Update existing item
  if (itemIdMatch) {
    const itemId = itemIdMatch[1];
    const itemRef = db.collection(MENU_COLLECTION).doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return ctx.reply("❌ Item not found");
    }

    // Get photo URL
    const fileId = ctx.message?.photo?.[ctx.message.photo.length - 1]?.file_id;
    if (!fileId) return ctx.reply("❌ Photo not found");
    
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.telegram.token}/${file.file_path}`;

    // Update item
    await itemRef.update({
      photoId: fileId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    ctx.reply("✅ Photo updated successfully!");
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
  const fileId = ctx.message?.photo?.[ctx.message.photo.length - 1]?.file_id;
  if (!fileId) return ctx.reply("❌ Photo not found");

  // Add to menu
  const newItemRef = db.collection(MENU_COLLECTION).doc();
  await newItemRef.set({
    id: newItemRef.id,
    name,
    description,
    photoId: fileId,
    quantities,
    isAvailable: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  ctx.reply(`✅ Menu item added successfully!\n\nItem ID: ${newItemRef.id}`);
});

// Handle video messages similar to photos
bot.on("video", async (ctx) => {
  if (ctx.from?.username !== ADMIN_USERNAME) return;

  const caption = ctx.message?.caption || "";
  const itemIdMatch = caption.match(/^ID:(\w+)/);

  // Update existing item
  if (itemIdMatch) {
    const itemId = itemIdMatch[1];
    const itemRef = db.collection(MENU_COLLECTION).doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return ctx.reply("❌ Item not found");
    }

    // Get video URL
    const fileId = ctx.message?.video?.file_id;
    if (!fileId) return ctx.reply("❌ Video not found");

    // Update item
    await itemRef.update({
      videoId: fileId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    ctx.reply("✅ Video updated successfully!");
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
  const fileId = ctx.message?.video?.file_id;
  if (!fileId) return ctx.reply("❌ Video not found");

  // Add to menu
  const newItemRef = db.collection(MENU_COLLECTION).doc();
  await newItemRef.set({
    id: newItemRef.id,
    name,
    description,
    videoId: fileId,
    quantities,
    isAvailable: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  ctx.reply(`✅ Menu item added successfully!\n\nItem ID: ${newItemRef.id}`);
});

// Menu command
bot.command("menu", async (ctx) => {
  const menuSnapshot = await db.collection(MENU_COLLECTION).where("isAvailable", "==", true).get();
  
  if (menuSnapshot.empty) {
    return ctx.reply("📝 Menu is empty. Add items using /additem");
  }

  for (const doc of menuSnapshot.docs) {
    const item = doc.data();

    // Format message
    const formattedPrice = item.quantities.map((q: any) => `• ${q.amount}: $${q.price}`).join("\n");
    const message = `*${item.name}*\n${item.description}\n\n${formattedPrice}`;

    // Show item ID for admin
    const isAdmin = ctx.from?.username === ADMIN_USERNAME;
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
      logger.error(`Error sending menu item ${item.id}:`, error);
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
bot.action(/^add_(\w+)$/, async (ctx) => {
  const itemId = ctx.match?.[1];
  if (!itemId) return ctx.answerCbQuery("Invalid item");
  
  const itemDoc = await db.collection(MENU_COLLECTION).doc(itemId).get();
  if (!itemDoc.exists) return ctx.answerCbQuery("Item not found");
  
  const item = itemDoc.data();
  if (!item?.isAvailable) return ctx.answerCbQuery("Item is sold out");

  ctx.answerCbQuery("Choose quantity:");

  const keyboard = item.quantities.map((q: any) => [`${q.amount} ($${q.price})`]);

  ctx.reply(`Select quantity for ${item.name}:`, {
    reply_markup: {
      keyboard: keyboard,
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// Handle quantity selection
bot.hears(/^.+\s\(\$\d+\)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const text = ctx.message?.text;
  if (!text) return;
  
  const match = text.match(/^(.+)\s\(\$(\d+)\)$/);
  if (!match) return;

  const amount = match[1];
  const price = parseInt(match[2]);

  // Get user's cart
  const cartRef = db.collection(CARTS_COLLECTION).doc(userId.toString());
  const cartDoc = await cartRef.get();
  
  let cart = [];
  if (cartDoc.exists) {
    cart = cartDoc.data()?.items || [];
  }

  // Find which item this is from
  let itemName = "Item";
  let itemId = "";
  
  const menuSnapshot = await db.collection(MENU_COLLECTION).get();
  for (const doc of menuSnapshot.docs) {
    const item = doc.data();
    for (const q of item.quantities) {
      if (q.amount === amount && q.price === price) {
        itemName = item.name;
        itemId = item.id;
        
        cart.push({
          itemId: item.id,
          itemName,
          amount,
          price,
          addedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;
      }
    }
    if (itemId) break;
  }

  // Save cart
  await cartRef.set({
    userId: userId.toString(),
    items: cart,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

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
bot.command("cart", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const cartRef = db.collection(CARTS_COLLECTION).doc(userId.toString());
  const cartDoc = await cartRef.get();
  
  if (!cartDoc.exists || !cartDoc.data()?.items || cartDoc.data()?.items.length === 0) {
    return ctx.reply("Your cart is empty. Use /menu to see available items.");
  }

  const cart = cartDoc.data()?.items || [];
  let total = 0;
  let message = "*Your Cart:*\n\n";

  cart.forEach((item: any, i: number) => {
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
bot.hears("✅ Confirm Order", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const cartRef = db.collection(CARTS_COLLECTION).doc(userId.toString());
  const cartDoc = await cartRef.get();
  
  if (!cartDoc.exists || !cartDoc.data()?.items || cartDoc.data()?.items.length === 0) {
    return ctx.reply("Your cart is empty");
  }

  const cart = cartDoc.data()?.items || [];
  const orderId = Date.now().toString();
  let total = 0;
  let items = "";

  cart.forEach((item: any, i: number) => {
    items += `${i + 1}. ${item.itemName} - ${item.amount} - $${item.price}\n`;
    total += item.price;
  });

  // Create order in Firestore
  await db.collection(ORDERS_COLLECTION).doc(orderId).set({
    id: orderId,
    userId: userId.toString(),
    username: ctx.from?.username || "Unknown",
    items: cart,
    total,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify admin of new order
  bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `🔔 *NEW ORDER #${orderId}*\n\nFrom: @${ctx.from?.username}\n\n${items}\nTotal: $${total}`,
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
  await cartRef.delete();

  ctx.reply("✅ Your order has been placed! You will be notified when it is confirmed.");
});

// Cancel order
bot.hears("❌ Cancel Order", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const cartRef = db.collection(CARTS_COLLECTION).doc(userId.toString());
  await cartRef.delete();
  
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
bot.action(/^accept_(\w+)_(\d+)$/, async (ctx) => {
  if (ctx.from?.username !== ADMIN_USERNAME) return;

  const orderId = ctx.match?.[1];
  const userId = ctx.match?.[2];
  
  if (!orderId || !userId) {
    return ctx.answerCbQuery("Invalid order data");
  }
  
  ctx.answerCbQuery("Order accepted");

  // Update order status
  await db.collection(ORDERS_COLLECTION).doc(orderId).update({
    status: "accepted",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify customer
  bot.telegram.sendMessage(userId, `✅ Your order #${orderId} has been confirmed!`);
});

bot.action(/^reject_(\w+)_(\d+)$/, async (ctx) => {
  if (ctx.from?.username !== ADMIN_USERNAME) return;

  const orderId = ctx.match?.[1];
  const userId = ctx.match?.[2];
  
  if (!orderId || !userId) {
    return ctx.answerCbQuery("Invalid order data");
  }
  
  ctx.answerCbQuery("Order rejected");

  // Update order status
  await db.collection(ORDERS_COLLECTION).doc(orderId).update({
    status: "rejected",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify customer
  bot.telegram.sendMessage(userId, `❌ Your order #${orderId} has been rejected.`);
});

// In-transit notification
bot.command("intransit", async (ctx) => {
  if (ctx.from?.username !== ADMIN_USERNAME) return;

  const args = ctx.message?.text?.split(" ");
  if (!args || args.length < 3) {
    return ctx.reply("Usage: /intransit [orderId] [userId]");
  }

  const orderId = args[1];
  const userId = args[2];

  // Update order status
  await db.collection(ORDERS_COLLECTION).doc(orderId).update({
    status: "in-transit",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  bot.telegram.sendMessage(userId, `🚚 Your order #${orderId} is on the way!`);
  ctx.reply(`Notification sent for order #${orderId}`);
});

// Delivered notification
bot.command("delivered", async (ctx) => {
  if (ctx.from?.username !== ADMIN_USERNAME) return;

  const args = ctx.message?.text?.split(" ");
  if (!args || args.length < 3) {
    return ctx.reply("Usage: /delivered [orderId] [userId]");
  }

  const orderId = args[1];
  const userId = args[2];

  // Update order status
  await db.collection(ORDERS_COLLECTION).doc(orderId).update({
    status: "delivered",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  bot.telegram.sendMessage(userId, `🎉 Your order #${orderId} has been delivered! Enjoy!`);
  ctx.reply(`Notification sent for order #${orderId}`);
});

// Health check endpoint
export const app = onRequest({ region: "us-central1", memory: "256MiB" }, async (request, response) => {
  if (request.path === "/health") {
    response.status(200).send("OK");
    return;
  }

  if (request.path === "/webhook") {
    try {
      // Process update
      await bot.handleUpdate(request.body);
      response.status(200).send("OK");
    } catch (error) {
      logger.error("Error processing update:", error);
      response.status(500).send("Error processing update");
    }
    return;
  }

  response.status(404).send("Not found");
});

// Set webhook for production
if (process.env.NODE_ENV === "production") {
  const WEBHOOK_URL = `https://us-central1-${process.env.APP_PROJECT_ID}.cloudfunctions.net/app/webhook`;
  bot.telegram.setWebhook(WEBHOOK_URL)
    .then(() => {
      logger.info(`Webhook set to ${WEBHOOK_URL}`);
    })
    .catch((error) => {
      logger.error("Error setting webhook:", error);
    });
}
