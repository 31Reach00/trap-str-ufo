import { OrderItem, MenuItem, Quantity } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Image handling
export const saveImage = async (
  imageBuffer: Buffer,
  originalName: string
): Promise<string> => {
  const ext = path.extname(originalName);
  const fileName = `${uuidv4()}${ext}`;
  const filePath = path.join(process.env.IMAGES_PATH || 'src/data/images', fileName);
  
  await fs.promises.writeFile(filePath, imageBuffer);
  return fileName;
};

export const deleteImage = async (fileName: string): Promise<void> => {
  const filePath = path.join(process.env.IMAGES_PATH || 'src/data/images', fileName);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
};

// Message formatting
export const formatMenuItem = (item: MenuItem): string => {
  const status = item.isAvailable ? '✅ Available' : '❌ Sold Out';
  const quantities = item.quantities
    .map((q, i) => `${i + 1}. ${q.amount} ($${q.price})`)
    .join('\n');

  return `
🏷 *${item.name}*
${item.description ? `📝 ${item.description}\n` : ''}
📊 *Quantities Available:*
${quantities}

${status}
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
    .join('\n');

  const total = calculateTotal(items);

  return `
🛍 *Order Summary*
${itemsList}

💰 *Total: $${total}*
`;
};

export const formatOrderStatus = (status: string): string => {
  const statusEmoji = {
    pending: '⏳',
    confirmed: '✅',
    'in-transit': '🚗',
    delivered: '🎉',
    cancelled: '❌',
  }[status] || '❓';

  return `${statusEmoji} Order ${status.toUpperCase()}`;
};

// Calculations
export const calculateTotal = (items: OrderItem[]): number => {
  return items.reduce(
    (total, item) => total + item.selectedQuantity.price * item.quantity,
    0
  );
};

// Keyboard helpers
export const createQuantityKeyboard = (quantities: Quantity[]): string[][] => {
  return quantities.map((q, i) => [`${i + 1}. ${q.amount} ($${q.price})`]);
};

export const parseQuantitySelection = (
  text: string,
  quantities: Quantity[]
): Quantity | null => {
  const match = text.match(/^(\d+)\./);
  if (match) {
    const index = parseInt(match[1]) - 1;
    return quantities[index] || null;
  }
  return null;
};

// Validation
export const isValidImageFile = (mimetype: string): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  return validTypes.includes(mimetype);
};

export const generateOrderId = (): string => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
};
