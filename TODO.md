# 待辦事項

這份文件記錄專案目前的進度與後續規劃。消費者購物流程（分區瀏覽 → 加入購物車 → 結帳）已 100% 遷移完成。

**目前正在進行**：資料庫（Cloudflare D1）+ 後台管理 CRUD + 登入驗證 + 主題/商業規則設定 + 購物車持久化 + 訂單 Email 通知。完整計畫與分批進度追蹤請見 `/Users/no/.claude/plans/sqlite-shimmering-valiant.md`（Claude Code 計畫檔）。以下依原本的待辦分類，標註各項目目前狀態。

## 1. 後台管理 CMS —— 進行中

原網站有一個完整的前端 CMS（密碼登入 + 多分頁管理面板），管理商品、分區、字體大小與顏色、客戶資料欄位、組合折扣、購買紀錄、其他設定。Next.js 版的後台頁面（`app/admin/**`）畫面與表單已經做好，但目前尚未串接真正的後端。

**這次計畫要做的**：
- 資料庫改用 Cloudflare D1（取代原本規劃的 mock data / 待定資料庫），`lib/admin-data.ts` + `app/api/admin/**` 提供完整 CRUD（產品、產區、組合優惠、客戶欄位、產品狀態、訂單狀態、系統設定）
- 登入驗證：單一管理密碼 + HMAC 簽章 cookie，`middleware.ts` 保護 `/admin/**` 與 `/api/admin/**`，並支援後台修改密碼（資料庫覆蓋環境變數預設值）
- **字體大小與顏色**：這次一併實作，改為 `site_settings` 資料表儲存、後台可編輯，前台透過 `app/layout.tsx` 注入 CSS 變數動態套用（不再是寫死的 design tokens）
- 「匯出網頁」分頁：維持移除，不會恢復（資料庫架構下沒有對應需求）
- 購買紀錄查詢（原本串 Google Sheets）：這次改為直接查詢 D1 的 `orders`/`order_items` 資料表，不再需要 Google Sheets；Excel 匯出功能視後續需要再評估是否補上

## 2. Formspree／Google Apps Script 真實串接 —— 進行中（改用 Resend + D1）

`POST /api/orders` 原本只做驗證與金額計算，不會呼叫任何外部服務。原網站的作法見 [ORIGINAL_INTEGRATIONS.md](ORIGINAL_INTEGRATIONS.md)。

**這次計畫要做的**：
- Google Sheets 完全由 Cloudflare D1 取代，訂單資料直接寫入資料庫，不再需要外部試算表
- Email 通知改用 **Resend**（取代 Formspree），訂單建立成功後以 fire-and-forget 方式寄送通知信給店家，寄信失敗不影響訂單建立結果，並記錄在伺服器 log
- 新增 `order_failure_logs` 資料表，記錄**系統性訂單失敗**（資料庫寫入失敗等未預期例外），供後台查看排查；一般客戶輸入驗證失敗（如空購物車）維持回傳 400，不特別記錄

## 3. LINE Pay／匯款金流 —— 維持現況，暫不處理

目前的「匯款後五碼」「LINE Pay 後三碼」都只是使用者自行回報的確認碼，並沒有真正對接金流或銀行 API 做核對，這點與原網站相同。**本次資料庫/後台專案明確排除這塊**，維持自報確認碼的人工核對方式。

**建議**：若未來要接真正的第三方金流（例如 LINE Pay Online API），需要新增伺服器端的付款狀態查詢與 callback 處理，`OrderConfirmation` 的 `status` 欄位也要從固定的 `"pending_payment"` 改成依實際金流狀態變化（資料庫已預留 `paid`/`cancelled` 狀態值，方便未來擴充）。

## 4. 購物車持久化 —— 進行中

購物車目前是純 React state（`Storefront.tsx` 的 `cart`），重新整理頁面會清空。

**這次計畫要做的**：用 `localStorage` 保存購物車內容，頁面載入時還原（採用掛載後才讀取的 hydration 模式，避免 SSR 不一致問題）。

## 5. 訂單沒有真正儲存 —— 進行中

`createOrder()` 目前只回傳模擬的訂單確認，訂單資料不會被儲存在任何地方。

**這次計畫要做的**：訂單與明細寫入 D1 的 `orders`/`order_items` 資料表（交易寫入），訂單編號可查詢，重新整理或伺服器重啟都不會遺失資料。

## 6. 自動化測試 —— 維持現況，暫不處理

目前的驗證方式是手動 `curl` API、`npx tsc --noEmit`、`npm run lint`，以及手動跑過一次瀏覽器互動流程，還沒有寫成可重複執行的測試檔案。**本次資料庫/後台專案明確排除這塊**。

**建議**：至少替 `lib/pricing.ts`（金額計算，尤其是組合折扣與運費門檻）與 `POST /api/orders` 的驗證規則補上單元測試，這兩處的邏輯最容易在未來修改時被不小心改壞。

## 部署目標：Cloudflare

專案確定部署到 Cloudflare（Workers/Pages + D1），這也是選用 Cloudflare D1 而非一般 SQLite 檔案的原因（`better-sqlite3` 等原生模組無法在 Cloudflare Workers 執行）。Next.js 的 Cloudflare 轉接器規劃使用 `@opennextjs/cloudflare`，但其對 Next.js 16 的支援狀態需在實作時另行查證確認。
