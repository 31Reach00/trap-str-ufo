import { Context } from "telegraf";
export declare const isAdmin: (ctx: Context, next: () => Promise<void>) => Promise<void>;
export declare const isValidUser: (ctx: Context, next: () => Promise<void>) => Promise<void>;
export declare const handleError: (error: any, ctx: Context) => Promise<void>;
export declare const rateLimiter: Map<
  number,
  {
    count: number;
    timestamp: number;
  }
>;
export declare const rateLimit: (ctx: Context, next: () => Promise<void>) => Promise<void>;
