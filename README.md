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
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/your-spreadsheet-id/export?format=csv&gid=0
SYNC_DEACTIVATE_MISSING=false
```

### 變數說明

- `LINE_CHANNEL_ACCESS_TOKEN`：LINE Messaging API Channel access token
- `LINE_CHANNEL_SECRET`：LINE Messaging API Channel secret
- `PORT`：伺服器監聽埠
- `DATABASE_URL`：PostgreSQL 連線字串
- `DATABASE_SSL`：如果資料庫需要 SSL，設定為 `true`
- `GOOGLE_SHEETS_CSV_URL`：Google Sheets 匯出的 CSV 連結
- `SYNC_DEACTIVATE_MISSING`：若為 `true`，試算表中不存在的輪胎會在資料庫中設成 `inactive`

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

從 Google Sheets 同步輪胎資料：

```bash
npm run db:sync:sheets
```

先檢查資料格式但不寫入資料庫：

```bash
npm run db:sync:sheets -- --dry-run
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

## Google Sheets 同步方案

建議架構：

1. Google Sheets 作為後台維護介面
2. 同步腳本把試算表資料 upsert 到 PostgreSQL
3. LINE Bot 查詢時只讀 PostgreSQL

這樣的好處是：

- 維護資料很直覺，不用改程式碼
- 查詢速度不受 Google Sheets 影響
- 圖片、價格、上下架都能批次同步

### 試算表欄位

Google Sheets 第一列請使用以下欄位名稱：

```text
tire_code,brand,pattern,size_standard,load_index,speed_rating,price,image_url,is_active
```

欄位說明：

- `tire_code`：每筆輪胎的唯一代碼，建議固定不變，例如 `MICHELIN-PRIMACY-4-205-55R16`
- `brand`：品牌
- `pattern`：花紋名稱
- `size_standard`：輪胎規格，像 `205/55R16`
- `load_index`：載重指數，可留空
- `speed_rating`：速度級別，可留空
- `price`：整數價格，可留空
- `image_url`：公開可讀的 `https` 圖片網址
- `is_active`：`true` 或 `false`

### Google Sheets 連結設定

目前專案採用最簡單穩定的做法：直接讀 Google Sheets 匯出的 CSV。

你可以把試算表設定為知道連結的人可檢視，然後使用這種格式的匯出網址：

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=0
```

把這個網址填到 `.env` 或 Zeabur 環境變數的 `GOOGLE_SHEETS_CSV_URL`。

### 同步流程

同步腳本位於 [scripts/sync-tires-from-sheets.js](/Users/yangyuen/Documents/line-bot-hello/scripts/sync-tires-from-sheets.js)，會做這些事：

- 抓取 Google Sheets CSV
- 驗證欄位是否齊全
- 正規化 `size_standard`
- 依照 `tire_code` 執行 upsert
- 視 `SYNC_DEACTIVATE_MISSING` 決定是否把缺少的資料設為 `inactive`

資料表也已加入 `tire_code` 唯一索引，定義在 [sql/tires_schema.sql](/Users/yangyuen/Documents/line-bot-hello/sql/tires_schema.sql)。

### 速度與穩定性

這個方案不會影響 LINE 查詢速度，因為使用者查詢時仍然只打 PostgreSQL。

會變慢的只有同步當下，但那是後台作業，通常不影響使用者體驗。相較之下，如果每次查詢都直接讀 Google Sheets，延遲和穩定性都會差很多，所以不建議。

### Zeabur 建議做法

如果你想先簡單上線，建議先用這兩種方式之一：

1. 手動在 Zeabur Console 執行 `npm run db:sync:sheets`
2. 之後再加排程，每小時或每天同步一次

如果未來你想做成完全私有的 Google Sheets，同步來源可以再升級成 Google Sheets API 或 Apps Script Web App；目前這版先以部署最簡單、維護成本最低為主。

### 日常同步 SOP

當你在 Google Sheets 更新輪胎資料後，建議照這個流程手動同步：

1. 確認有修改到正確的工作表，且欄位名稱沒有被改掉
2. 確認 `image_url` 是公開可讀的 `https` 圖片網址
3. 在專案目錄先執行：

```bash
npm run db:sync:sheets -- --dry-run
```

4. 如果 `dry-run` 沒有報錯，再執行正式同步：

```bash
npm run db:sync:sheets
```

5. 同步完成後，到 LINE 實際測試常用規格，例如：

```text
205/55R16
215/45R17
225/50R17
```

### 常見判斷方式

- 如果 `dry-run` 成功，代表 Google Sheets 連線、欄位格式、資料格式都正常
- 如果正式同步成功，終端機會顯示新增、更新、停用的筆數
- 如果你只改了價格或圖片，通常會看到 `updatedCount` 增加
- 如果你新增新輪胎，通常會看到 `insertedCount` 增加

### 注意事項

- `tire_code` 要固定，不要隨意改，不然系統會把它當成新的輪胎資料
- `size_standard` 建議統一用像 `205/55R16` 的格式
- `SYNC_DEACTIVATE_MISSING=false` 時，試算表少掉的資料不會自動下架，比較適合一開始使用
- 如果未來要改成「試算表沒出現就自動下架」，再把 `SYNC_DEACTIVATE_MISSING` 改成 `true`

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
