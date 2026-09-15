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

### 重置本地測試資料

在後台亂改商品、分區、設定之後，想恢復成一開始的初始狀態，執行：

```bash
npm run db:reset:local
```

- 只重置「目錄型」資料（商品、分區、狀態標籤、客戶欄位、組合折扣、系統設定），**不會清空訂單資料**（`orders`/`order_items` 等表）
- **只影響本地資料庫**，不會動到 Cloudflare 正式環境的資料，可以放心測試
- 重置後商品應為 60 筆、分區 7 筆（與 `drizzle/seed.sql` 的內容一致）

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
