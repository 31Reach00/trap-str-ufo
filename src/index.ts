import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import { MenuController } from './controllers/menuController';
import { OrderController } from './controllers/orderController';
import { isAdmin, isValidUser, handleError, rateLimit } from './middleware/auth';
import { Message } from 'telegraf/types';
import { Context, createMatchContext } from './types/context';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided in environment variables');
}

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware
bot.use(rateLimit);

// Error handling
bot.catch(handleError);

// Start command
bot.command('start', isValidUser, OrderController.startOrder);

// Admin commands
bot.command('additem', isAdmin, (ctx) => {
  ctx.reply(
    '📸 Send a photo with caption in the format:\nName\nDescription\nQuantity1 (price)\nQuantity2 (price)...\n\nExample:\nPremium Flower\nTop shelf indoor\n2g (15)\n1/8 (25)\n1/4 (45)\n1/2 (80)\n⚡️ (145)'
  );
});

// Handle photo messages for adding/updating items (admin only)
bot.on('photo', isAdmin, async (ctx) => {
  const caption = (ctx.message as Message.PhotoMessage).caption || '';
  
  // If caption contains an item ID, it's an update
  const itemIdMatch = caption.match(/^ID:(\w+)/);
  if (itemIdMatch) {
    await MenuController.updateMenuItem(
      createMatchContext(ctx, [itemIdMatch[0], itemIdMatch[1]])
    );
  } else {
    await MenuController.addMenuItem(ctx);
  }
});

// Menu commands
bot.command('menu', isValidUser, MenuController.listMenuItems);
bot.command(['cart', 'viewcart'], isValidUser, OrderController.viewCart);

// Order management
bot.action(/^add_(\w+)$/, isValidUser, OrderController.addToCart);
bot.action(/^remove_(\w+)$/, isValidUser, async (ctx) => {
  // Handle item removal from cart
  await ctx.answerCbQuery('Item removed from cart');
});

// Handle quantity selection
bot.hears(/^\d+\..+\(\$\d+\)$/, isValidUser, OrderController.handleQuantitySelection);

// Order confirmation and cancellation
bot.hears('✅ Confirm Order', isValidUser, OrderController.confirmOrder);
bot.hears('❌ Cancel Order', isValidUser, OrderController.cancelOrder);

// Admin order management
bot.action(/^accept_(\w+)$/, isAdmin, async (ctx) => {
  const match = ctx.match?.[1];
  if (match) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['', match, 'confirmed'])
    );
  }
  await ctx.answerCbQuery('Order accepted');
});

bot.action(/^reject_(\w+)$/, isAdmin, async (ctx) => {
  const match = ctx.match?.[1];
  if (match) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['', match, 'cancelled'])
    );
  }
  await ctx.answerCbQuery('Order rejected');
});

// Order status updates
bot.command('intransit', isAdmin, async (ctx) => {
  const orderId = ctx.message.text.split(' ')[1];
  if (orderId) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['', orderId, 'in-transit'])
    );
  }
});

bot.command('delivered', isAdmin, async (ctx) => {
  const orderId = ctx.message.text.split(' ')[1];
  if (orderId) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['', orderId, 'delivered'])
    );
  }
});

// Item availability toggle
bot.command('toggle', isAdmin, async (ctx) => {
  const itemId = ctx.message.text.split(' ')[1];
  if (itemId) {
    await MenuController.toggleAvailability(
      createMatchContext(ctx, ['', itemId])
    );
  }
});

// Delete item
bot.command('delete', isAdmin, async (ctx) => {
  const itemId = ctx.message.text.split(' ')[1];
  if (itemId) {
    await MenuController.deleteMenuItem(
      createMatchContext(ctx, ['', itemId])
    );
  }
});

// Common text commands
bot.hears('📋 View Menu', isValidUser, MenuController.listMenuItems);
bot.hears('🛒 View Cart', isValidUser, OrderController.viewCart);

// Help command
bot.command('help', async (ctx) => {
  const isAdminUser = ctx.from?.username === process.env.ADMIN_USERNAME;
  
  let helpMessage = `
🛍 *TrapStr UFO Bot Commands*

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

To update an item, send a photo with caption starting with "ID:[itemId]" followed by the new details.
`;
  }

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Launch bot
bot.launch().then(() => {
  console.log('🚀 TrapStr UFO Bot is running');
}).catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
