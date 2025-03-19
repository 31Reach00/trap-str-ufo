import { Context, MatchContext } from "../types/context";
export declare class OrderController {
  static startOrder(ctx: Context): Promise<void>;
  static addToCart(ctx: MatchContext): Promise<void>;
  static handleInlineQuantitySelection(ctx: MatchContext): Promise<void>;
  static handleQuantitySelection(ctx: Context): Promise<void>;
  static viewCart(ctx: Context): Promise<void>;
  static removeFromCart(ctx: MatchContext): Promise<void>;
  static clearCart(ctx: Context): Promise<void>;
  static confirmOrder(ctx: Context): Promise<void>;
  static updateOrderStatus(ctx: MatchContext): Promise<void>;
  static cancelOrder(ctx: Context): Promise<void>;
}
