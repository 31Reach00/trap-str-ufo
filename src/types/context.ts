import { Context as TelegrafContext, NarrowedContext } from 'telegraf';
import { Update, Message } from 'telegraf/types';

export interface MatchContext extends TelegrafContext<Update> {
  match: RegExpExecArray;
}

export type Context = TelegrafContext<Update>;

export type MessageContext = NarrowedContext<Context, Update.MessageUpdate>;
export type CallbackContext = NarrowedContext<Context, Update.CallbackQueryUpdate>;

export const createMatchContext = (
  ctx: Context | MessageContext | CallbackContext,
  matches: string[]
): MatchContext => {
  const regExpExecArray = Object.assign(matches, {
    index: 0,
    input: '',
    groups: undefined,
  }) as RegExpExecArray;

  return {
    ...ctx,
    match: regExpExecArray,
  } as MatchContext;
};
