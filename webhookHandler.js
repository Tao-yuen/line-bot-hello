const { buildTireFlexMessage } = require("./flexMessages");
const { findRandomTiresBySize } = require("./tireService");
const { normalizeTireSize } = require("./tireSizeNormalizer");

function createReplySender(client) {
  return async function replyMessage(replyToken, message) {
    if (!client) {
      return null;
    }

    return client.replyMessage({
      replyToken,
      messages: [message],
    });
  };
}

function createTextEventHandler({
  findTires = findRandomTiresBySize,
  normalize = normalizeTireSize,
  reply = async () => null,
  logger = console,
} = {}) {
  return async function handleTextEvent(event) {
    const normalizedSize = normalize(event?.message?.text);

    if (!normalizedSize) {
      await reply(event.replyToken, {
        type: "text",
        text: "請輸入輪胎規格，例如：205/55R16 或 20555R16",
      });
      return;
    }

    try {
      const tires = await findTires(normalizedSize);

      if (!tires.length) {
        logger.log(`[webhook] 查無資料 size=${normalizedSize}`);
        await reply(event.replyToken, {
          type: "text",
          text: `目前沒有找到 ${normalizedSize} 的輪胎資料，請確認規格是否正確，或洽詢門市人員。`,
        });
        return;
      }

      logger.log(
        `[webhook] 找到輪胎資料 size=${normalizedSize} count=${tires.length}`
      );
      await reply(event.replyToken, buildTireFlexMessage(tires, normalizedSize));
    } catch (error) {
      logger.error("Failed to handle tire search:", error);

      try {
        await reply(event.replyToken, {
          type: "text",
          text: "系統暫時忙碌中，請稍後再試。",
        });
      } catch (replyError) {
        logger.error("Failed to send fallback reply:", replyError);
      }
    }
  };
}

module.exports = {
  createReplySender,
  createTextEventHandler,
};
