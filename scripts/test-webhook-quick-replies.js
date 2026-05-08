const assert = require("assert/strict");
const { createTextEventHandler } = require("../webhookHandler");

async function main() {
  const replies = [];

  const handler = createTextEventHandler({
    findTires: async () => [],
    findBusinessHours: async (label) => {
      if (label === "保養廠") {
        return {
          label: "保養廠",
          hours_text: "保養廠營業時間：週一至週六 09:00-18:00",
        };
      }

      return null;
    },
    listBusinessHours: async () => [
      { label: "保養廠" },
      { label: "洗車廠" },
      { label: "驗車廠" },
    ],
    normalize: () => null,
    reply: async (replyToken, message) => {
      replies.push({ replyToken, message });
    },
  });

  await handler({
    replyToken: "quick-reply-token",
    message: {
      type: "text",
      text: "營業時間",
    },
  });

  await handler({
    replyToken: "tire-prompt-token",
    message: {
      type: "text",
      text: "輪胎規格查詢",
    },
  });

  await handler({
    replyToken: "business-hours-token",
    message: {
      type: "text",
      text: "保養廠",
    },
  });

  assert.equal(replies.length, 3, "quick reply flow should send three replies");
  assert.equal(replies[0].message.text, "請選擇要查詢的營業時間");
  assert.deepEqual(
    replies[0].message.quickReply.items.map((item) => item.action.label),
    ["保養廠", "洗車廠", "驗車廠", "主選單"]
  );
  assert.equal(
    replies[1].message.text,
    "請輸入輪胎規格，例如：205/55R16 或 20555R16"
  );
  assert.equal(
    replies[2].message.text,
    "保養廠營業時間：週一至週六 09:00-18:00"
  );

  console.log("Webhook quick-replies test passed.");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
