import { Context, MatchContext } from '../types/context';
import { store } from '../utils/store';
import { OrderItem, Order } from '../types';
import { formatOrder, formatOrderStatus, generateOrderId, parseQuantitySelection } from '../utils/helpers';
import { Markup } from 'telegraf';

export class OrderController {
  // Start new order
  static async startOrder(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    store.clearCart(chatId);
    await ctx.reply(
      '🛍 Welcome to TrapStr UFO!\n\nUse /menu to view available items and start your order.',
      Markup.keyboard([
        ['📋 View Menu', '🛒 View Cart'],
        ['✅ Confirm Order', '❌ Cancel Order']
      ]).resize()
    );
  }

  // Add item to cart
  static async addToCart(ctx: MatchContext) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply('❌ Invalid item selection');
      return;
    }

    const menuItem = store.getMenuItem(itemId);
    if (!menuItem) {
      await ctx.reply('❌ Item not found');
      return;
    }

    if (!menuItem.isAvailable) {
      await ctx.reply('❌ Sorry, this item is currently sold out.');
      return;
    }

    // Show quantity options
    const keyboard = menuItem.quantities.map((q, i) => 
      [`${i + 1}. ${q.amount} ($${q.price})`]
    );

    await ctx.reply(
      `Select quantity for ${menuItem.name}:`,
      Markup.keyboard(keyboard).oneTime().resize()
    );

    // Store temporary state
    const cart = store.getCart(chatId) || {
      chatId,
      items: [],
      lastUpdated: new Date()
    };
    
    cart.items.push({
      menuItem,
      selectedQuantity: menuItem.quantities[0], // Will be updated when user selects
      quantity: 1
    });

    store.updateCart(chatId, cart);
  }

  // Handle quantity selection
  static async handleQuantitySelection(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const cart = store.getCart(chatId);
    if (!cart || cart.items.length === 0) {
      await ctx.reply('❌ No active order. Use /menu to start ordering.');
      return;
    }

    const currentItem = cart.items[cart.items.length - 1];
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    
    const selectedQuantity = parseQuantitySelection(text, currentItem.menuItem.quantities);
    if (!selectedQuantity) {
      await ctx.reply('❌ Invalid quantity selection. Please try again.');
      return;
    }

    currentItem.selectedQuantity = selectedQuantity;
    store.updateCart(chatId, cart);

    await ctx.reply(
      `✅ Added to cart:\n${currentItem.menuItem.name} - ${selectedQuantity.amount} ($${selectedQuantity.price})`,
      Markup.keyboard([
        ['📋 View Menu', '🛒 View Cart'],
        ['✅ Confirm Order', '❌ Cancel Order']
      ]).resize()
    );
  }

  // View cart
  static async viewCart(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const cart = store.getCart(chatId);
    if (!cart || cart.items.length === 0) {
      await ctx.reply('🛒 Your cart is empty. Use /menu to view available items.');
      return;
    }

    await ctx.reply(
      formatOrder(cart.items),
      { 
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          ['📋 View Menu', '🛒 View Cart'],
          ['✅ Confirm Order', '❌ Cancel Order']
        ]).resize()
      }
    );
  }

  // Confirm order
  static async confirmOrder(ctx: Context) {
    const chatId = ctx.chat?.id;
    const username = ctx.from?.username;
    const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ');

    if (!chatId || !username) {
      await ctx.reply('❌ Could not process order. Please try again.');
      return;
    }

    const cart = store.getCart(chatId);
    if (!cart || cart.items.length === 0) {
      await ctx.reply('🛒 Your cart is empty. Use /menu to view available items.');
      return;
    }

    const order: Order = {
      id: generateOrderId(),
      customerName: name,
      customerUsername: username,
      chatId,
      items: cart.items,
      status: 'pending',
      totalAmount: cart.items.reduce(
        (total, item) => total + item.selectedQuantity.price,
        0
      ),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    store.addOrder(order);
    store.clearCart(chatId);

    // Notify customer
    await ctx.reply(
      `✅ Order confirmed!\n\nOrder ID: ${order.id}\n\n${formatOrder(order.items)}`,
      { parse_mode: 'Markdown' }
    );

    // Notify admin
    const adminMessage = `
🆕 New Order!

From: @${username}
Name: ${name}

${formatOrder(order.items)}

Order ID: ${order.id}
`;

    if (process.env.ADMIN_CHAT_ID) {
      try {
        await ctx.telegram.sendMessage(
          process.env.ADMIN_CHAT_ID,
          adminMessage,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback('✅ Accept', `accept_${order.id}`),
                Markup.button.callback('❌ Reject', `reject_${order.id}`)
              ]
            ])
          }
        );
      } catch (error) {
        console.error('Error notifying admin:', error);
      }
    }
  }

  // Update order status
  static async updateOrderStatus(ctx: MatchContext) {
    const orderId = ctx.match?.[1];
    const newStatus = ctx.match?.[2] as Order['status'];

    if (!orderId || !newStatus) {
      await ctx.reply('❌ Invalid order update');
      return;
    }

    const order = store.getOrder(orderId);
    if (!order) {
      await ctx.reply('❌ Order not found');
      return;
    }

    store.updateOrderStatus(orderId, newStatus);

    // Notify customer
    try {
      await ctx.telegram.sendMessage(
        order.chatId,
        `${formatOrderStatus(newStatus)}\n\nOrder ID: ${order.id}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error notifying customer:', error);
    }

    await ctx.reply(`✅ Order ${orderId} status updated to: ${newStatus}`);
  }

  // Cancel order
  static async cancelOrder(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    store.clearCart(chatId);
    await ctx.reply(
      '❌ Order cancelled. Use /menu to start a new order.',
      Markup.keyboard([['📋 View Menu']]).resize()
    );
  }
}
