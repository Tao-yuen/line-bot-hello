# LINE Tire Search Bot

這是一個可以部署到 Zeabur 的 LINE 輪胎規格查詢機器人。

使用者在 LINE 輸入例如 `205/55R16`、`20555R16`、`205 55 16` 這類文字時，系統會：

1. 先正規化成標準規格 `205/55R16`
2. 到 PostgreSQL 查詢對應輪胎資料
3. 隨機回傳 3 到 5 筆輪胎 Flex Message

## 功能

- Node.js + Express
- `@line/bot-sdk`
- LINE Webhook 驗證
- 輪胎規格正規化
- PostgreSQL 輪胎查詢
- LINE Flex Message Carousel 回傳
- `/` 與 `/health` 健康檢查

## 環境需求

- Node.js 18+
- LINE Messaging API channel
- PostgreSQL
- Zeabur 帳號

## 安裝

```bash
npm install
```

## 環境變數

請參考 `.env.example`：

```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=false
```

### 變數說明

- `LINE_CHANNEL_ACCESS_TOKEN`：LINE Messaging API Channel access token
- `LINE_CHANNEL_SECRET`：LINE Messaging API Channel secret
- `PORT`：伺服器監聽埠
- `DATABASE_URL`：PostgreSQL 連線字串
- `DATABASE_SSL`：如果資料庫需要 SSL，設定為 `true`

專案會優先讀取根目錄的 `.env`，也會使用系統環境變數。

## 本機啟動

```bash
npm start
```

預設會監聽 `3000`，若有設定 `PORT` 則會使用該值。

## PostgreSQL 資料表

專案附了兩個 SQL 檔：

- `sql/tires_schema.sql`
- `sql/tires_seed.sql`

你可以直接用 npm script 完成初始化，不需要手動跑 `psql`：

```bash
npm run db:init
```

匯入測試資料：

```bash
npm run db:seed
```

一次建立資料表並匯入測試資料：

```bash
npm run db:setup
```

如果你要專門驗證 webhook 的「查無資料」分支，可以直接跑：

```bash
npm run test:webhook:no-results
```

這個測試會模擬一筆資料庫沒有輪胎資料的 webhook 請求，確認程式會穩定回應，並且 log 會清楚標示查無資料。

## Zeabur PostgreSQL 設定

### 1. 建立 PostgreSQL

1. 登入 Zeabur
2. 開啟你的 Project
3. 新增 Service
4. 選擇 PostgreSQL
5. 讓 Zeabur 建立資料庫服務並等待啟動完成
6. 進入 PostgreSQL Service 的設定頁，複製連線資訊

### 2. 設定 `DATABASE_URL` 與 `DATABASE_SSL`

將 PostgreSQL 連線字串設定到應用程式的環境變數：

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

如果 Zeabur 提供的 PostgreSQL 需要 SSL，請設定：

```env
DATABASE_SSL=true
```

如果你的資料庫不需要 SSL，或你在本機用本地 PostgreSQL，則可以維持：

```env
DATABASE_SSL=false
```

### 3. 初始化資料庫

在部署前或部署後執行：

```bash
npm run db:setup
```

這會先建立 `tires` 資料表，再匯入測試資料。

## LINE 環境變數設定

請在 Zeabur 的 App 環境變數中設定：

```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
```

- `LINE_CHANNEL_ACCESS_TOKEN`：LINE Messaging API 的 channel access token
- `LINE_CHANNEL_SECRET`：LINE Messaging API 的 channel secret

如果少了這兩個值，`/webhook` 會維持 503 行為，無法完成 LINE 驗證。

## LINE Developers Console 設定

1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 開啟你的 Messaging API channel
3. 找到 Webhook 設定區
4. 將 Webhook URL 設為：

```text
https://your-app.zeabur.app/webhook
```

5. 開啟 `Use webhook`
6. 按 `Verify`

## Verify 失敗時的檢查清單

如果 LINE Console 的 `Verify` 沒過，建議依序檢查：

1. Webhook URL 是否完全正確，且結尾是 `/webhook`
2. Zeabur App 是否已成功部署且有對外網址
3. `LINE_CHANNEL_ACCESS_TOKEN` 是否正確
4. `LINE_CHANNEL_SECRET` 是否正確
5. LINE App 與 Zeabur App 的環境變數是否都已更新並重新部署
6. `Use webhook` 是否已開啟
7. `DATABASE_URL` 是否可連線
8. `DATABASE_SSL` 是否符合你的資料庫需求
9. Webhook 打到的服務是否真的跑在 `index.js`
10. 應用程式 log 是否有顯示 webhook 500 或 PostgreSQL 連線錯誤

如果你在 Zeabur 上有看到服務啟動，但 `Verify` 還是失敗，通常先查：

- LINE token / secret 是否寫錯
- Webhook URL 是否抄錯
- PostgreSQL 是否連不上
- 是否忘記重新部署

## 本機與上線測試流程

### 本機測試

1. 建立 `.env`
2. 設定 `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、`DATABASE_URL`
3. 執行：

```bash
npm run db:setup
```

4. 啟動服務：

```bash
npm start
```

5. 驗證 webhook 的「查無資料」分支：

```bash
npm run test:webhook:no-results
```

6. 用瀏覽器或 curl 測試：

```text
GET /
GET /health
```

7. 在 LINE 傳送：

```text
205/55R16
```

或：

```text
我要找20555R16輪胎
```

若你想快速確認沒有結果時的 log 與回應是否正常，也可以在本機直接重跑：

```bash
npm run test:webhook:no-results
```

### Zeabur 部署後測試

1. 確認 Zeabur App 已部署成功
2. 確認環境變數都已填好
3. 確認 PostgreSQL 已建立且 `npm run db:setup` 已執行過
4. 開啟 Zeabur 提供的網站網址，確認：

```text
GET /
GET /health
```

5. 到 LINE Developers Console 按 `Verify`
6. 在 LINE 私訊 bot，測試：

```text
205/55R16
```

7. 再測試一個不同格式：

```text
205 55 16
```

## 使用範例

使用者輸入：

```text
205/55R16
```

或：

```text
20555R16
```

系統會回傳 3 到 5 筆符合規格的輪胎 Flex Message。

## 健康檢查

- `GET /`
- `GET /health`

兩個 endpoint 都會回傳服務狀態與 LINE 是否已配置。

## 注意事項

- 不要把 `.env` commit 到 GitHub
- 輪胎查詢前都會先做規格正規化
- 若資料庫暫時失敗，Webhook 會回覆「系統暫時忙碌中，請稍後再試。」
- 若找不到輪胎資料，系統會回覆友善提示，而不是直接報錯
