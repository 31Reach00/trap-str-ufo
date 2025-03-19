import { Context as TelegrafContext, NarrowedContext } from "telegraf";
import { Update, Message } from "telegraf/types";
export interface MatchContext extends TelegrafContext<Update> {
  match: RegExpExecArray;
}
export type Context = TelegrafContext<Update>;
export type MessageContext = NarrowedContext<Context, Update.MessageUpdate>;
export type CallbackContext = NarrowedContext<Context, Update.CallbackQueryUpdate>;
export declare const createMatchContext: (
  ctx: Context | MessageContext | CallbackContext,
  matches: string[]
) => MatchContext;
export interface PhotoMessageContext extends Context {
  message: Update.New & Update.NonChannel & Message.PhotoMessage;
}
export interface VideoMessageContext extends Context {
  message: Update.New & Update.NonChannel & Message.VideoMessage;
}
export declare const isPhotoMessage: (ctx: Context) => ctx is PhotoMessageContext;
export declare const isVideoMessage: (ctx: Context) => ctx is VideoMessageContext;
