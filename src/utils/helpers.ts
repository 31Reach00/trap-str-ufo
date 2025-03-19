import { OrderItem, MenuItem, Quantity } from "../types";
import { v4 as uuidv4 } from "uuid";
import * as firebase from "./firebase";

// Media handling
export const saveMedia = async (fileId: string, type: "image" | "video"): Promise<string> => {
  // Just store the Telegram file ID
  return fileId;
};

export const deleteMedia = async (fileId: string): Promise<void> => {
  // No need to delete anything from Telegram
  return;
};

// Message formatting
export const formatMenuItem = (item: MenuItem): string => {
  const status = item.isAvailable ? "✅ Available" : "❌ Sold Out";
  const quantities = item.quantities
    .map((q, i) => `${i + 1}. ${q.amount} ($${q.price})`)
    .join("\n");

  return `
🔥 *${item.name}* 🔥
${item.description ? `📝 ${item.description}\n` : ""}
📊 *Quantities Available:*
${quantities}

${status}
${item.videoUrl ? "🎥 Video preview available" : ""}
`;
};

export const formatOrder = (items: OrderItem[]): string => {
  const itemsList = items
    .map(
      (item) =>
        `• ${item.menuItem.name}\n  ${item.selectedQuantity.amount} x${item.quantity} = $${
          item.selectedQuantity.price * item.quantity
        }`
    )
    .join("\n");

  const total = calculateTotal(items);

  return `
🛒 *Order Summary* 🛒
${itemsList}

💰 *Total: $${total}*
`;
};

export const formatOrderStatus = (status: string): string => {
  const statusEmoji =
    {
      pending: "⏳",
      confirmed: "✅",
      "in-transit": "🚗",
      delivered: "🎉",
      cancelled: "❌",
    }[status] || "❓";

  return `${statusEmoji} Order ${status.toUpperCase()} ${statusEmoji}`;
};

// Calculations
export const calculateTotal = (items: OrderItem[]): number => {
  return items.reduce((total, item) => total + item.selectedQuantity.price * item.quantity, 0);
};

// Keyboard helpers
export const createQuantityKeyboard = (quantities: Quantity[]): string[][] => {
  return quantities.map((q, i) => [`${i + 1}. ${q.amount} ($${q.price})`]);
};

export const parseQuantitySelection = (text: string, quantities: Quantity[]): Quantity | null => {
  const match = text.match(/^(\d+)\./);
  if (match) {
    const index = parseInt(match[1]) - 1;
    return quantities[index] || null;
  }
  return null;
};

// Validation
export const isValidImageFile = (mimetype: string): boolean => {
  const validTypes = ["image/jpeg", "image/png", "image/gif"];
  return validTypes.includes(mimetype);
};

export const isValidVideoFile = (mimetype: string): boolean => {
  const validTypes = ["video/mp4", "video/quicktime"];
  return validTypes.includes(mimetype);
};

export const generateOrderId = (): string => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
};
