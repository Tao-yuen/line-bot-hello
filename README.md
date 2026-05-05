# LINE Messaging API Webhook for Zeabur

這是一個可以直接部署到 Zeabur 的 LINE Messaging API webhook 專案。

## 功能

- 使用 Node.js + Express
- 使用 `@line/bot-sdk`
- 提供 `POST /webhook`
- 驗證 LINE webhook signature
- 收到任何文字訊息時，自動回覆 `你好！`
- 使用環境變數設定 LINE 憑證與 port

## 環境需求

- Node.js 18+
- 一組 LINE Messaging API channel
- Zeabur 帳號

## 安裝

```bash
npm install
```

## 環境變數

請建立 `.env`，內容可參考 `.env.example`：

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
PORT=3000
```

### 變數說明

- `LINE_CHANNEL_ACCESS_TOKEN`：LINE Messaging API 的 Channel access token
- `LINE_CHANNEL_SECRET`：LINE Messaging API 的 Channel secret
- `PORT`：伺服器監聽埠，程式會使用 `process.env.PORT || 3000`

專案啟動時會自動讀取根目錄的 `.env` 檔；如果你已經在終端機設定好環境變數，也可以直接使用那些值。

## 本機執行

```bash
npm start
```

伺服器預設會跑在 `3000`，如果有設定 `PORT` 就會使用該值。

## Zeabur 部署步驟

1. 將這個專案推到 GitHub。
2. 登入 Zeabur，建立一個新的 Project。
3. 選擇從 GitHub 匯入這個 repository。
4. Zeabur 會自動偵測 Node.js 專案。
5. 在 Zeabur 的環境變數設定中加入：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
6. 不需要手動指定 `PORT`，Zeabur 會提供 `PORT` 環境變數；程式已經支援 `process.env.PORT || 3000`。
7. 部署完成後，Zeabur 會提供一個公開網址，例如 `https://your-app.zeabur.app`。

## LINE Developers Console Webhook URL 設定

1. 登入 [LINE Developers Console](https://developers.line.biz/console/).
2. 開啟你的 Messaging API channel。
3. 找到 Webhook 設定。
4. 將 Webhook URL 設成：

```text
https://your-app.zeabur.app/webhook
```

5. 開啟 `Use webhook`。
6. 按下 `Verify` 測試 webhook 是否可用。

## 注意事項

- `/webhook` 只會對 `message` 類型且內容是 `text` 的事件回覆。
- 若要讓 LINE 正常回傳訊息，請確認 channel access token 與 channel secret 正確無誤。
