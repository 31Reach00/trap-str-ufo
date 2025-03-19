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
exports.updateCustomer =
  exports.getCustomer =
  exports.addCustomer =
  exports.clearCart =
  exports.updateCart =
  exports.getCart =
  exports.clearOrders =
  exports.updateOrderStatus =
  exports.getOrdersByCustomer =
  exports.getOrder =
  exports.addOrder =
  exports.toggleItemAvailability =
  exports.deleteMenuItem =
  exports.updateMenuItem =
  exports.getAllMenuItems =
  exports.getMenuItem =
  exports.addMenuItem =
  exports.deleteMedia =
  exports.uploadMedia =
    void 0;
const firebase = __importStar(require("firebase/app"));
const firestore_1 = require("firebase/firestore");
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
const db = (0, firestore_1.getFirestore)(app);
// Collection references
const menuItemsCollection = (0, firestore_1.collection)(db, "menuItems");
const ordersCollection = (0, firestore_1.collection)(db, "orders");
const cartsCollection = (0, firestore_1.collection)(db, "carts");
const customersCollection = (0, firestore_1.collection)(db, "customers");
// Telegram media handling functions
// Instead of uploading to Firebase Storage, we'll store the Telegram file IDs
const uploadMedia = async (buffer, fileName, type) => {
  // This function is now a placeholder
  // In the actual implementation, we'll use Telegram's file IDs directly
  console.log(`Storing ${type} file ID instead of uploading to Firebase Storage`);
  return fileName; // This will be replaced with the actual file ID
};
exports.uploadMedia = uploadMedia;
const deleteMedia = async (fileId) => {
  // No need to delete anything from Telegram
  // This is just a placeholder function for compatibility
  console.log(`No need to delete media from Telegram: ${fileId}`);
  return;
};
exports.deleteMedia = deleteMedia;
// Firestore functions for MenuItem
const addMenuItem = async (item) => {
  try {
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(menuItemsCollection, item.id), {
      ...item,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding menu item:", error);
    throw error;
  }
};
exports.addMenuItem = addMenuItem;
const getMenuItem = async (id) => {
  try {
    const docRef = (0, firestore_1.doc)(menuItemsCollection, id);
    const docSnap = await (0, firestore_1.getDoc)(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
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
exports.getMenuItem = getMenuItem;
const getAllMenuItems = async () => {
  try {
    const querySnapshot = await (0, firestore_1.getDocs)(menuItemsCollection);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
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
exports.getAllMenuItems = getAllMenuItems;
const updateMenuItem = async (id, updates) => {
  try {
    const docRef = (0, firestore_1.doc)(menuItemsCollection, id);
    await (0, firestore_1.updateDoc)(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }
};
exports.updateMenuItem = updateMenuItem;
const deleteMenuItem = async (id) => {
  try {
    await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(menuItemsCollection, id));
  } catch (error) {
    console.error("Error deleting menu item:", error);
    throw error;
  }
};
exports.deleteMenuItem = deleteMenuItem;
const toggleItemAvailability = async (id) => {
  try {
    const item = await (0, exports.getMenuItem)(id);
    if (!item) {
      return false;
    }
    const newAvailability = !item.isAvailable;
    await (0, exports.updateMenuItem)(id, { isAvailable: newAvailability });
    return newAvailability;
  } catch (error) {
    console.error("Error toggling item availability:", error);
    throw error;
  }
};
exports.toggleItemAvailability = toggleItemAvailability;
// Firestore functions for Order
const addOrder = async (order) => {
  try {
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(ordersCollection, order.id), {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error adding order:", error);
    throw error;
  }
};
exports.addOrder = addOrder;
const getOrder = async (id) => {
  try {
    const docRef = (0, firestore_1.doc)(ordersCollection, id);
    const docSnap = await (0, firestore_1.getDoc)(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
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
exports.getOrder = getOrder;
const getOrdersByCustomer = async (chatId) => {
  try {
    const q = (0, firestore_1.query)(
      ordersCollection,
      (0, firestore_1.where)("chatId", "==", chatId)
    );
    const querySnapshot = await (0, firestore_1.getDocs)(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
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
exports.getOrdersByCustomer = getOrdersByCustomer;
const updateOrderStatus = async (id, status) => {
  try {
    const docRef = (0, firestore_1.doc)(ordersCollection, id);
    await (0, firestore_1.updateDoc)(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};
exports.updateOrderStatus = updateOrderStatus;
const clearOrders = async () => {
  try {
    const querySnapshot = await (0, firestore_1.getDocs)(ordersCollection);
    const deletePromises = querySnapshot.docs.map((doc) => (0, firestore_1.deleteDoc)(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing orders:", error);
    throw error;
  }
};
exports.clearOrders = clearOrders;
// Firestore functions for Cart
const getCart = async (chatId) => {
  try {
    const docRef = (0, firestore_1.doc)(cartsCollection, chatId.toString());
    const docSnap = await (0, firestore_1.getDoc)(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
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
exports.getCart = getCart;
const updateCart = async (chatId, cart) => {
  try {
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(cartsCollection, chatId.toString()), {
      ...cart,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    throw error;
  }
};
exports.updateCart = updateCart;
const clearCart = async (chatId) => {
  try {
    await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(cartsCollection, chatId.toString()));
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw error;
  }
};
exports.clearCart = clearCart;
// Firestore functions for Customer
const addCustomer = async (customer) => {
  try {
    await (0, firestore_1.setDoc)(
      (0, firestore_1.doc)(customersCollection, customer.chatId.toString()),
      customer
    );
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};
exports.addCustomer = addCustomer;
const getCustomer = async (chatId) => {
  try {
    const docRef = (0, firestore_1.doc)(customersCollection, chatId.toString());
    const docSnap = await (0, firestore_1.getDoc)(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return undefined;
  } catch (error) {
    console.error("Error getting customer:", error);
    throw error;
  }
};
exports.getCustomer = getCustomer;
const updateCustomer = async (chatId, updates) => {
  try {
    const docRef = (0, firestore_1.doc)(customersCollection, chatId.toString());
    await (0, firestore_1.updateDoc)(docRef, updates);
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};
exports.updateCustomer = updateCustomer;
exports.default = {
  app,
  db,
  uploadMedia: exports.uploadMedia,
  deleteMedia: exports.deleteMedia,
  addMenuItem: exports.addMenuItem,
  getMenuItem: exports.getMenuItem,
  getAllMenuItems: exports.getAllMenuItems,
  updateMenuItem: exports.updateMenuItem,
  deleteMenuItem: exports.deleteMenuItem,
  toggleItemAvailability: exports.toggleItemAvailability,
  addOrder: exports.addOrder,
  getOrder: exports.getOrder,
  getOrdersByCustomer: exports.getOrdersByCustomer,
  updateOrderStatus: exports.updateOrderStatus,
  clearOrders: exports.clearOrders,
  getCart: exports.getCart,
  updateCart: exports.updateCart,
  clearCart: exports.clearCart,
  addCustomer: exports.addCustomer,
  getCustomer: exports.getCustomer,
  updateCustomer: exports.updateCustomer,
};
//# sourceMappingURL=firebase.js.map
