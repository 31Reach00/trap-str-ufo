"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVideoMessage = exports.isPhotoMessage = exports.createMatchContext = void 0;
const createMatchContext = (ctx, matches) => {
  // Create a proper RegExpExecArray
  const regExpExecArray = new Array(...matches);
  Object.defineProperties(regExpExecArray, {
    index: { value: 0, writable: true },
    input: { value: "", writable: true },
    groups: { value: undefined, writable: true },
  });
  return {
    ...ctx,
    match: regExpExecArray,
  };
};
exports.createMatchContext = createMatchContext;
const isPhotoMessage = (ctx) => {
  return ctx.message !== undefined && "photo" in ctx.message && Array.isArray(ctx.message.photo);
};
exports.isPhotoMessage = isPhotoMessage;
const isVideoMessage = (ctx) => {
  return ctx.message !== undefined && "video" in ctx.message && ctx.message.video !== undefined;
};
exports.isVideoMessage = isVideoMessage;
//# sourceMappingURL=context.js.map
