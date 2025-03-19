import { MenuItem, Order, CartSession, Customer } from "../types";
declare class Store {
  private static instance;
  private constructor();
  static getInstance(): Store;
  addMenuItem(item: MenuItem): Promise<void>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getAllMenuItems(): Promise<MenuItem[]>;
  updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<void>;
  deleteMenuItem(id: string): Promise<void>;
  toggleItemAvailability(id: string): Promise<boolean>;
  addOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(chatId: number): Promise<Order[]>;
  updateOrderStatus(id: string, status: Order["status"]): Promise<void>;
  clearOrders(): Promise<void>;
  getCart(chatId: number): Promise<CartSession | undefined>;
  updateCart(chatId: number, cart: CartSession): Promise<void>;
  clearCart(chatId: number): Promise<void>;
  addCustomer(customer: Customer): Promise<void>;
  getCustomer(chatId: number): Promise<Customer | undefined>;
  updateCustomer(chatId: number, updates: Partial<Customer>): Promise<void>;
}
export declare const store: Store;
export {};
