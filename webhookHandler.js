const { findBusinessHoursByLabel } = require("./businessHours");
const { buildTireFlexMessage } = require("./flexMessages");
const {
  BUSINESS_HOURS_LABEL,
  MAIN_MENU_LABEL,
  TIRE_SEARCH_LABEL,
  buildBusinessHoursMenuMessage,
  buildMainMenuMessage,
  buildTextMessage,
  buildTireSearchPromptMessage,
} = require("./quickReplies");
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
    const inputText = String(event?.message?.text || "").trim();
    const businessHours = findBusinessHoursByLabel(inputText);

    if (inputText === MAIN_MENU_LABEL) {
      await reply(event.replyToken, buildMainMenuMessage());
      return;
    }

    if (inputText === BUSINESS_HOURS_LABEL) {
      await reply(event.replyToken, buildBusinessHoursMenuMessage());
      return;
    }

    if (inputText === TIRE_SEARCH_LABEL) {
      await reply(event.replyToken, buildTireSearchPromptMessage());
      return;
    }

    if (businessHours) {
      await reply(
        event.replyToken,
        buildTextMessage(businessHours.text, [MAIN_MENU_LABEL, TIRE_SEARCH_LABEL])
      );
      return;
    }

    const normalizedSize = normalize(inputText);

    if (!normalizedSize) {
      await reply(
        event.replyToken,
        buildMainMenuMessage("請選擇服務項目，或直接輸入輪胎規格")
      );
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
