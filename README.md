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
| `npm run db:migrate:staging` / `db:migrate:production` | 套用最新的資料庫表格結構到 Cloudflare staging／正式環境 D1 |
| `npm run db:seed:local` | 把 `drizzle/seed.sql` 的初始資料灌入本地 D1（表格已有資料時會因主鍵重複而失敗） |
| `npm run db:seed:staging` / `db:seed:production` | 把 `drizzle/seed.sql` 的初始資料灌入 staging／正式環境 D1 |
| `npm run db:seed:dump` | 把**目前本地 D1 的資料**重新匯出覆蓋 `drizzle/seed.sql`（用來把資料庫現狀固化成新的種子檔） |
| **`npm run db:reset:local`** | **一鍵重置本地測試資料**：清空商品／分區／狀態／客戶欄位／組合折扣／系統設定，重新灌入 `drizzle/seed.sql` 的初始值 |
| `npm run db:clear-orders:local` | 清空本地 D1 的訂單資料（`orders`／`order_items`／`order_field_values`／`order_failure_logs`），不影響商品/分區/設定 |
| `npm run db:clear-orders:staging` / `db:clear-orders:production` | 清空 staging／**正式環境** D1 的訂單資料，不影響商品/分區/設定 |

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
  npx wrangler d1 execute qiwish-db --remote --env="" --file=drizzle/reset-local.sql
  npm run db:seed:production
  ```

### 清空測試訂單

在正式環境或本地測試下單流程後，想把測試產生的訂單清掉（後台「訂單管理」頁面會顯示這些訂單），執行：

```bash
npm run db:clear-orders:staging      # 清 staging 的訂單
npm run db:clear-orders:production   # 清正式環境的訂單
npm run db:clear-orders:local        # 清本地的訂單
```

- 清空 `orders`／`order_items`／`order_field_values`／`order_failure_logs` 四張表，**不影響商品／分區／狀態／客戶欄位／組合折扣／系統設定**
- 這是直接刪除資料庫資料的操作，**沒有回頭路**，執行前確認自己要清的是 `local`、`staging` 還是 `production`
- 若要把資料庫完全清空重來（目錄資料 + 訂單一起），依序執行：
  ```bash
  npm run db:clear-orders:production
  npx wrangler d1 execute qiwish-db --remote --env="" --file=drizzle/reset-local.sql
  npm run db:seed:production
  ```
  （清本地：三行分別換成 `db:clear-orders:local`、`--local`（拿掉 `--remote --env=""`）、`db:seed:local`）

### 本地、staging、正式環境是三份獨立的資料庫

`wrangler dev`（不加 `--remote`）預設連的是**本地模擬的 D1**（存在 `.wrangler/state/` 資料夾裡的 SQLite 檔案），跟 Cloudflare 帳號上的 staging D1（`qiwish-db-staging`）、正式環境 D1（`qiwish-db`）是分開的三份資料，不會自動同步：

- `db:migrate:*` 只同步「表格結構」，不會同步資料內容
- 在本地或 staging 新增/修改/刪除的資料，不會出現在正式環境；反之亦然
- 若要讓正式環境的資料庫結構跟上最新的 schema 變更，記得在部署前執行 `npm run db:migrate:production`（staging 則是 `db:migrate:staging`）

## 其他常用指令

```bash
npx tsc --noEmit                # 型別檢查
npm run lint                    # ESLint
npm run cf:deploy:staging       # 建置並部署到 staging
npm run cf:deploy:production    # 建置並部署到正式環境
```

## Staging 環境

staging 是和正式站完全分開的測試站，跑同一份程式碼，但有自己的 Worker、資料庫、圖片空間與機密值，在上面下單、上傳圖片、改設定都不會影響正式站。設定寫在 `wrangler.jsonc` 的 `env.staging` 區塊。

| | staging | 正式環境（production） |
|---|---|---|
| Worker | `qiwish-nextjs-staging` | `qiwish-nextjs` |
| D1 | `qiwish-db-staging` | `qiwish-db` |
| R2 | `qiwish-images-staging` | `qiwish-images` |
| 機密值來源 | `.dev.vars.staging` | `.dev.vars` |
| 網址 | `https://qiwish-nextjs-staging.<帳號子網域>.workers.dev` | 正式網域／`qiwish-nextjs.<帳號子網域>.workers.dev` |

**日常流程**：改程式 → `npm run cf:deploy:staging` → 在 staging 測試 → `npm run cf:deploy:production`。

### 第一次建立 staging（僅需做一次）

1. 建立資料庫：`npx wrangler d1 create qiwish-db-staging`，把回傳的 `database_id` 填進 `wrangler.jsonc` 的 `env.staging.d1_databases[0].database_id`（取代 `REPLACE_WITH_STAGING_DATABASE_ID`）
2. 建立圖片空間：`npx wrangler r2 bucket create qiwish-images-staging`
3. 建資料表並灌入初始資料：`npm run db:migrate:staging && npm run db:seed:staging`
4. 準備機密值：`cp .env.example .dev.vars.staging` 後填值
   - `ADMIN_PASSWORD` 用和正式站不同的密碼，`SESSION_SECRET` 另外用 `openssl rand -hex 32` 產生
   - **`EMAIL_TEST_REDIRECT_TO` 必填**（例如自己的信箱），staging 的訂單信才不會寄給業主或真實客人
5. 設定機密值：`npm run secrets:set:staging`
6. 部署：`npm run cf:deploy:staging`，完成訊息裡會顯示 staging 網址
7. 用 Cloudflare Access 擋住外人（見下方）

### 用 Cloudflare Access 限制只有指定的人能進 staging

> **目前狀態：尚未啟用。** staging 暫時是公開的，但所有回應都帶 `X-Robots-Tag: noindex`（`next.config.ts`，只在 `cf:deploy:staging` 建置時加上），不會被搜尋引擎收錄。Access 等業主開通 Zero Trust 後再設定。

Access 是白名單制：只有列在名單上的 email 能收到登入驗證碼，其他人一律進不去。50 人以內免費，不需要改程式，正式站不受影響。

**前提**：帳號第一次使用 Zero Trust 時要先開通（取團隊名稱、選 Free 方案，可能要綁信用卡），這一步需要帳號的 **Billing** 權限。只有部署權限的成員會看到「You need the following edit permissions on this account: Billing」，這時請業主登入 Cloudflare，在左側選單 **Zero Trust** 完成開通。開通只需要做一次。

1. Cloudflare 後台 → **Workers & Pages** → `qiwish-nextjs-staging` → 上排的 **Domains** 分頁，在 Worker URL 的 Production 那一列（`qiwish-nextjs-staging.qi-wish-maker.workers.dev`）點 **Enable Access →**。Preview 那一列（`*-qiwish-nextjs-staging...`）用不到，直接把右側開關關掉
2. 到 **Zero Trust** → **Access** → **Applications**，編輯剛產生的應用程式的 Policy：Action 選 **Allow**，Include 選 **Emails**，填入允許的 email（例如自己和業主）
3. 登入方式用預設的 **One-time PIN**（寄 6 位數驗證碼到 email）
4. 用無痕視窗打開 staging 網址，應該先看到 Cloudflare 的登入頁
5. 之後串接藍新金流時，要再加一條 **Bypass** policy 讓 `/api/payment/newebpay/*` 不必登入，藍新的付款通知才打得進來（見 [NEWEBPAY.md](NEWEBPAY.md)）

### 本機登入了多個 Cloudflare 帳號時

`wrangler d1 ...` 指令（`db:migrate:*`、`db:seed:*`、`db:clear-orders:*`）在本機登入了多個 Cloudflare 帳號時，不會讀 `wrangler.jsonc` 裡的 `account_id`，會出現「More than one account available」錯誤，或要你手動選帳號。這時在指令前面加上業主帳號的 ID，以免選錯帳號：

```bash
CLOUDFLARE_ACCOUNT_ID=985157e1a45e6a773cde42803a0ce8f4 npm run db:migrate:staging
```

## 部署到正式環境

### 第一次上線（僅需做一次）

1. **登入 Cloudflare**：`npx wrangler login`
2. **建立 D1 資料庫**（若還沒建立）：`npx wrangler d1 create qiwish-db`，把回傳的 `database_id` 填進 `wrangler.jsonc` 的 `d1_databases[0].database_id`
3. **套用資料庫結構到正式環境**：`npm run db:migrate:production`
4. **灌入初始資料到正式環境**：`npm run db:seed:production`
5. **準備機密值**：`cp .env.example .dev.vars`，編輯 `.dev.vars` 填入實際值（見下方「機密值（secrets）怎麼拿」）
6. **設定正式環境的機密值**：`npm run secrets:set:production`（會讀 `.dev.vars` 逐一設定，過程會要求你按 y 確認）
7. **部署**：`npm run cf:deploy:production`

### 之後每次更新程式碼

```bash
npm run cf:deploy:staging      # 先上 staging 測試
npm run cf:deploy:production   # 確認沒問題再上正式環境
```

不會動到 secrets 或資料庫資料，只更新程式碼與靜態資源。若這次有新的 migration，先跑對應環境的 `db:migrate:*` 再部署。

### 之後要更換某個機密值（例如換密碼、換 API key）

1. 編輯 `.dev.vars`，改掉要換的那一項
2. `npm run secrets:set:production` 重新設定（會把 `.dev.vars` 目前的四個值全部覆蓋一次到正式環境；staging 用 `secrets:set:staging`，讀 `.dev.vars.staging`）

也可以只換單一個，不跑整支腳本：
```bash
npx wrangler secret put ADMIN_PASSWORD --env=""       # 正式環境
npx wrangler secret put ADMIN_PASSWORD --env staging   # staging
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
   npx wrangler secret put EMAIL_FROM --env=""
   ```
   貼上新地址即可，不需要重新部署

### 部署後的驗證清單

- 開啟正式網址（`npx wrangler deployments list` 或部署完成訊息裡會顯示網址），確認首頁能正常瀏覽、商品能加入購物車、結帳流程能跑完
- 訪問 `/admin`，確認會被導向登入頁（未登入時）
- 用 `ADMIN_PASSWORD` 登入後台，確認能看到後台導覽列與各分頁
- 送出一筆測試訂單，確認店家信箱（`site_settings` 的 `notify.shopEmail`，在後台「系統設定」頁設定）收得到 Resend 寄出的通知信

## 備份

正式環境的資料分成三種，各自的備份方式不同：

| 資料 | 存放位置 | 備份方式 |
|---|---|---|
| 訂單、商品、分區、後台設定 | D1 資料庫 `qiwish-db` | Time Travel（自動）＋ 定期手動匯出 `.sql` |
| 後台上傳的圖片（商品照、分區背景、LINE Pay QR） | R2 bucket `qiwish-images` | 用 rclone 同步到本機（無內建備份） |
| 程式碼 | GitHub `no-ttt/tea-shop` | `git commit` + `git push` |

### 資料庫：Time Travel（誤刪時救急用）

D1 會自動記錄所有變更，不需要任何設定，可還原到保留期限內的任一時間點（免費方案 7 天、付費方案 30 天）：

```bash
npx wrangler d1 time-travel info qiwish-db                                     # 查看目前時間點的書籤
npx wrangler d1 time-travel restore qiwish-db --timestamp=2026-10-12T10:00:00Z # 還原到指定時間（UTC）
```

- 還原會**覆蓋整個正式環境資料庫**，該時間點之後的所有訂單與修改都會消失，執行前先做一次手動匯出（見下方）
- 超過保留期限就救不回來，所以不能當成唯一的備份

### 資料庫：手動匯出（長期備份，建議每週一次）

```bash
mkdir -p backups
npx wrangler d1 export qiwish-db --remote --output=backups/db-$(date +%Y-%m-%d).sql
```

- 匯出檔包含完整表格結構與所有資料
- ⚠️ **匯出檔內含顧客姓名、電話、地址等個資，絕對不要 commit 到 GitHub**。存放在本機或私人雲端硬碟即可（`.gitignore` 的 `/backups/` 已排除此資料夾）

**從匯出檔還原**：匯出檔包含 `CREATE TABLE`，不能直接灌回已有資料的資料庫，要建一個新的空資料庫來還原：

1. `npx wrangler d1 create qiwish-db-restore`，記下回傳的 `database_id`
2. `npx wrangler d1 execute qiwish-db-restore --remote --file=backups/db-2026-10-12.sql`
3. 把 `wrangler.jsonc` 的 `d1_databases[0].database_name` / `database_id` 改成新資料庫的值
4. `npm run cf:deploy:production`

### 圖片（R2）

R2 沒有內建的版本紀錄或備份，刪掉就沒了。不過本系統替換/刪除圖片時不會真的從 R2 刪檔，實際遺失風險不高。需要完整備份時：

1. Cloudflare 後台 → **R2** → **Manage R2 API Tokens** → 建立一組唯讀（Object Read）token，記下 Access Key ID、Secret Access Key 與 S3 endpoint
2. 安裝 [rclone](https://rclone.org)（`brew install rclone`），執行 `rclone config` 新增一個 remote：類型選 `s3`、provider 選 `Cloudflare`，填入上一步的值，remote 名稱取 `r2`
3. 同步整個 bucket 到本機：
   ```bash
   rclone sync r2:qiwish-images backups/images
   ```

### 機密值

`ADMIN_PASSWORD`、`RESEND_API_KEY`、`SESSION_SECRET` 等設定到 Cloudflare 後**無法再讀出來**，`.dev.vars` 也不在 Git 裡。請另外存一份在密碼管理器，否則電腦遺失時只能全部重新產生（見上方「之後要更換某個機密值」）。
