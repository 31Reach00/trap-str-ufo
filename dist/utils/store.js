"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const firebase = __importStar(require("./firebase"));
// In-memory cache for frequently accessed data
const menuItemsCache = new Map();
const ordersCache = new Map();
const cartsCache = new Map();
const customersCache = new Map();
class Store {
  constructor() {
    // Initialize cache
  }
  static getInstance() {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }
  // Menu Items Operations
  async addMenuItem(item) {
    await firebase.addMenuItem(item);
    menuItemsCache.set(item.id, item);
  }
  async getMenuItem(id) {
    // Check cache first
    if (menuItemsCache.has(id)) {
      return menuItemsCache.get(id);
    }
    // Fetch from Firebase
    const item = await firebase.getMenuItem(id);
    if (item) {
      menuItemsCache.set(id, item);
    }
    return item;
  }
  async getAllMenuItems() {
    const items = await firebase.getAllMenuItems();
    // Update cache
    items.forEach((item) => {
      menuItemsCache.set(item.id, item);
    });
    return items;
  }
  async updateMenuItem(id, updates) {
    await firebase.updateMenuItem(id, updates);
    // Update cache if item exists in cache
    if (menuItemsCache.has(id)) {
      const item = menuItemsCache.get(id);
      menuItemsCache.set(id, { ...item, ...updates, updatedAt: new Date() });
    }
  }
  async deleteMenuItem(id) {
    await firebase.deleteMenuItem(id);
    menuItemsCache.delete(id);
  }
  async toggleItemAvailability(id) {
    const isAvailable = await firebase.toggleItemAvailability(id);
    // Update cache if item exists in cache
    if (menuItemsCache.has(id)) {
      const item = menuItemsCache.get(id);
      menuItemsCache.set(id, { ...item, isAvailable, updatedAt: new Date() });
    }
    return isAvailable;
  }
  // Orders Operations
  async addOrder(order) {
    await firebase.addOrder(order);
    ordersCache.set(order.id, order);
  }
  async getOrder(id) {
    // Check cache first
    if (ordersCache.has(id)) {
      return ordersCache.get(id);
    }
    // Fetch from Firebase
    const order = await firebase.getOrder(id);
    if (order) {
      ordersCache.set(id, order);
    }
    return order;
  }
  async getOrdersByCustomer(chatId) {
    const orders = await firebase.getOrdersByCustomer(chatId);
    // Update cache
    orders.forEach((order) => {
      ordersCache.set(order.id, order);
    });
    return orders;
  }
  async updateOrderStatus(id, status) {
    await firebase.updateOrderStatus(id, status);
    // Update cache if order exists in cache
    if (ordersCache.has(id)) {
      const order = ordersCache.get(id);
      ordersCache.set(id, {
        ...order,
        status,
        updatedAt: new Date(),
      });
    }
  }
  async clearOrders() {
    await firebase.clearOrders();
    ordersCache.clear();
  }
  // Cart Operations
  async getCart(chatId) {
    // Check cache first
    if (cartsCache.has(chatId)) {
      return cartsCache.get(chatId);
    }
    // Fetch from Firebase
    const cart = await firebase.getCart(chatId);
    if (cart) {
      cartsCache.set(chatId, cart);
    }
    return cart;
  }
  async updateCart(chatId, cart) {
    await firebase.updateCart(chatId, cart);
    cartsCache.set(chatId, { ...cart, lastUpdated: new Date() });
  }
  async clearCart(chatId) {
    await firebase.clearCart(chatId);
    cartsCache.delete(chatId);
  }
  // Customer Operations
  async addCustomer(customer) {
    await firebase.addCustomer(customer);
    customersCache.set(customer.chatId, customer);
  }
  async getCustomer(chatId) {
    // Check cache first
    if (customersCache.has(chatId)) {
      return customersCache.get(chatId);
    }
    // Fetch from Firebase
    const customer = await firebase.getCustomer(chatId);
    if (customer) {
      customersCache.set(chatId, customer);
    }
    return customer;
  }
  async updateCustomer(chatId, updates) {
    await firebase.updateCustomer(chatId, updates);
    // Update cache if customer exists in cache
    if (customersCache.has(chatId)) {
      const customer = customersCache.get(chatId);
      customersCache.set(chatId, { ...customer, ...updates });
    }
  }
}
exports.store = Store.getInstance();
//# sourceMappingURL=store.js.map
