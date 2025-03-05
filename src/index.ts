import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { MenuController } from './controllers/menuController';
import { OrderController } from './controllers/orderController';
import { isAdmin, isValidUser, handleError, rateLimit } from './middleware/auth';
import { Message } from 'telegraf/types';
import { Context, createMatchContext, isPhotoMessage, isVideoMessage } from './types/context';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided in environment variables');
}

// Initialize express app for health checks
const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

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
    '📸 Send a photo or video with caption in the format:\n\n' +
    'Name\n' +
    'Description\n' +
    'Quantity1 (price)\n' +
    'Quantity2 (price)...\n\n' +
    'Example:\n' +
    'Premium Flower\n' +
    'Top shelf indoor\n' +
    '2g (15)\n' +
    '1/8 (25)\n' +
    '1/4 (45)\n' +
    '1/2 (80)\n' +
    '⚡️ (145)\n\n' +
    '💡 Tips:\n' +
    '• You can start with either photo or video\n' +
    '• To add both, send second media with "ID:[item-id]" in caption\n' +
    '• Use /menu to see item IDs\n' +
    '• Videos should be short previews (under 50MB)'
  );
});

// Handle photo messages for adding/updating items (admin only)
bot.on('photo', isAdmin, async (ctx) => {
  if (!isPhotoMessage(ctx)) return;

  const caption = ctx.message.caption || '';
  
  // If caption contains an item ID, it's an update
  const itemIdMatch = caption.match(/^ID:(\w+)/);
  if (itemIdMatch) {
    await MenuController.updateMenuItem(createMatchContext(ctx, [itemIdMatch[0], itemIdMatch[1]]));
  } else {
    await MenuController.addMenuItem(ctx);
  }
});

// Handle video messages for adding/updating items (admin only)
bot.on('video', isAdmin, async (ctx) => {
  if (!isVideoMessage(ctx)) return;

  const caption = ctx.message.caption || '';
  
  // If caption contains an item ID, it's an update
  const itemIdMatch = caption.match(/^ID:(\w+)/);
  if (itemIdMatch) {
    await MenuController.updateMenuItem(createMatchContext(ctx, [itemIdMatch[0], itemIdMatch[1]]));
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
      createMatchContext(ctx, ['accept', match, 'confirmed'])
    );
  }
  await ctx.answerCbQuery('Order accepted');
});

bot.action(/^reject_(\w+)$/, isAdmin, async (ctx) => {
  const match = ctx.match?.[1];
  if (match) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['reject', match, 'cancelled'])
    );
  }
  await ctx.answerCbQuery('Order rejected');
});

// Order status updates
bot.command('intransit', isAdmin, async (ctx) => {
  const orderId = ctx.message.text.split(' ')[1];
  if (orderId) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['intransit', orderId, 'in-transit'])
    );
  }
});

bot.command('delivered', isAdmin, async (ctx) => {
  const orderId = ctx.message.text.split(' ')[1];
  if (orderId) {
    await OrderController.updateOrderStatus(
      createMatchContext(ctx, ['delivered', orderId, 'delivered'])
    );
  }
});

// Item availability toggle
bot.command('toggle', isAdmin, async (ctx) => {
  const itemId = ctx.message.text.split(' ')[1];
  if (itemId) {
    await MenuController.toggleAvailability(
      createMatchContext(ctx, ['toggle', itemId])
    );
  }
});

// Delete item
bot.command('delete', isAdmin, async (ctx) => {
  const itemId = ctx.message.text.split(' ')[1];
  if (itemId) {
    await MenuController.deleteMenuItem(
      createMatchContext(ctx, ['delete', itemId])
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

Media Management:
• Send photo or video with caption to add new item
• Use /menu to see item IDs
• Send media with "ID:[itemId]" to update an item
• You can have both photo and video for each item
`;
  }

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Launch bot and start server
Promise.all([
  bot.launch(),
  new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Health check server is running on port ${port}`);
      resolve();
    });
  }),
]).then(() => {
  console.log('🚀 TrapStr UFO Bot is running');
}).catch((error) => {
  console.error('Error starting services:', error);
  process.exit(1);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
