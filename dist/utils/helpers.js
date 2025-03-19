"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderId =
  exports.isValidVideoFile =
  exports.isValidImageFile =
  exports.parseQuantitySelection =
  exports.createQuantityKeyboard =
  exports.calculateTotal =
  exports.formatOrderStatus =
  exports.formatOrder =
  exports.formatMenuItem =
  exports.deleteMedia =
  exports.saveMedia =
    void 0;
// Media handling
const saveMedia = async (fileId, type) => {
  // Just store the Telegram file ID
  return fileId;
};
exports.saveMedia = saveMedia;
const deleteMedia = async (fileId) => {
  // No need to delete anything from Telegram
  return;
};
exports.deleteMedia = deleteMedia;
// Message formatting
const formatMenuItem = (item) => {
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
exports.formatMenuItem = formatMenuItem;
const formatOrder = (items) => {
  const itemsList = items
    .map(
      (item) =>
        `• ${item.menuItem.name}\n  ${item.selectedQuantity.amount} x${item.quantity} = $${
          item.selectedQuantity.price * item.quantity
        }`
    )
    .join("\n");
  const total = (0, exports.calculateTotal)(items);
  return `
🛒 *Order Summary* 🛒
${itemsList}

💰 *Total: $${total}*
`;
};
exports.formatOrder = formatOrder;
const formatOrderStatus = (status) => {
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
exports.formatOrderStatus = formatOrderStatus;
// Calculations
const calculateTotal = (items) => {
  return items.reduce((total, item) => total + item.selectedQuantity.price * item.quantity, 0);
};
exports.calculateTotal = calculateTotal;
// Keyboard helpers
const createQuantityKeyboard = (quantities) => {
  return quantities.map((q, i) => [`${i + 1}. ${q.amount} ($${q.price})`]);
};
exports.createQuantityKeyboard = createQuantityKeyboard;
const parseQuantitySelection = (text, quantities) => {
  const match = text.match(/^(\d+)\./);
  if (match) {
    const index = parseInt(match[1]) - 1;
    return quantities[index] || null;
  }
  return null;
};
exports.parseQuantitySelection = parseQuantitySelection;
// Validation
const isValidImageFile = (mimetype) => {
  const validTypes = ["image/jpeg", "image/png", "image/gif"];
  return validTypes.includes(mimetype);
};
exports.isValidImageFile = isValidImageFile;
const isValidVideoFile = (mimetype) => {
  const validTypes = ["video/mp4", "video/quicktime"];
  return validTypes.includes(mimetype);
};
exports.isValidVideoFile = isValidVideoFile;
const generateOrderId = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
};
exports.generateOrderId = generateOrderId;
//# sourceMappingURL=helpers.js.map
