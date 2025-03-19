/// <reference types="node" />
/// <reference types="node" />
import * as firebase from "firebase/app";
import { MenuItem, Order, CartSession, Customer } from "../types";
export declare const uploadMedia: (
  buffer: Buffer,
  fileName: string,
  type: "image" | "video"
) => Promise<string>;
export declare const deleteMedia: (fileId: string) => Promise<void>;
export declare const addMenuItem: (item: MenuItem) => Promise<void>;
export declare const getMenuItem: (id: string) => Promise<MenuItem | undefined>;
export declare const getAllMenuItems: () => Promise<MenuItem[]>;
export declare const updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
export declare const deleteMenuItem: (id: string) => Promise<void>;
export declare const toggleItemAvailability: (id: string) => Promise<boolean>;
export declare const addOrder: (order: Order) => Promise<void>;
export declare const getOrder: (id: string) => Promise<Order | undefined>;
export declare const getOrdersByCustomer: (chatId: number) => Promise<Order[]>;
export declare const updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>;
export declare const clearOrders: () => Promise<void>;
export declare const getCart: (chatId: number) => Promise<CartSession | undefined>;
export declare const updateCart: (chatId: number, cart: CartSession) => Promise<void>;
export declare const clearCart: (chatId: number) => Promise<void>;
export declare const addCustomer: (customer: Customer) => Promise<void>;
export declare const getCustomer: (chatId: number) => Promise<Customer | undefined>;
export declare const updateCustomer: (chatId: number, updates: Partial<Customer>) => Promise<void>;
declare const _default: {
  app: firebase.FirebaseApp;
  db: import("@firebase/firestore").Firestore;
  uploadMedia: (buffer: Buffer, fileName: string, type: "video" | "image") => Promise<string>;
  deleteMedia: (fileId: string) => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<void>;
  getMenuItem: (id: string) => Promise<MenuItem | undefined>;
  getAllMenuItems: () => Promise<MenuItem[]>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleItemAvailability: (id: string) => Promise<boolean>;
  addOrder: (order: Order) => Promise<void>;
  getOrder: (id: string) => Promise<Order | undefined>;
  getOrdersByCustomer: (chatId: number) => Promise<Order[]>;
  updateOrderStatus: (
    id: string,
    status: "pending" | "confirmed" | "in-transit" | "delivered" | "cancelled"
  ) => Promise<void>;
  clearOrders: () => Promise<void>;
  getCart: (chatId: number) => Promise<CartSession | undefined>;
  updateCart: (chatId: number, cart: CartSession) => Promise<void>;
  clearCart: (chatId: number) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  getCustomer: (chatId: number) => Promise<Customer | undefined>;
  updateCustomer: (chatId: number, updates: Partial<Customer>) => Promise<void>;
};
export default _default;
