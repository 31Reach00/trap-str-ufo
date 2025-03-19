import * as firebase from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { MenuItem, Order, CartSession, Customer } from "../types";

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Collection references
const menuItemsCollection = collection(db, "menuItems");
const ordersCollection = collection(db, "orders");
const cartsCollection = collection(db, "carts");
const customersCollection = collection(db, "customers");

// Telegram media handling functions
// Instead of uploading to Firebase Storage, we'll store the Telegram file IDs
export const uploadMedia = async (
  buffer: Buffer,
  fileName: string,
  type: "image" | "video"
): Promise<string> => {
  // This function is now a placeholder
  // In the actual implementation, we'll use Telegram's file IDs directly
  console.log(`Storing ${type} file ID instead of uploading to Firebase Storage`);
  return fileName; // This will be replaced with the actual file ID
};

export const deleteMedia = async (fileId: string): Promise<void> => {
  // No need to delete anything from Telegram
  // This is just a placeholder function for compatibility
  console.log(`No need to delete media from Telegram: ${fileId}`);
  return;
};

// Firestore functions for MenuItem
export const addMenuItem = async (item: MenuItem): Promise<void> => {
  try {
    await setDoc(doc(menuItemsCollection, item.id), {
      ...item,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding menu item:", error);
    throw error;
  }
};

export const getMenuItem = async (id: string): Promise<MenuItem | undefined> => {
  try {
    const docRef = doc(menuItemsCollection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as MenuItem;
      return {
        ...data,
        updatedAt: new Date(data.updatedAt),
      };
    }
    return undefined;
  } catch (error) {
    console.error("Error getting menu item:", error);
    throw error;
  }
};

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const querySnapshot = await getDocs(menuItemsCollection);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as MenuItem;
      return {
        ...data,
        updatedAt: new Date(data.updatedAt),
      };
    });
  } catch (error) {
    console.error("Error getting all menu items:", error);
    throw error;
  }
};

export const updateMenuItem = async (id: string, updates: Partial<MenuItem>): Promise<void> => {
  try {
    const docRef = doc(menuItemsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(menuItemsCollection, id));
  } catch (error) {
    console.error("Error deleting menu item:", error);
    throw error;
  }
};

export const toggleItemAvailability = async (id: string): Promise<boolean> => {
  try {
    const item = await getMenuItem(id);
    if (!item) {
      return false;
    }

    const newAvailability = !item.isAvailable;
    await updateMenuItem(id, { isAvailable: newAvailability });
    return newAvailability;
  } catch (error) {
    console.error("Error toggling item availability:", error);
    throw error;
  }
};

// Firestore functions for Order
export const addOrder = async (order: Order): Promise<void> => {
  try {
    await setDoc(doc(ordersCollection, order.id), {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error adding order:", error);
    throw error;
  }
};

export const getOrder = async (id: string): Promise<Order | undefined> => {
  try {
    const docRef = doc(ordersCollection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    }
    return undefined;
  } catch (error) {
    console.error("Error getting order:", error);
    throw error;
  }
};

export const getOrdersByCustomer = async (chatId: number): Promise<Order[]> => {
  try {
    const q = query(ordersCollection, where("chatId", "==", chatId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    });
  } catch (error) {
    console.error("Error getting orders by customer:", error);
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: Order["status"]): Promise<void> => {
  try {
    const docRef = doc(ordersCollection, id);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

export const clearOrders = async (): Promise<void> => {
  try {
    const querySnapshot = await getDocs(ordersCollection);
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing orders:", error);
    throw error;
  }
};

// Firestore functions for Cart
export const getCart = async (chatId: number): Promise<CartSession | undefined> => {
  try {
    const docRef = doc(cartsCollection, chatId.toString());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      return {
        ...data,
        lastUpdated: new Date(data.lastUpdated),
      };
    }
    return undefined;
  } catch (error) {
    console.error("Error getting cart:", error);
    throw error;
  }
};

export const updateCart = async (chatId: number, cart: CartSession): Promise<void> => {
  try {
    await setDoc(doc(cartsCollection, chatId.toString()), {
      ...cart,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    throw error;
  }
};

export const clearCart = async (chatId: number): Promise<void> => {
  try {
    await deleteDoc(doc(cartsCollection, chatId.toString()));
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw error;
  }
};

// Firestore functions for Customer
export const addCustomer = async (customer: Customer): Promise<void> => {
  try {
    await setDoc(doc(customersCollection, customer.chatId.toString()), customer);
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

export const getCustomer = async (chatId: number): Promise<Customer | undefined> => {
  try {
    const docRef = doc(customersCollection, chatId.toString());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as Customer;
    }
    return undefined;
  } catch (error) {
    console.error("Error getting customer:", error);
    throw error;
  }
};

export const updateCustomer = async (chatId: number, updates: Partial<Customer>): Promise<void> => {
  try {
    const docRef = doc(customersCollection, chatId.toString());
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

export default {
  app,
  db,
  uploadMedia,
  deleteMedia,
  addMenuItem,
  getMenuItem,
  getAllMenuItems,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  addOrder,
  getOrder,
  getOrdersByCustomer,
  updateOrderStatus,
  clearOrders,
  getCart,
  updateCart,
  clearCart,
  addCustomer,
  getCustomer,
  updateCustomer,
};
