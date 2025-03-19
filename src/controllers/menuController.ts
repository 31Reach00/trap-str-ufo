import { Context, MatchContext } from "../types/context";
import { Message } from "telegraf/types";
import { Markup } from "telegraf";
import { v4 as uuidv4 } from "uuid";
import { store } from "../utils/store";
import { MenuItem, Quantity } from "../types";
import {
  saveMedia,
  deleteMedia,
  formatMenuItem,
  createQuantityKeyboard,
  isValidImageFile,
  isValidVideoFile,
} from "../utils/helpers";
import fetch from "node-fetch";

export class MenuController {
  // Add new menu item
  static async addMenuItem(ctx: Context) {
    try {
      const message = ctx.message as Message.PhotoMessage | Message.VideoMessage;
      const photo = "photo" in message ? message.photo : undefined;
      const video = "video" in message ? message.video : undefined;
      const caption = message.caption;

      if ((!photo && !video) || !caption) {
        await ctx.reply(
          "❌ Please send a photo or video with caption in the format:\nName\nDescription\nQuantity1 (price)\nQuantity2 (price)..."
        );
        return;
      }

      const lines = caption.split("\n");
      if (lines.length < 3) {
        await ctx.reply(
          "❌ Invalid format. Please include name, description, and at least one quantity option."
        );
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
            label: `Option ${i - 1}`,
            amount: match[1].trim(),
            price: parseInt(match[2]),
          });
        }
      }

      if (quantities.length === 0) {
        await ctx.reply("❌ No valid quantity options found.");
        return;
      }

      let imageUrl = "";
      let videoUrl = "";

      // Handle photo - store the file ID directly
      if (photo) {
        const fileId = photo[photo.length - 1].file_id;
        imageUrl = await saveMedia(fileId, "image");
      }

      // Handle video - store the file ID directly
      if (video) {
        const fileId = video.file_id;
        videoUrl = await saveMedia(fileId, "video");
      }

      const menuItem: MenuItem = {
        id: uuidv4(),
        name,
        description,
        imageUrl,
        videoUrl,
        quantities,
        isAvailable: true,
        updatedAt: new Date(),
      };

      await store.addMenuItem(menuItem);

      await ctx.reply(
        "✅ Menu item added successfully!\n\n" +
          `Item ID: ${menuItem.id}\n` +
          "Use this ID to add/update media later."
      );
      await ctx.reply(formatMenuItem(menuItem), { parse_mode: "Markdown" });

      // Send media preview
      if (imageUrl) {
        await ctx.replyWithPhoto(imageUrl);
      }
      if (videoUrl) {
        await ctx.replyWithVideo(videoUrl);
      }
    } catch (error) {
      console.error("Error adding menu item:", error);
      await ctx.reply("❌ Error adding menu item. Please try again.");
    }
  }

  // List all menu items
  static async listMenuItems(ctx: Context) {
    try {
      const items = await store.getAllMenuItems();

      if (items.length === 0) {
        await ctx.reply("📝 Menu is empty. Add items using /additem");
        return;
      }

      for (const item of items) {
        try {
          // Send formatted message with ID for admin
          const isAdmin = ctx.from?.username === process.env.ADMIN_USERNAME;
          const message = isAdmin
            ? `${formatMenuItem(item)}\nItem ID: ${item.id}`
            : formatMenuItem(item);

          // Create appropriate buttons based on user type
          let buttons;
          if (isAdmin) {
            // Admin buttons with availability toggle and delete options
            const availabilityText = item.isAvailable ? "❌ Mark Unavailable" : "✅ Mark Available";
            buttons = Markup.inlineKeyboard([
              [Markup.button.callback(availabilityText, `toggle_${item.id}`)],
              [Markup.button.callback("🗑️ Delete Item", `delete_${item.id}`)],
            ]);
          } else {
            // Customer buttons with add to cart option
            buttons = Markup.inlineKeyboard([
              [Markup.button.callback("🛒 Add to Cart", `add_${item.id}`)],
            ]);
          }

          await ctx.reply(message, {
            parse_mode: "Markdown",
            ...buttons,
          });

          // Send media
          if (item.imageUrl) {
            await ctx.replyWithPhoto(item.imageUrl);
          }
          if (item.videoUrl) {
            await ctx.replyWithVideo(item.videoUrl);
          }
        } catch (error) {
          console.error(`Error sending menu item ${item.id}:`, error);
          await ctx.reply(formatMenuItem(item), { parse_mode: "Markdown" });
        }
      }
    } catch (error) {
      console.error("Error listing menu items:", error);
      await ctx.reply("❌ Error retrieving menu items. Please try again.");
    }
  }

  // Toggle item availability
  static async toggleAvailability(ctx: MatchContext) {
    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply("❌ Invalid item ID");
      return;
    }

    try {
      const isAvailable = await store.toggleItemAvailability(itemId);
      const item = await store.getMenuItem(itemId);

      if (!item) {
        await ctx.reply("❌ Item not found");
        return;
      }

      await ctx.reply(`${item.name} is now ${isAvailable ? "✅ Available" : "❌ Sold Out"}`);
    } catch (error) {
      console.error("Error toggling item availability:", error);
      await ctx.reply("❌ Error updating item availability. Please try again.");
    }
  }

  // Delete menu item
  static async deleteMenuItem(ctx: MatchContext) {
    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply("❌ Invalid item ID");
      return;
    }

    try {
      const item = await store.getMenuItem(itemId);
      if (!item) {
        await ctx.reply("❌ Item not found");
        return;
      }

      if (item.imageUrl) {
        await deleteMedia(item.imageUrl);
      }
      if (item.videoUrl) {
        await deleteMedia(item.videoUrl);
      }
      await store.deleteMenuItem(itemId);
      await ctx.reply(`✅ Deleted: ${item.name}`);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      await ctx.reply("❌ Error deleting item. Please try again.");
    }
  }

  // Update menu item
  static async updateMenuItem(ctx: MatchContext) {
    const itemId = ctx.match?.[1];
    if (!itemId) {
      await ctx.reply("❌ Invalid item ID");
      return;
    }

    try {
      const item = await store.getMenuItem(itemId);
      if (!item) {
        await ctx.reply("❌ Item not found");
        return;
      }

      const message = ctx.message as Message.PhotoMessage | Message.VideoMessage;
      const photo = "photo" in message ? message.photo : undefined;
      const video = "video" in message ? message.video : undefined;
      const caption = message.caption;

      const updates: Partial<MenuItem> = {};

      if (photo) {
        // Update image - store the file ID directly
        const fileId = photo[photo.length - 1].file_id;

        // Delete old image if it exists (no-op with Telegram file IDs)
        if (item.imageUrl) {
          await deleteMedia(item.imageUrl);
        }

        // Save new image file ID
        updates.imageUrl = await saveMedia(fileId, "image");
      }

      if (video) {
        // Update video - store the file ID directly
        const fileId = video.file_id;

        // Delete old video if it exists (no-op with Telegram file IDs)
        if (item.videoUrl) {
          await deleteMedia(item.videoUrl);
        }

        // Save new video file ID
        updates.videoUrl = await saveMedia(fileId, "video");
      }

      if (caption && !caption.startsWith("ID:")) {
        const lines = caption.split("\n");
        if (lines.length >= 1) updates.name = lines[0];
        if (lines.length >= 2) updates.description = lines[1];

        if (lines.length > 2) {
          const quantities: Quantity[] = [];
          for (let i = 2; i < lines.length; i++) {
            const match = lines[i].match(/(.+?)\s*\((\d+)\)/);
            if (match) {
              quantities.push({
                label: `Option ${i - 1}`,
                amount: match[1].trim(),
                price: parseInt(match[2]),
              });
            }
          }
          if (quantities.length > 0) {
            updates.quantities = quantities;
          }
        }
      }

      updates.updatedAt = new Date();
      await store.updateMenuItem(item.id, updates);

      // Get the updated item
      const updatedItem = await store.getMenuItem(item.id);
      if (!updatedItem) {
        await ctx.reply("❌ Error retrieving updated item");
        return;
      }

      await ctx.reply("✅ Item updated successfully!");
      await ctx.reply(formatMenuItem(updatedItem), { parse_mode: "Markdown" });

      // Send updated media preview
      if (updatedItem.imageUrl) {
        await ctx.replyWithPhoto(updatedItem.imageUrl);
      }
      if (updatedItem.videoUrl) {
        await ctx.replyWithVideo(updatedItem.videoUrl);
      }
    } catch (error) {
      console.error("Error updating menu item:", error);
      await ctx.reply("❌ Error updating item. Please try again.");
    }
  }
}
