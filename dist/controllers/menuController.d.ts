import { Context, MatchContext } from "../types/context";
export declare class MenuController {
  static addMenuItem(ctx: Context): Promise<void>;
  static listMenuItems(ctx: Context): Promise<void>;
  static toggleAvailability(ctx: MatchContext): Promise<void>;
  static deleteMenuItem(ctx: MatchContext): Promise<void>;
  static updateMenuItem(ctx: MatchContext): Promise<void>;
}
