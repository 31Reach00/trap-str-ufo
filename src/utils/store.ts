import { MenuItem, Order, CartSession, Customer } from '../types';

class Store {
  private static instance: Store;
  private menuItems: Map<string, MenuItem>;
  private orders: Map<string, Order>;
  private carts: Map<number, CartSession>;
  private customers: Map<number, Customer>;

  private constructor() {
    this.menuItems = new Map();
    this.orders = new Map();
    this.carts = new Map();
    this.customers = new Map();
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  // Menu Items Operations
  public addMenuItem(item: MenuItem): void {
    this.menuItems.set(item.id, item);
  }

  public getMenuItem(id: string): MenuItem | undefined {
    return this.menuItems.get(id);
  }

  public getAllMenuItems(): MenuItem[] {
    return Array.from(this.menuItems.values());
  }

  public updateMenuItem(id: string, updates: Partial<MenuItem>): void {
    const item = this.menuItems.get(id);
    if (item) {
      this.menuItems.set(id, { ...item, ...updates, updatedAt: new Date() });
    }
  }

  public deleteMenuItem(id: string): void {
    this.menuItems.delete(id);
  }

  public toggleItemAvailability(id: string): boolean {
    const item = this.menuItems.get(id);
    if (item) {
      item.isAvailable = !item.isAvailable;
      this.menuItems.set(id, { ...item, updatedAt: new Date() });
      return item.isAvailable;
    }
    return false;
  }

  // Orders Operations
  public addOrder(order: Order): void {
    this.orders.set(order.id, order);
  }

  public getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  public getOrdersByCustomer(chatId: number): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.chatId === chatId
    );
  }

  public updateOrderStatus(id: string, status: Order['status']): void {
    const order = this.orders.get(id);
    if (order) {
      this.orders.set(id, {
        ...order,
        status,
        updatedAt: new Date(),
      });
    }
  }

  public clearOrders(): void {
    this.orders.clear();
  }

  // Cart Operations
  public getCart(chatId: number): CartSession | undefined {
    return this.carts.get(chatId);
  }

  public updateCart(chatId: number, cart: CartSession): void {
    this.carts.set(chatId, { ...cart, lastUpdated: new Date() });
  }

  public clearCart(chatId: number): void {
    this.carts.delete(chatId);
  }

  // Customer Operations
  public addCustomer(customer: Customer): void {
    this.customers.set(customer.chatId, customer);
  }

  public getCustomer(chatId: number): Customer | undefined {
    return this.customers.get(chatId);
  }

  public updateCustomer(chatId: number, updates: Partial<Customer>): void {
    const customer = this.customers.get(chatId);
    if (customer) {
      this.customers.set(chatId, { ...customer, ...updates });
    }
  }
}

export const store = Store.getInstance();
