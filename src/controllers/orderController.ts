import { Context, MatchContext } from "../types/context";
import { store } from "../utils/store";
import { OrderItem, Order } from "../types";
import {
  formatOrder,
  formatOrderStatus,
  generateOrderId,
  parseQuantitySelection,
} from "../utils/helpers";
import { Markup } from "telegraf";

export class OrderController {
  // Start new order
  static async startOrder(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    await store.clearCart(chatId);
    await ctx.reply(
      "🔥 Welcome to TrapStr UFO! 🛸\n\nUse /menu to view available items and start your order.",
      Markup.keyboard([
        ["📋 View Menu", "🛒 View Cart"],
        ["✅ Confirm Order", "❌ Cancel Order"],
      ]).resize()
    );
  }

  // Add item to cart
  static async addToCart(ctx: MatchContext) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply("❌ Invalid item selection");
      return;
    }

    try {
      const menuItem = await store.getMenuItem(itemId);
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
        Markup.button.callback(`${q.amount} ($${q.price})`, `quantity_${itemId}_${i}`),
      ]);

      await ctx.reply(
        `🔥 Select quantity for ${menuItem.name}:`,
        Markup.inlineKeyboard(inlineKeyboard)
      );

      // We'll handle the quantity selection in the action handler
    } catch (error) {
      console.error("Error adding to cart:", error);
      await ctx.reply("❌ Error adding item to cart. Please try again.");
    }
  }

  // Handle quantity selection from inline keyboard
  static async handleInlineQuantitySelection(ctx: MatchContext) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      // Parse the callback data: quantity_itemId_index
      const match = ctx.match?.[0].match(/^quantity_(\w+)_(\d+)$/);
      if (!match) {
        await ctx.answerCbQuery("❌ Invalid selection");
        return;
      }

      const [_, itemId, indexStr] = match;
      const index = parseInt(indexStr);

      const menuItem = await store.getMenuItem(itemId);
      if (!menuItem || !menuItem.quantities[index]) {
        await ctx.answerCbQuery("❌ Invalid selection");
        return;
      }

      const selectedQuantity = menuItem.quantities[index];

      // Get or create cart
      const cart = (await store.getCart(chatId)) || {
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

      await store.updateCart(chatId, cart);

      await ctx.answerCbQuery("✅ Added to cart!");
      await ctx.reply(
        `✅ Added to cart:\n${menuItem.name} - ${selectedQuantity.amount} ($${selectedQuantity.price})`,
        Markup.keyboard([
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
  static async handleQuantitySelection(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      const cart = await store.getCart(chatId);
      if (!cart || cart.items.length === 0) {
        await ctx.reply("❌ No active order. Use /menu to start ordering.");
        return;
      }

      const currentItem = cart.items[cart.items.length - 1];
      const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";

      const selectedQuantity = parseQuantitySelection(text, currentItem.menuItem.quantities);
      if (!selectedQuantity) {
        await ctx.reply("❌ Invalid quantity selection. Please try again.");
        return;
      }

      currentItem.selectedQuantity = selectedQuantity;
      await store.updateCart(chatId, cart);

      await ctx.reply(
        `✅ Added to cart:\n${currentItem.menuItem.name} - ${selectedQuantity.amount} ($${selectedQuantity.price})`,
        Markup.keyboard([
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
  static async viewCart(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      const cart = await store.getCart(chatId);
      if (!cart || cart.items.length === 0) {
        await ctx.reply("🛒 Your cart is empty. Use /menu to view available items.");
        return;
      }

      // Create inline keyboard for cart items
      const inlineKeyboard = cart.items.map((item, index) => [
        Markup.button.callback(
          `❌ Remove ${item.menuItem.name} (${item.selectedQuantity.amount})`,
          `remove_${index}`
        ),
      ]);

      await ctx.reply(formatOrder(cart.items), {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          ...inlineKeyboard,
          [Markup.button.callback("🗑️ Clear Cart", "clear_cart")],
        ]),
      });

      await ctx.reply(
        "What would you like to do next?",
        Markup.keyboard([
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
  static async removeFromCart(ctx: MatchContext) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      const indexStr = ctx.match?.[1];
      if (!indexStr) {
        await ctx.answerCbQuery("❌ Invalid selection");
        return;
      }

      const index = parseInt(indexStr);
      const cart = await store.getCart(chatId);

      if (!cart || !cart.items[index]) {
        await ctx.answerCbQuery("❌ Item not found in cart");
        return;
      }

      const removedItem = cart.items[index];
      cart.items.splice(index, 1);
      await store.updateCart(chatId, cart);

      await ctx.answerCbQuery("✅ Item removed from cart");

      if (cart.items.length === 0) {
        await ctx.editMessageText("🛒 Your cart is now empty. Use /menu to view available items.");
      } else {
        // Update the cart view
        const inlineKeyboard = cart.items.map((item, idx) => [
          Markup.button.callback(
            `❌ Remove ${item.menuItem.name} (${item.selectedQuantity.amount})`,
            `remove_${idx}`
          ),
        ]);

        await ctx.editMessageText(formatOrder(cart.items), {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...inlineKeyboard,
            [Markup.button.callback("🗑️ Clear Cart", "clear_cart")],
          ]),
        });
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
      await ctx.answerCbQuery("❌ Error updating cart");
    }
  }

  // Clear cart
  static async clearCart(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      await store.clearCart(chatId);

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
  static async confirmOrder(ctx: Context) {
    const chatId = ctx.chat?.id;
    const username = ctx.from?.username;
    const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ");

    if (!chatId || !username) {
      await ctx.reply("❌ Could not process order. Please try again.");
      return;
    }

    try {
      const cart = await store.getCart(chatId);
      if (!cart || cart.items.length === 0) {
        await ctx.reply("🛒 Your cart is empty. Use /menu to view available items.");
        return;
      }

      const order: Order = {
        id: generateOrderId(),
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

      await store.addOrder(order);
      await store.clearCart(chatId);

      // Notify customer
      await ctx.reply(
        `✅ Order confirmed!\n\nOrder ID: ${order.id}\n\n${formatOrder(order.items)}`,
        { parse_mode: "Markdown" }
      );

      // Notify admin
      const adminMessage = `
🔥 New Order! 🛸

From: @${username}
Name: ${name}

${formatOrder(order.items)}

Order ID: ${order.id}
`;

      if (process.env.ADMIN_CHAT_ID) {
        try {
          await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback("✅ Accept", `accept_${order.id}`),
                Markup.button.callback("❌ Reject", `reject_${order.id}`),
              ],
              [
                Markup.button.callback("🚗 In Transit", `intransit_${order.id}`),
                Markup.button.callback("🎉 Delivered", `delivered_${order.id}`),
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
  static async updateOrderStatus(ctx: MatchContext) {
    const orderId = ctx.match?.[1];
    const newStatus = ctx.match?.[2] as Order["status"];

    if (!orderId || !newStatus) {
      await ctx.reply("❌ Invalid order update");
      return;
    }

    try {
      const order = await store.getOrder(orderId);
      if (!order) {
        await ctx.reply("❌ Order not found");
        return;
      }

      await store.updateOrderStatus(orderId, newStatus);

      // Notify customer
      try {
        await ctx.telegram.sendMessage(
          order.chatId,
          `${formatOrderStatus(newStatus)}\n\nOrder ID: ${order.id}`,
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
  static async cancelOrder(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      await store.clearCart(chatId);
      await ctx.reply(
        "❌ Order cancelled. Use /menu to start a new order.",
        Markup.keyboard([["📋 View Menu"]]).resize()
      );
    } catch (error) {
      console.error("Error cancelling order:", error);
      await ctx.reply("❌ Error cancelling order. Please try again.");
    }
  }
}
