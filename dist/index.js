"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const menuController_1 = require("./controllers/menuController");
const orderController_1 = require("./controllers/orderController");
const auth_1 = require("./middleware/auth");
const context_1 = require("./types/context");
// Load environment variables
dotenv.config();
if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN must be provided in environment variables");
}
// Initialize express app for health checks
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
// Initialize bot
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
// Middleware
bot.use(auth_1.rateLimit);
// Error handling
bot.catch(auth_1.handleError);
// Start command
bot.command("start", auth_1.isValidUser, orderController_1.OrderController.startOrder);
// Admin commands
bot.command("additem", auth_1.isAdmin, (ctx) => {
  ctx.reply(
    "📸 Send a photo or video with caption in the format:\n\n" +
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
      "• You can start with either photo or video\n" +
      '• To add both, send second media with "ID:[item-id]" in caption\n' +
      "• Use /menu to see item IDs\n" +
      "• Videos should be short previews (under 50MB)"
  );
});
// Handle photo messages for adding/updating items (admin only)
bot.on("photo", auth_1.isAdmin, async (ctx) => {
  if (!(0, context_1.isPhotoMessage)(ctx)) return;
  const caption = ctx.message.caption || "";
  // If caption contains an item ID, it's an update
  const itemIdMatch = caption.match(/^ID:(\w+)/);
  if (itemIdMatch) {
    await menuController_1.MenuController.updateMenuItem(
      (0, context_1.createMatchContext)(ctx, [itemIdMatch[0], itemIdMatch[1]])
    );
  } else {
    await menuController_1.MenuController.addMenuItem(ctx);
  }
});
// Handle video messages for adding/updating items (admin only)
bot.on("video", auth_1.isAdmin, async (ctx) => {
  if (!(0, context_1.isVideoMessage)(ctx)) return;
  const caption = ctx.message.caption || "";
  // If caption contains an item ID, it's an update
  const itemIdMatch = caption.match(/^ID:(\w+)/);
  if (itemIdMatch) {
    await menuController_1.MenuController.updateMenuItem(
      (0, context_1.createMatchContext)(ctx, [itemIdMatch[0], itemIdMatch[1]])
    );
  } else {
    await menuController_1.MenuController.addMenuItem(ctx);
  }
});
// Menu commands
bot.command("menu", auth_1.isValidUser, menuController_1.MenuController.listMenuItems);
bot.command(["cart", "viewcart"], auth_1.isValidUser, orderController_1.OrderController.viewCart);
// Order management
bot.action(/^add_(\w+)$/, auth_1.isValidUser, orderController_1.OrderController.addToCart);
bot.action(/^quantity_(\w+)_(\d+)$/, auth_1.isValidUser, async (ctx) => {
  const match = ctx.match;
  if (match) {
    await orderController_1.OrderController.handleInlineQuantitySelection(
      (0, context_1.createMatchContext)(ctx, match)
    );
  }
});
bot.action(/^remove_(\d+)$/, auth_1.isValidUser, async (ctx) => {
  const match = ctx.match;
  if (match) {
    await orderController_1.OrderController.removeFromCart(
      (0, context_1.createMatchContext)(ctx, match)
    );
  }
});
bot.action("clear_cart", auth_1.isValidUser, orderController_1.OrderController.clearCart);
// Handle quantity selection (legacy method)
bot.hears(
  /^\d+\..+\(\$\d+\)$/,
  auth_1.isValidUser,
  orderController_1.OrderController.handleQuantitySelection
);
// Order confirmation and cancellation
bot.hears("✅ Confirm Order", auth_1.isValidUser, orderController_1.OrderController.confirmOrder);
bot.hears("❌ Cancel Order", auth_1.isValidUser, orderController_1.OrderController.cancelOrder);
// Admin order management
bot.action(/^accept_(\w+)$/, auth_1.isAdmin, async (ctx) => {
  var _a;
  const match = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
  if (match) {
    await orderController_1.OrderController.updateOrderStatus(
      (0, context_1.createMatchContext)(ctx, ["accept", match, "confirmed"])
    );
  }
  await ctx.answerCbQuery("Order accepted");
});
bot.action(/^reject_(\w+)$/, auth_1.isAdmin, async (ctx) => {
  var _a;
  const match = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
  if (match) {
    await orderController_1.OrderController.updateOrderStatus(
      (0, context_1.createMatchContext)(ctx, ["reject", match, "cancelled"])
    );
  }
  await ctx.answerCbQuery("Order rejected");
});
// Order status updates via inline buttons
bot.action(/^intransit_(\w+)$/, auth_1.isAdmin, async (ctx) => {
  var _a;
  const match = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
  if (match) {
    await orderController_1.OrderController.updateOrderStatus(
      (0, context_1.createMatchContext)(ctx, ["intransit", match, "in-transit"])
    );
  }
  await ctx.answerCbQuery("Order marked as in transit");
});
bot.action(/^delivered_(\w+)$/, auth_1.isAdmin, async (ctx) => {
  var _a;
  const match = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
  if (match) {
    await orderController_1.OrderController.updateOrderStatus(
      (0, context_1.createMatchContext)(ctx, ["delivered", match, "delivered"])
    );
  }
  await ctx.answerCbQuery("Order marked as delivered");
});
// Order status updates via commands
bot.command("intransit", auth_1.isAdmin, async (ctx) => {
  const orderId = ctx.message.text.split(" ")[1];
  if (orderId) {
    await orderController_1.OrderController.updateOrderStatus(
      (0, context_1.createMatchContext)(ctx, ["intransit", orderId, "in-transit"])
    );
  }
});
bot.command("delivered", auth_1.isAdmin, async (ctx) => {
  const orderId = ctx.message.text.split(" ")[1];
  if (orderId) {
    await orderController_1.OrderController.updateOrderStatus(
      (0, context_1.createMatchContext)(ctx, ["delivered", orderId, "delivered"])
    );
  }
});
// Item availability toggle
bot.command("toggle", auth_1.isAdmin, async (ctx) => {
  const itemId = ctx.message.text.split(" ")[1];
  if (itemId) {
    await menuController_1.MenuController.toggleAvailability(
      (0, context_1.createMatchContext)(ctx, ["toggle", itemId])
    );
  }
});
// Add inline button handler for toggling availability
bot.action(/^toggle_(\w+)$/, auth_1.isAdmin, async (ctx) => {
  var _a;
  const match = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
  if (match) {
    await menuController_1.MenuController.toggleAvailability(
      (0, context_1.createMatchContext)(ctx, ["toggle", match])
    );
  }
  await ctx.answerCbQuery("Item availability updated");
});
// Delete item
bot.command("delete", auth_1.isAdmin, async (ctx) => {
  const itemId = ctx.message.text.split(" ")[1];
  if (itemId) {
    await menuController_1.MenuController.deleteMenuItem(
      (0, context_1.createMatchContext)(ctx, ["delete", itemId])
    );
  }
});
// Delete item via inline button
bot.action(/^delete_(\w+)$/, auth_1.isAdmin, async (ctx) => {
  var _a;
  const match = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
  if (match) {
    await menuController_1.MenuController.deleteMenuItem(
      (0, context_1.createMatchContext)(ctx, ["delete", match])
    );
  }
  await ctx.answerCbQuery("Item deleted");
});
// Common text commands
bot.hears("📋 View Menu", auth_1.isValidUser, menuController_1.MenuController.listMenuItems);
bot.hears("🛒 View Cart", auth_1.isValidUser, orderController_1.OrderController.viewCart);
// Help command
bot.command("help", async (ctx) => {
  var _a;
  const isAdminUser =
    ((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.username) ===
    process.env.ADMIN_USERNAME;
  let helpMessage = `
🔥 *TrapStr UFO Bot Commands* 🛸

Customer Commands:
/start - Start ordering
/menu - View available items
/cart - View your cart
/help - Show this help message

Use the buttons below the messages to:
• View menu
• Add items to cart
• Confirm or cancel order
`;
  if (isAdminUser) {
    helpMessage += `

Admin Commands:
/additem - Add new menu item
/toggle [itemId] - Toggle item availability
/delete [itemId] - Delete menu item
/intransit [orderId] - Mark order as in transit
/delivered [orderId] - Mark order as delivered

Media Management:
• Send photo or video with caption to add new item
• Use /menu to see item IDs
• Send media with "ID:[itemId]" to update an item
• You can have both photo and video for each item
`;
  }
  await ctx.reply(helpMessage, { parse_mode: "Markdown" });
});
// Launch bot and start server
Promise.all([
  bot.launch(),
  new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`Health check server is running on port ${port}`);
      resolve();
    });
  }),
])
  .then(() => {
    console.log("🚀 TrapStr UFO Bot is running");
  })
  .catch((error) => {
    console.error("Error starting services:", error);
    process.exit(1);
  });
// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
//# sourceMappingURL=index.js.map
