const assert = require("assert/strict");
const { createTextEventHandler } = require("../webhookHandler");

async function main() {
  const replies = [];

  const handler = createTextEventHandler({
    findTires: async () => [],
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

  assert.equal(replies.length, 2, "quick reply flow should send two replies");
  assert.equal(replies[0].message.text, "請選擇要查詢的營業時間");
  assert.deepEqual(
    replies[0].message.quickReply.items.map((item) => item.action.label),
    ["保養廠", "洗車廠", "驗車廠", "主選單"]
  );
  assert.equal(
    replies[1].message.text,
    "請輸入輪胎規格，例如：205/55R16 或 20555R16"
  );

  console.log("Webhook quick-replies test passed.");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
