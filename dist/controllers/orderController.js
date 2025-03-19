"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const store_1 = require("../utils/store");
const helpers_1 = require("../utils/helpers");
const telegraf_1 = require("telegraf");
class OrderController {
  // Start new order
  static async startOrder(ctx) {
    var _a;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    await store_1.store.clearCart(chatId);
    await ctx.reply(
      "🔥 Welcome to TrapStr UFO! 🛸\n\nUse /menu to view available items and start your order.",
      telegraf_1.Markup.keyboard([
        ["📋 View Menu", "🛒 View Cart"],
        ["✅ Confirm Order", "❌ Cancel Order"],
      ]).resize()
    );
  }
  // Add item to cart
  static async addToCart(ctx) {
    var _a, _b;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    const itemId = (_b = ctx.match) === null || _b === void 0 ? void 0 : _b[1];
    if (!itemId) {
      await ctx.reply("❌ Invalid item selection");
      return;
    }
    try {
      const menuItem = await store_1.store.getMenuItem(itemId);
      if (!menuItem) {
        await ctx.reply("❌ Item not found");
        return;
      }
      if (!menuItem.isAvailable) {
        await ctx.reply("❌ Sorry, this item is currently sold out.");
        return;
      }
      // Create inline keyboard for quantity selection
      const inlineKeyboard = menuItem.quantities.map((q, i) => [
        telegraf_1.Markup.button.callback(`${q.amount} ($${q.price})`, `quantity_${itemId}_${i}`),
      ]);
      await ctx.reply(
        `🔥 Select quantity for ${menuItem.name}:`,
        telegraf_1.Markup.inlineKeyboard(inlineKeyboard)
      );
      // We'll handle the quantity selection in the action handler
    } catch (error) {
      console.error("Error adding to cart:", error);
      await ctx.reply("❌ Error adding item to cart. Please try again.");
    }
  }
  // Handle quantity selection from inline keyboard
  static async handleInlineQuantitySelection(ctx) {
    var _a, _b;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    try {
      // Parse the callback data: quantity_itemId_index
      const match =
        (_b = ctx.match) === null || _b === void 0 ? void 0 : _b[0].match(/^quantity_(\w+)_(\d+)$/);
      if (!match) {
        await ctx.answerCbQuery("❌ Invalid selection");
        return;
      }
      const [_, itemId, indexStr] = match;
      const index = parseInt(indexStr);
      const menuItem = await store_1.store.getMenuItem(itemId);
      if (!menuItem || !menuItem.quantities[index]) {
        await ctx.answerCbQuery("❌ Invalid selection");
        return;
      }
      const selectedQuantity = menuItem.quantities[index];
      // Get or create cart
      const cart = (await store_1.store.getCart(chatId)) || {
        chatId,
        items: [],
        lastUpdated: new Date(),
      };
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.menuItem.id === itemId && item.selectedQuantity.amount === selectedQuantity.amount
      );
      if (existingItemIndex >= 0) {
        // Increment quantity if item already exists
        cart.items[existingItemIndex].quantity += 1;
      } else {
        // Add new item to cart
        cart.items.push({
          menuItem,
          selectedQuantity,
          quantity: 1,
        });
      }
      await store_1.store.updateCart(chatId, cart);
      await ctx.answerCbQuery("✅ Added to cart!");
      await ctx.reply(
        `✅ Added to cart:\n${menuItem.name} - ${selectedQuantity.amount} ($${selectedQuantity.price})`,
        telegraf_1.Markup.keyboard([
          ["📋 View Menu", "🛒 View Cart"],
          ["✅ Confirm Order", "❌ Cancel Order"],
        ]).resize()
      );
    } catch (error) {
      console.error("Error handling quantity selection:", error);
      await ctx.answerCbQuery("❌ Error updating cart");
    }
  }
  // Handle quantity selection (legacy method for keyboard buttons)
  static async handleQuantitySelection(ctx) {
    var _a;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    try {
      const cart = await store_1.store.getCart(chatId);
      if (!cart || cart.items.length === 0) {
        await ctx.reply("❌ No active order. Use /menu to start ordering.");
        return;
      }
      const currentItem = cart.items[cart.items.length - 1];
      const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
      const selectedQuantity = (0, helpers_1.parseQuantitySelection)(
        text,
        currentItem.menuItem.quantities
      );
      if (!selectedQuantity) {
        await ctx.reply("❌ Invalid quantity selection. Please try again.");
        return;
      }
      currentItem.selectedQuantity = selectedQuantity;
      await store_1.store.updateCart(chatId, cart);
      await ctx.reply(
        `✅ Added to cart:\n${currentItem.menuItem.name} - ${selectedQuantity.amount} ($${selectedQuantity.price})`,
        telegraf_1.Markup.keyboard([
          ["📋 View Menu", "🛒 View Cart"],
          ["✅ Confirm Order", "❌ Cancel Order"],
        ]).resize()
      );
    } catch (error) {
      console.error("Error handling quantity selection:", error);
      await ctx.reply("❌ Error updating cart. Please try again.");
    }
  }
  // View cart
  static async viewCart(ctx) {
    var _a;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    try {
      const cart = await store_1.store.getCart(chatId);
      if (!cart || cart.items.length === 0) {
        await ctx.reply("🛒 Your cart is empty. Use /menu to view available items.");
        return;
      }
      // Create inline keyboard for cart items
      const inlineKeyboard = cart.items.map((item, index) => [
        telegraf_1.Markup.button.callback(
          `❌ Remove ${item.menuItem.name} (${item.selectedQuantity.amount})`,
          `remove_${index}`
        ),
      ]);
      await ctx.reply((0, helpers_1.formatOrder)(cart.items), {
        parse_mode: "Markdown",
        ...telegraf_1.Markup.inlineKeyboard([
          ...inlineKeyboard,
          [telegraf_1.Markup.button.callback("🗑️ Clear Cart", "clear_cart")],
        ]),
      });
      await ctx.reply(
        "What would you like to do next?",
        telegraf_1.Markup.keyboard([
          ["📋 View Menu", "🛒 View Cart"],
          ["✅ Confirm Order", "❌ Cancel Order"],
        ]).resize()
      );
    } catch (error) {
      console.error("Error viewing cart:", error);
      await ctx.reply("❌ Error retrieving cart. Please try again.");
    }
  }
  // Remove item from cart
  static async removeFromCart(ctx) {
    var _a, _b;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    try {
      const indexStr = (_b = ctx.match) === null || _b === void 0 ? void 0 : _b[1];
      if (!indexStr) {
        await ctx.answerCbQuery("❌ Invalid selection");
        return;
      }
      const index = parseInt(indexStr);
      const cart = await store_1.store.getCart(chatId);
      if (!cart || !cart.items[index]) {
        await ctx.answerCbQuery("❌ Item not found in cart");
        return;
      }
      const removedItem = cart.items[index];
      cart.items.splice(index, 1);
      await store_1.store.updateCart(chatId, cart);
      await ctx.answerCbQuery("✅ Item removed from cart");
      if (cart.items.length === 0) {
        await ctx.editMessageText("🛒 Your cart is now empty. Use /menu to view available items.");
      } else {
        // Update the cart view
        const inlineKeyboard = cart.items.map((item, idx) => [
          telegraf_1.Markup.button.callback(
            `❌ Remove ${item.menuItem.name} (${item.selectedQuantity.amount})`,
            `remove_${idx}`
          ),
        ]);
        await ctx.editMessageText((0, helpers_1.formatOrder)(cart.items), {
          parse_mode: "Markdown",
          ...telegraf_1.Markup.inlineKeyboard([
            ...inlineKeyboard,
            [telegraf_1.Markup.button.callback("🗑️ Clear Cart", "clear_cart")],
          ]),
        });
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
      await ctx.answerCbQuery("❌ Error updating cart");
    }
  }
  // Clear cart
  static async clearCart(ctx) {
    var _a;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    try {
      await store_1.store.clearCart(chatId);
      if ("answerCbQuery" in ctx) {
        await ctx.answerCbQuery("✅ Cart cleared");
        await ctx.editMessageText("🛒 Your cart is now empty. Use /menu to view available items.");
      } else {
        await ctx.reply("✅ Cart cleared. Use /menu to view available items.");
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      if ("answerCbQuery" in ctx) {
        await ctx.answerCbQuery("❌ Error clearing cart");
      } else {
        await ctx.reply("❌ Error clearing cart. Please try again.");
      }
    }
  }
  // Confirm order
  static async confirmOrder(ctx) {
    var _a, _b, _c, _d;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    const username = (_b = ctx.from) === null || _b === void 0 ? void 0 : _b.username;
    const name = [
      (_c = ctx.from) === null || _c === void 0 ? void 0 : _c.first_name,
      (_d = ctx.from) === null || _d === void 0 ? void 0 : _d.last_name,
    ]
      .filter(Boolean)
      .join(" ");
    if (!chatId || !username) {
      await ctx.reply("❌ Could not process order. Please try again.");
      return;
    }
    try {
      const cart = await store_1.store.getCart(chatId);
      if (!cart || cart.items.length === 0) {
        await ctx.reply("🛒 Your cart is empty. Use /menu to view available items.");
        return;
      }
      const order = {
        id: (0, helpers_1.generateOrderId)(),
        customerName: name,
        customerUsername: username,
        chatId,
        items: cart.items,
        status: "pending",
        totalAmount: cart.items.reduce(
          (total, item) => total + item.selectedQuantity.price * item.quantity,
          0
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await store_1.store.addOrder(order);
      await store_1.store.clearCart(chatId);
      // Notify customer
      await ctx.reply(
        `✅ Order confirmed!\n\nOrder ID: ${order.id}\n\n${(0, helpers_1.formatOrder)(
          order.items
        )}`,
        { parse_mode: "Markdown" }
      );
      // Notify admin
      const adminMessage = `
🔥 New Order! 🛸

From: @${username}
Name: ${name}

${(0, helpers_1.formatOrder)(order.items)}

Order ID: ${order.id}
`;
      if (process.env.ADMIN_CHAT_ID) {
        try {
          await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, {
            parse_mode: "Markdown",
            ...telegraf_1.Markup.inlineKeyboard([
              [
                telegraf_1.Markup.button.callback("✅ Accept", `accept_${order.id}`),
                telegraf_1.Markup.button.callback("❌ Reject", `reject_${order.id}`),
              ],
              [
                telegraf_1.Markup.button.callback("🚗 In Transit", `intransit_${order.id}`),
                telegraf_1.Markup.button.callback("🎉 Delivered", `delivered_${order.id}`),
              ],
            ]),
          });
        } catch (error) {
          console.error("Error notifying admin:", error);
        }
      }
    } catch (error) {
      console.error("Error confirming order:", error);
      await ctx.reply("❌ Error processing order. Please try again.");
    }
  }
  // Update order status
  static async updateOrderStatus(ctx) {
    var _a, _b;
    const orderId = (_a = ctx.match) === null || _a === void 0 ? void 0 : _a[1];
    const newStatus = (_b = ctx.match) === null || _b === void 0 ? void 0 : _b[2];
    if (!orderId || !newStatus) {
      await ctx.reply("❌ Invalid order update");
      return;
    }
    try {
      const order = await store_1.store.getOrder(orderId);
      if (!order) {
        await ctx.reply("❌ Order not found");
        return;
      }
      await store_1.store.updateOrderStatus(orderId, newStatus);
      // Notify customer
      try {
        await ctx.telegram.sendMessage(
          order.chatId,
          `${(0, helpers_1.formatOrderStatus)(newStatus)}\n\nOrder ID: ${order.id}`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Error notifying customer:", error);
      }
      if ("answerCbQuery" in ctx) {
        await ctx.answerCbQuery(`✅ Order status updated to: ${newStatus}`);
      } else {
        await ctx.reply(`✅ Order ${orderId} status updated to: ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      if ("answerCbQuery" in ctx) {
        await ctx.answerCbQuery("❌ Error updating order status");
      } else {
        await ctx.reply("❌ Error updating order status. Please try again.");
      }
    }
  }
  // Cancel order
  static async cancelOrder(ctx) {
    var _a;
    const chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
    if (!chatId) return;
    try {
      await store_1.store.clearCart(chatId);
      await ctx.reply(
        "❌ Order cancelled. Use /menu to start a new order.",
        telegraf_1.Markup.keyboard([["📋 View Menu"]]).resize()
      );
    } catch (error) {
      console.error("Error cancelling order:", error);
      await ctx.reply("❌ Error cancelling order. Please try again.");
    }
  }
}
exports.OrderController = OrderController;
//# sourceMappingURL=orderController.js.map
