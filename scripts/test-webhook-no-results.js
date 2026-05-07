const assert = require("assert/strict");
const { createTextEventHandler } = require("../webhookHandler");

async function main() {
  const logs = [];
  const errors = [];
  const replies = [];

  const handler = createTextEventHandler({
    findTires: async () => [],
    normalize: () => "215/45R17",
    reply: async (replyToken, message) => {
      replies.push({ replyToken, message });
    },
    logger: {
      log: (message) => logs.push(message),
      error: (...args) => errors.push(args),
    },
  });

  await handler({
    replyToken: "dummy-reply-token",
    message: {
      type: "text",
      text: "215/45R17",
    },
    source: {
      type: "user",
    },
  });

  assert.equal(errors.length, 0, "no-results flow should not log errors");
  assert.equal(replies.length, 1, "no-results flow should send one reply");
  assert.deepEqual(replies[0], {
    replyToken: "dummy-reply-token",
    message: {
      type: "text",
      text: "目前沒有找到 215/45R17 的輪胎資料，請確認規格是否正確，或洽詢門市人員。",
    },
  });
  assert.ok(
    logs.some((message) => message.includes("查無資料") && message.includes("215/45R17")),
    "no-results log should clearly include the missing size"
  );

  console.log("Webhook no-results test passed.");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
