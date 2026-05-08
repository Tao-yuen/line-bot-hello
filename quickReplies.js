const MAIN_MENU_LABEL = "主選單";
const BUSINESS_HOURS_LABEL = "營業時間";
const TIRE_SEARCH_LABEL = "輪胎規格查詢";
const DEFAULT_BUSINESS_HOUR_LABELS = ["保養廠", "洗車廠", "驗車廠"];

function buildQuickReplyItems(labels) {
  return labels.map((label) => ({
    type: "action",
    action: {
      type: "message",
      label,
      text: label,
    },
  }));
}

function buildTextMessage(text, quickReplyLabels) {
  const message = {
    type: "text",
    text,
  };

  if (Array.isArray(quickReplyLabels) && quickReplyLabels.length > 0) {
    message.quickReply = {
      items: buildQuickReplyItems(quickReplyLabels),
    };
  }

  return message;
}

function buildMainMenuMessage(text = "請選擇服務項目") {
  return buildTextMessage(text, [BUSINESS_HOURS_LABEL, TIRE_SEARCH_LABEL]);
}

function buildBusinessHoursMenuMessage(labels = DEFAULT_BUSINESS_HOUR_LABELS) {
  return buildTextMessage("請選擇要查詢的營業時間", [
    ...labels,
    MAIN_MENU_LABEL,
  ]);
}

function buildTireSearchPromptMessage() {
  return buildTextMessage(
    "請輸入輪胎規格，例如：205/55R16 或 20555R16",
    [MAIN_MENU_LABEL]
  );
}

module.exports = {
  BUSINESS_HOURS_LABEL,
  MAIN_MENU_LABEL,
  TIRE_SEARCH_LABEL,
  buildBusinessHoursMenuMessage,
  buildMainMenuMessage,
  buildTextMessage,
  buildTireSearchPromptMessage,
};
