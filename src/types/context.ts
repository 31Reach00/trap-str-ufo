import { Context as TelegrafContext, NarrowedContext } from "telegraf";
import { Update, Message } from "telegraf/types";

export interface MatchContext extends TelegrafContext<Update> {
  match: RegExpExecArray;
}

// Ensure Context always has reply method
export type Context = TelegrafContext<Update> & {
  reply: TelegrafContext<Update>["reply"];
};
export type MessageContext = NarrowedContext<Context, Update.MessageUpdate>;
export type CallbackContext = NarrowedContext<Context, Update.CallbackQueryUpdate>;

export const createMatchContext = (
  ctx: Context | MessageContext | CallbackContext,
  matches: string[]
): MatchContext => {
  // Create a proper RegExpExecArray
  const regExpExecArray = new Array(...matches) as unknown as RegExpExecArray;
  Object.defineProperties(regExpExecArray, {
    index: { value: 0, writable: true },
    input: { value: "", writable: true },
    groups: { value: undefined, writable: true },
  });

  return {
    ...ctx,
    match: regExpExecArray,
  } as MatchContext;
};

export interface PhotoMessageContext extends Context {
  message: Update.New & Update.NonChannel & Message.PhotoMessage;
}

export interface VideoMessageContext extends Context {
  message: Update.New & Update.NonChannel & Message.VideoMessage;
}

export const isPhotoMessage = (ctx: Context): ctx is PhotoMessageContext => {
  return (
    ctx.message !== undefined && "photo" in ctx.message && Array.isArray((ctx.message as any).photo)
  );
};

export const isVideoMessage = (ctx: Context): ctx is VideoMessageContext => {
  return (
    ctx.message !== undefined && "video" in ctx.message && (ctx.message as any).video !== undefined
  );
};
