import { Context, MatchContext } from '../types/context';
import { Message } from 'telegraf/types';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../utils/store';
import { MenuItem, Quantity } from '../types';
import { saveImage, deleteImage, formatMenuItem, createQuantityKeyboard } from '../utils/helpers';

export class MenuController {
  // Add new menu item
  static async addMenuItem(ctx: Context) {
    try {
      const photo = (ctx.message as Message.PhotoMessage).photo;
      const caption = (ctx.message as Message.PhotoMessage).caption;

      if (!photo || !caption) {
        await ctx.reply('❌ Please send a photo with caption in the format:\nName\nDescription\nQuantity1 (price)\nQuantity2 (price)...');
        return;
      }

      const lines = caption.split('\n');
      if (lines.length < 3) {
        await ctx.reply('❌ Invalid format. Please include name, description, and at least one quantity option.');
        return;
      }

      const name = lines[0];
      const description = lines[1];
      const quantities: Quantity[] = [];

      // Parse quantities and prices
      for (let i = 2; i < lines.length; i++) {
        const match = lines[i].match(/(.+?)\s*\((\d+)\)/);
        if (match) {
          quantities.push({
            label: `Option ${i-1}`,
            amount: match[1].trim(),
            price: parseInt(match[2])
          });
        }
      }

      if (quantities.length === 0) {
        await ctx.reply('❌ No valid quantity options found.');
        return;
      }

      // Get the largest photo (best quality)
      const fileId = photo[photo.length - 1].file_id;
      const file = await ctx.telegram.getFile(fileId);
      const filePath = file.file_path;

      if (!filePath) {
        await ctx.reply('❌ Error accessing photo.');
        return;
      }

      // Download and save image
      const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const fileName = await saveImage(buffer, 'menu-item.jpg');

      const menuItem: MenuItem = {
        id: uuidv4(),
        name,
        description,
        imageUrl: fileName,
        quantities,
        isAvailable: true,
        updatedAt: new Date()
      };

      store.addMenuItem(menuItem);

      await ctx.reply('✅ Menu item added successfully!');
      await ctx.reply(formatMenuItem(menuItem), { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error adding menu item:', error);
      await ctx.reply('❌ Error adding menu item. Please try again.');
    }
  }

  // List all menu items
  static async listMenuItems(ctx: Context) {
    const items = store.getAllMenuItems();
    
    if (items.length === 0) {
      await ctx.reply('📝 Menu is empty. Add items using /additem');
      return;
    }

    for (const item of items) {
      try {
        // Send photo with formatted caption
        await ctx.replyWithPhoto(
          { source: `${process.env.IMAGES_PATH}/${item.imageUrl}` },
          {
            caption: formatMenuItem(item),
            parse_mode: 'Markdown'
          }
        );
      } catch (error) {
        console.error(`Error sending menu item ${item.id}:`, error);
        // Send text-only version if image fails
        await ctx.reply(formatMenuItem(item), { parse_mode: 'Markdown' });
      }
    }
  }

  // Toggle item availability
  static async toggleAvailability(ctx: MatchContext) {
    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply('❌ Invalid item ID');
      return;
    }

    const isAvailable = store.toggleItemAvailability(itemId);
    const item = store.getMenuItem(itemId);

    if (!item) {
      await ctx.reply('❌ Item not found');
      return;
    }

    await ctx.reply(
      `${item.name} is now ${isAvailable ? '✅ Available' : '❌ Sold Out'}`
    );
  }

  // Delete menu item
  static async deleteMenuItem(ctx: MatchContext) {
    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply('❌ Invalid item ID');
      return;
    }

    const item = store.getMenuItem(itemId);
    if (!item) {
      await ctx.reply('❌ Item not found');
      return;
    }

    try {
      await deleteImage(item.imageUrl);
      store.deleteMenuItem(itemId);
      await ctx.reply(`✅ Deleted: ${item.name}`);
    } catch (error) {
      console.error('Error deleting menu item:', error);
      await ctx.reply('❌ Error deleting item. Please try again.');
    }
  }

  // Update menu item
  static async updateMenuItem(ctx: MatchContext) {
    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply('❌ Invalid item ID');
      return;
    }

    const item = store.getMenuItem(itemId);
    if (!item) {
      await ctx.reply('❌ Item not found');
      return;
    }

    try {
      const message = ctx.message as Message.PhotoMessage;
      const photo = message.photo;
      const caption = message.caption;

      if (photo) {
        // Update image
        const fileId = photo[photo.length - 1].file_id;
        const file = await ctx.telegram.getFile(fileId);
        const filePath = file.file_path;

        if (filePath) {
          // Delete old image
          await deleteImage(item.imageUrl);

          // Save new image
          const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
          const response = await fetch(imageUrl);
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileName = await saveImage(buffer, 'menu-item.jpg');

          item.imageUrl = fileName;
        }
      }

      if (caption) {
        const lines = caption.split('\n');
        if (lines.length >= 1) item.name = lines[0];
        if (lines.length >= 2) item.description = lines[1];
        
        if (lines.length > 2) {
          const quantities: Quantity[] = [];
          for (let i = 2; i < lines.length; i++) {
            const match = lines[i].match(/(.+?)\s*\((\d+)\)/);
            if (match) {
              quantities.push({
                label: `Option ${i-1}`,
                amount: match[1].trim(),
                price: parseInt(match[2])
              });
            }
          }
          if (quantities.length > 0) {
            item.quantities = quantities;
          }
        }
      }

      item.updatedAt = new Date();
      store.updateMenuItem(item.id, item);

      await ctx.reply('✅ Item updated successfully!');
      await ctx.reply(formatMenuItem(item), { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error updating menu item:', error);
      await ctx.reply('❌ Error updating item. Please try again.');
    }
  }
}
