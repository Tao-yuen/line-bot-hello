const fs = require("fs");
const path = require("path");
const express = require("express");
const line = require("@line/bot-sdk");

const { hasDatabaseConfig } = require("./db");
const { createReplySender, createTextEventHandler } = require("./webhookHandler");

const app = express();

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");
  contents.split(/\r?\n/).forEach((lineText) => {
    const trimmed = lineText.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      return;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

loadEnvFile(path.join(__dirname, ".env"));

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.LINE_CHANNEL_SECRET;
const hasLineCredentials = Boolean(channelAccessToken && channelSecret);

const config = {
  channelAccessToken,
  channelSecret,
};

const client = hasLineCredentials
  ? new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    })
  : null;

const webhookMiddleware = hasLineCredentials
  ? line.middleware(config)
  : (req, res) => {
      res.status(503).json({
        status: "error",
        message:
          "Missing LINE env vars: please set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET",
      });
    };

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    lineConfigured: hasLineCredentials,
    databaseConfigured: hasDatabaseConfig(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    lineConfigured: hasLineCredentials,
    databaseConfigured: hasDatabaseConfig(),
  });
});

const replyTextMessage = createReplySender(client);
const handleTextEvent = createTextEventHandler({
  reply: replyTextMessage,
});

app.post("/webhook", webhookMiddleware, async (req, res) => {
  if (!hasLineCredentials || !client) {
    return res.status(503).json({
      status: "error",
      message:
        "Missing LINE env vars: please set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET",
    });
  }

  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
      if (event.type !== "message") {
        continue;
      }

      if (!event.message || event.message.type !== "text") {
        continue;
      }

      await handleTextEvent(event);
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).json({ status: "ok" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ status: "error" });
});

const port = process.env.PORT || 3000;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Server is running on ${host}:${port}`);
  console.log(`LINE credentials configured: ${hasLineCredentials}`);
});
