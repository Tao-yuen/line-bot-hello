# 開發環境整理

這份文件整理目前 `line-bot-hello` 專案的開發環境、啟動方式、資料流與部署重點，方便快速上手與交接。

## 專案概覽

- 專案名稱：`line-bot-hello`
- 主要用途：LINE 輪胎規格查詢機器人
- 執行方式：Node.js + Express
- 預期部署平台：Zeabur
- 查詢資料來源：PostgreSQL
- 維護資料來源：Google Sheets CSV 同步到 PostgreSQL

## 技術組成

- Node.js 18+
- Express 4.x
- `@line/bot-sdk` 9.x
- `pg` 8.x

## 入口檔案

- `index.js`：主程式，負責載入環境變數、建立 Express server、註冊 webhook 與健康檢查路由
- `webhookHandler.js`：處理 LINE 文字訊息事件
- `tireService.js`：查詢 PostgreSQL 中的輪胎資料
- `flexMessages.js`：組裝 LINE Flex Message
- `scripts/sync-tires-from-sheets.js`：把 Google Sheets CSV 同步到 PostgreSQL

## 目前可用指令

```bash
npm install
npm start
npm run db:init
npm run db:seed
npm run db:setup
npm run db:sync:sheets
npm run db:sync:sheets -- --dry-run
npm run test:webhook:no-results
```

## 環境需求

- Node.js 18+
- 一組 LINE Messaging API channel
- 一個 PostgreSQL 資料庫
- Zeabur 帳號

## 環境變數

專案會優先讀取根目錄的 `.env`，也支援既有系統環境變數。範例請參考 `.env.example`。

### 必要變數

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `DATABASE_URL`

### 常用可選變數

- `PORT`
- `DATABASE_SSL`
- `GOOGLE_SHEETS_CSV_URL`
- `SYNC_DEACTIVATE_MISSING`

### 範例

```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=false
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/your-spreadsheet-id/export?format=csv&gid=0
SYNC_DEACTIVATE_MISSING=false
```

## 本機啟動流程

1. 安裝相依套件：

```bash
npm install
```

2. 在專案根目錄建立 `.env`
3. 填入 LINE 與資料庫連線資訊
4. 初始化資料庫：

```bash
npm run db:setup
```

5. 啟動服務：

```bash
npm start
```

6. 預設監聽 `3000`

## 資料流

目前專案的正式資料流如下：

```text
Google Sheets
  -> CSV export URL
  -> sync script
  -> PostgreSQL
  -> LINE webhook query
  -> Flex Message reply
```

說明：

- LINE 使用者查詢時只讀 PostgreSQL，不直接讀 Google Sheets
- Google Sheets 只作為後台維護介面
- 同步時以 `tire_code` 做 upsert

## HTTP 路由

- `GET /`：健康檢查，回傳服務、LINE 設定與資料庫設定狀態
- `GET /health`：健康檢查，同上
- `POST /webhook`：LINE webhook 入口

## webhook 行為

- 只處理 `message` 事件
- 只處理文字訊息
- 收到輪胎規格時，會先正規化為標準格式
- 查詢 PostgreSQL 後，隨機回傳 3 到 5 筆輪胎 Flex Message
- 若查無資料，會回覆友善提示
- 若缺少 LINE 憑證，`/webhook` 會回傳 `503`

## 資料庫相關

- schema：`sql/tires_schema.sql`
- seed：`sql/tires_seed.sql`
- 同步唯一鍵：`tire_code`

常用指令：

```bash
npm run db:init
npm run db:seed
npm run db:setup
```

## Google Sheets 同步

同步腳本：

- `scripts/sync-tires-from-sheets.js`

同步前建議先做格式驗證：

```bash
npm run db:sync:sheets -- --dry-run
```

正式同步：

```bash
npm run db:sync:sheets
```

同步要求：

- 試算表需提供可匯出 CSV 的網址
- 第一列欄位名稱需符合專案定義
- `image_url` 需為公開可讀的 `https` 圖片網址
- `size_standard` 建議統一為 `205/55R16` 這類格式

## 部署重點

### Zeabur

1. 把專案推到 GitHub
2. 在 Zeabur 匯入 repository
3. 建立 PostgreSQL service
4. 設定環境變數：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `DATABASE_URL`
   - `DATABASE_SSL`
   - `GOOGLE_SHEETS_CSV_URL`
   - `SYNC_DEACTIVATE_MISSING`
5. 執行一次資料庫初始化與同步
6. 部署後取得公開網址

### LINE Developers Console

Webhook URL 範例：

```text
https://your-app.zeabur.app/webhook
```

記得開啟 `Use webhook`，再按 `Verify` 測試。

## 目前專案特性

- 已有 `.env.example`
- 已有 PostgreSQL 初始化與測試指令
- 已有 Google Sheets 同步腳本
- 查詢端與維護端已分離，查詢效能不受 Google Sheets 影響

## 建議後續補強

- 增加 Zeabur 排程，自動執行 `npm run db:sync:sheets`
- 補上更完整的錯誤排查文件
- 加入更多同步驗證，例如重複 `tire_code` 或失效圖片網址檢查
