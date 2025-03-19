import { OrderItem, MenuItem, Quantity } from "../types";
export declare const saveMedia: (fileId: string, type: "image" | "video") => Promise<string>;
export declare const deleteMedia: (fileId: string) => Promise<void>;
export declare const formatMenuItem: (item: MenuItem) => string;
export declare const formatOrder: (items: OrderItem[]) => string;
export declare const formatOrderStatus: (status: string) => string;
export declare const calculateTotal: (items: OrderItem[]) => number;
export declare const createQuantityKeyboard: (quantities: Quantity[]) => string[][];
export declare const parseQuantitySelection: (
  text: string,
  quantities: Quantity[]
) => Quantity | null;
export declare const isValidImageFile: (mimetype: string) => boolean;
export declare const isValidVideoFile: (mimetype: string) => boolean;
export declare const generateOrderId: () => string;
