import { MenuItem, Order, CartSession, Customer } from "../types";
import * as firebase from "./firebase";

// In-memory cache for frequently accessed data
const menuItemsCache = new Map<string, MenuItem>();
const ordersCache = new Map<string, Order>();
const cartsCache = new Map<number, CartSession>();
const customersCache = new Map<number, Customer>();

class Store {
  private static instance: Store;

  private constructor() {
    // Initialize cache
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  // Menu Items Operations
  public async addMenuItem(item: MenuItem): Promise<void> {
    await firebase.addMenuItem(item);
    menuItemsCache.set(item.id, item);
  }

  public async getMenuItem(id: string): Promise<MenuItem | undefined> {
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

  public async getAllMenuItems(): Promise<MenuItem[]> {
    const items = await firebase.getAllMenuItems();

    // Update cache
    items.forEach((item) => {
      menuItemsCache.set(item.id, item);
    });

    return items;
  }

  public async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<void> {
    await firebase.updateMenuItem(id, updates);

    // Update cache if item exists in cache
    if (menuItemsCache.has(id)) {
      const item = menuItemsCache.get(id)!;
      menuItemsCache.set(id, { ...item, ...updates, updatedAt: new Date() });
    }
  }

  public async deleteMenuItem(id: string): Promise<void> {
    await firebase.deleteMenuItem(id);
    menuItemsCache.delete(id);
  }

  public async toggleItemAvailability(id: string): Promise<boolean> {
    const isAvailable = await firebase.toggleItemAvailability(id);

    // Update cache if item exists in cache
    if (menuItemsCache.has(id)) {
      const item = menuItemsCache.get(id)!;
      menuItemsCache.set(id, { ...item, isAvailable, updatedAt: new Date() });
    }

    return isAvailable;
  }

  // Orders Operations
  public async addOrder(order: Order): Promise<void> {
    await firebase.addOrder(order);
    ordersCache.set(order.id, order);
  }

  public async getOrder(id: string): Promise<Order | undefined> {
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

  public async getOrdersByCustomer(chatId: number): Promise<Order[]> {
    const orders = await firebase.getOrdersByCustomer(chatId);

    // Update cache
    orders.forEach((order) => {
      ordersCache.set(order.id, order);
    });

    return orders;
  }

  public async updateOrderStatus(id: string, status: Order["status"]): Promise<void> {
    await firebase.updateOrderStatus(id, status);

    // Update cache if order exists in cache
    if (ordersCache.has(id)) {
      const order = ordersCache.get(id)!;
      ordersCache.set(id, {
        ...order,
        status,
        updatedAt: new Date(),
      });
    }
  }

  public async clearOrders(): Promise<void> {
    await firebase.clearOrders();
    ordersCache.clear();
  }

  // Cart Operations
  public async getCart(chatId: number): Promise<CartSession | undefined> {
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

  public async updateCart(chatId: number, cart: CartSession): Promise<void> {
    await firebase.updateCart(chatId, cart);
    cartsCache.set(chatId, { ...cart, lastUpdated: new Date() });
  }

  public async clearCart(chatId: number): Promise<void> {
    await firebase.clearCart(chatId);
    cartsCache.delete(chatId);
  }

  // Customer Operations
  public async addCustomer(customer: Customer): Promise<void> {
    await firebase.addCustomer(customer);
    customersCache.set(customer.chatId, customer);
  }

  public async getCustomer(chatId: number): Promise<Customer | undefined> {
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

  public async updateCustomer(chatId: number, updates: Partial<Customer>): Promise<void> {
    await firebase.updateCustomer(chatId, updates);

    // Update cache if customer exists in cache
    if (customersCache.has(chatId)) {
      const customer = customersCache.get(chatId)!;
      customersCache.set(chatId, { ...customer, ...updates });
    }
  }
}

export const store = Store.getInstance();
