# 棋願製造 Next.js

茶葉電商網站消費者購物流程（分區瀏覽 → 加入購物車 → 結帳）+ 後台管理 CMS 的 Next.js 重寫版。詳細架構說明見 [CLAUDE.md](CLAUDE.md)，待辦事項見 [TODO.md](TODO.md)。

## 本地開發

專案部署目標是 Cloudflare（Workers + D1），後台管理功能需要讀寫 Cloudflare D1 資料庫，**純 `next dev` 拿不到 D1 連線**，本地開發／測試後台功能一律要用 Wrangler 包裝的方式啟動：

```bash
npm run cf:build && npx wrangler dev --port 8787
```

等終端機顯示 `Ready on http://localhost:8787`，開瀏覽器連 `http://localhost:8787` 即可（前台首頁與 `/admin/**` 後台頁面都在這個網址下）。

若只是要改前台畫面、不涉及資料庫讀寫，也可以用一般的 `npm run dev`（較快，有 Turbopack 熱更新），但看到的資料會是空的/報錯，因為拿不到 D1 binding。

## 資料庫（本地 D1）指令

| 指令 | 用途 |
|---|---|
| `npm run db:migrate:local` | 套用最新的資料庫表格結構（schema）到本地 D1 |
| `npm run db:migrate:remote` | 套用最新的資料庫表格結構到 Cloudflare 正式環境 D1 |
| `npm run db:seed:local` | 把 `drizzle/seed.sql` 的初始資料灌入本地 D1（表格已有資料時會因主鍵重複而失敗） |
| `npm run db:seed:remote` | 把 `drizzle/seed.sql` 的初始資料灌入正式環境 D1 |
| `npm run db:seed:dump` | 把**目前本地 D1 的資料**重新匯出覆蓋 `drizzle/seed.sql`（用來把資料庫現狀固化成新的種子檔） |
| **`npm run db:reset:local`** | **一鍵重置本地測試資料**：清空商品／分區／狀態／客戶欄位／組合折扣／系統設定，重新灌入 `drizzle/seed.sql` 的初始值 |
| `npm run db:clear-orders:local` | 清空本地 D1 的訂單資料（`orders`／`order_items`／`order_field_values`／`order_failure_logs`），不影響商品/分區/設定 |
| `npm run db:clear-orders:remote` | 清空**正式環境** D1 的訂單資料，不影響商品/分區/設定 |

### 重置本地測試資料（商品／分區／設定）

在後台亂改商品、分區、設定之後，想恢復成一開始的初始狀態，執行：

```bash
npm run db:reset:local
```

- 只重置「目錄型」資料（商品、分區、狀態標籤、客戶欄位、組合折扣、系統設定），**不會清空訂單資料**（`orders`/`order_items` 等表）
- **只影響本地資料庫**，不會動到 Cloudflare 正式環境的資料，可以放心測試
- 重置後商品應為 60 筆、分區 7 筆（與 `drizzle/seed.sql` 的內容一致）
- 目前**沒有 `remote` 版本**（會動到正式環境的商品資料，風險較高，故意沒做成一鍵指令）。真的需要在正式環境重置商品/分區/設定時，手動執行：
  ```bash
  npx wrangler d1 execute qiwish-db --remote --file=drizzle/reset-local.sql
  npm run db:seed:remote
  ```

### 清空測試訂單

在正式環境或本地測試下單流程後，想把測試產生的訂單清掉（後台「訂單管理」頁面會顯示這些訂單），執行：

```bash
npm run db:clear-orders:remote   # 清正式環境的訂單
npm run db:clear-orders:local    # 清本地的訂單
```

- 清空 `orders`／`order_items`／`order_field_values`／`order_failure_logs` 四張表，**不影響商品／分區／狀態／客戶欄位／組合折扣／系統設定**
- 這是直接刪除資料庫資料的操作，**沒有回頭路**，執行前確認自己要清的是 `local` 還是 `remote`
- 若要把資料庫完全清空重來（目錄資料 + 訂單一起），依序執行：
  ```bash
  npm run db:clear-orders:remote
  npx wrangler d1 execute qiwish-db --remote --file=drizzle/reset-local.sql
  npm run db:seed:remote
  ```
  （把上面三行的 `remote` 都換成 `local` 就是清本地）

### 本地與正式環境（remote）是兩份獨立的資料庫

`wrangler dev`（不加 `--remote`）預設連的是**本地模擬的 D1**（存在 `.wrangler/state/` 資料夾裡的 SQLite 檔案），跟 Cloudflare 帳號上真正的正式環境 D1 是分開的兩份資料，不會自動同步：

- `db:migrate:*` 只同步「表格結構」，不會同步資料內容
- 本地測試時新增/修改/刪除的資料，不會出現在正式環境；反之亦然
- 若要讓正式環境的資料庫結構跟上最新的 schema 變更，記得在部署前執行 `npm run db:migrate:remote`

## 其他常用指令

```bash
npx tsc --noEmit   # 型別檢查
npm run lint       # ESLint
npm run cf:deploy  # 建置並部署到 Cloudflare（正式環境）
```

## 部署到正式環境

### 第一次上線（僅需做一次）

1. **登入 Cloudflare**：`npx wrangler login`
2. **建立 D1 資料庫**（若還沒建立）：`npx wrangler d1 create qiwish-db`，把回傳的 `database_id` 填進 `wrangler.jsonc` 的 `d1_databases[0].database_id`
3. **套用資料庫結構到正式環境**：`npm run db:migrate:remote`
4. **灌入初始資料到正式環境**：`npm run db:seed:remote`
5. **準備機密值**：`cp .env.example .dev.vars`，編輯 `.dev.vars` 填入實際值（見下方「機密值（secrets）怎麼拿」）
6. **設定正式環境的機密值**：`npm run secrets:set`（會讀 `.dev.vars` 逐一設定，過程會要求你按 y 確認）
7. **部署**：`npm run cf:deploy`

### 之後每次更新程式碼

```bash
npm run cf:deploy
```

不會動到 secrets 或資料庫資料，只更新程式碼與靜態資源。

### 之後要更換某個機密值（例如換密碼、換 API key）

1. 編輯 `.dev.vars`，改掉要換的那一項
2. `npm run secrets:set` 重新設定（會把 `.dev.vars` 目前的四個值全部覆蓋一次到正式環境）

也可以只換單一個，不跑整支腳本：
```bash
npx wrangler secret put ADMIN_PASSWORD
```
（指令執行後會提示貼上新值）

**注意**：換 `SESSION_SECRET` 會讓所有人（含店家自己）的後台登入 session 立即失效，需要重新登入；換 `ADMIN_PASSWORD` 若後台已經設定過「覆蓋密碼」（在後台「系統設定」頁修改過密碼），這個環境變數不會生效，因為系統會優先比對資料庫裡的覆蓋密碼。

### 機密值（secrets）怎麼拿

| 變數 | 說明 | 怎麼拿 |
|---|---|---|
| `RESEND_API_KEY` | 訂單通知信服務的 API 金鑰 | 註冊 [resend.com](https://resend.com) → 後台左側 **API Keys** → 建立一組新的 key（權限選 Sending access 或 Full access）→ 複製產生的值（`re_` 開頭，只顯示一次） |
| `EMAIL_FROM` | 寄件地址 | 還沒驗證自己網域前，先用 Resend 後台顯示的 sandbox 測試地址（通常類似 `onboarding@resend.dev`）；驗證完網域後換成 `order@你的網域`（見下方「Resend 網域驗證」） |
| `ADMIN_PASSWORD` | 後台登入的預設密碼 | 自己決定一組夠強的密碼（建議 12 碼以上、混英數符號）。之後可在後台「系統設定」頁改密碼，改過之後系統優先用資料庫裡的新密碼 |
| `SESSION_SECRET` | 後台登入 session cookie 的簽章金鑰 | 不用自己想，終端機跑 `openssl rand -hex 32`，把跑出來那串貼上即可 |

### Resend 網域驗證（讓寄信地址變成你自己的網域）

不驗證網域也能上線，先用 Resend 提供的 sandbox 地址（`onboarding@resend.dev`）寄信即可，之後有網域了再回來做這一步，只需要重設 `EMAIL_FROM` 一個值，不用重新部署程式碼。

1. 登入 [resend.com](https://resend.com) 後台
2. 左側選單找 **Domains** → **Add Domain**，輸入你的網域（例如 `qiwish.com`）
3. Resend 會給你幾筆 DNS 記錄（通常是 TXT + CNAME，用於 SPF/DKIM 驗證），把這些記錄加到你網域的 DNS 服務商後台（例如 Cloudflare DNS、GoDaddy 等）
4. DNS 設定通常幾分鐘到數小時內生效，Resend 後台的網域狀態會從「Pending」變成「Verified」
5. 驗證通過後，把 `EMAIL_FROM` 改成該網域下的地址（例如 `order@qiwish.com`），執行：
   ```bash
   npx wrangler secret put EMAIL_FROM
   ```
   貼上新地址即可，不需要重新 `cf:deploy`

### 部署後的驗證清單

- 開啟正式網址（`npx wrangler deployments list` 或部署完成訊息裡會顯示網址），確認首頁能正常瀏覽、商品能加入購物車、結帳流程能跑完
- 訪問 `/admin`，確認會被導向登入頁（未登入時）
- 用 `ADMIN_PASSWORD` 登入後台，確認能看到後台導覽列與各分頁
- 送出一筆測試訂單，確認店家信箱（`site_settings` 的 `notify.shopEmail`，在後台「系統設定」頁設定）收得到 Resend 寄出的通知信
