export interface Quantity {
  label: string;
  amount: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string; // Optional video URL
  quantities: Quantity[];
  isAvailable: boolean;
  category?: string;
  updatedAt: Date;
}

export interface OrderItem {
  menuItem: MenuItem;
  selectedQuantity: Quantity;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerUsername: string;
  chatId: number;
  items: OrderItem[];
  status: "pending" | "confirmed" | "in-transit" | "delivered" | "cancelled";
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  chatId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  activeOrder?: Order;
}

export interface AdminAction {
  type: "UPDATE_MENU" | "UPDATE_STOCK" | "UPDATE_PRICE" | "CLEAR_ORDERS";
  timestamp: Date;
  details: any;
}

export type OrderStatus = Order["status"];

export interface CartSession {
  chatId: number;
  items: OrderItem[];
  lastUpdated: Date;
}
