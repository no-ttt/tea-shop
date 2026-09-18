# 待辦事項

這份文件記錄專案目前的進度與後續規劃。消費者購物流程（分區瀏覽 → 加入購物車 → 結帳）與後台管理 CMS（含資料庫、登入驗證、主題/商業規則設定）已完成遷移。完整實作過程與分批驗證紀錄見 `/Users/no/.claude/plans/sqlite-shimmering-valiant.md`（Claude Code 計畫檔）。

## 1. 後台管理 CMS —— 已完成

`app/admin/**` 已全面串接真正的後端：Cloudflare D1 資料庫 + `lib/admin-data.ts` + `app/api/admin/**` 提供完整 CRUD（產品、產區、組合優惠、客戶欄位、產品狀態、訂單狀態、系統設定），單一管理密碼 + HMAC 簽章 cookie 登入驗證（`proxy.ts` 保護 `/admin/**` 與 `/api/admin/**`，支援後台修改密碼、資料庫覆蓋環境變數預設值），字體大小/顏色與運費規則/通知信箱改為 `site_settings` 資料表儲存、後台可編輯，前台透過 `app/layout.tsx` 動態注入 CSS 變數套用。

**維持不做**：原網站「匯出網頁」分頁（資料庫架構下沒有對應需求）；購買紀錄的 Excel 匯出（原本靠 Google Sheets，這次改直接查 D1，Excel 匯出視未來需要再評估）；產品圖片改為後台輸入網址而非檔案上傳（R2 物件儲存需要綁定付款方式才能啟用，即使免費額度內不扣款，已決定不綁卡）。

## 2. Formspree／Google Apps Script 真實串接 —— 已完成（改用 Resend + D1）

原網站的作法見 [ORIGINAL_INTEGRATIONS.md](ORIGINAL_INTEGRATIONS.md)。這次的替代方案：

- Google Sheets 完全由 Cloudflare D1 取代，訂單資料（`orders`/`order_items`/`order_field_values`）直接寫入資料庫。
- Email 通知改用 **Resend**（取代 Formspree），訂單建立成功後以 fire-and-forget 方式寄送通知信給店家（`lib/email.ts`），寄信失敗不影響訂單建立結果，只記錄在伺服器 log。
- `order_failure_logs` 資料表記錄**系統性訂單失敗**（D1 交易寫入失敗等未預期例外），可在後台「訂單管理」的失敗記錄分頁查看；一般客戶輸入驗證失敗（如空購物車）維持回傳 400，不特別記錄。

## 3. LINE Pay／匯款金流 —— 維持現況，暫不處理

目前的「匯款後五碼」「LINE Pay 後三碼」都只是使用者自行回報的確認碼，並沒有真正對接金流或銀行 API 做核對，這點與原網站相同。

**建議**：若未來要接真正的第三方金流（例如 LINE Pay Online API），需要新增伺服器端的付款狀態查詢與 callback 處理，`OrderConfirmation` 的 `status` 欄位也要從固定的 `"pending_payment"` 改成依實際金流狀態變化（資料庫已支援 `paid`/`cancelled` 狀態值，後台可手動切換，方便未來擴充成自動化）。

## 4. 購物車持久化 —— 已決定不做

購物車目前是純 React state（`Storefront.tsx` 的 `cart`），重新整理頁面會清空。原規劃有一版 `localStorage` 方案（掛載後才讀取的 hydration 模式，避免 SSR 不一致問題），但**使用者最終決定不實作**，維持現況。若未來要重新評估，方案設計仍留在計畫檔歷史紀錄中可參考。

## 5. 訂單沒有真正儲存 —— 已完成

`createOrder()` 通過驗證後，會用 `db.batch(...)` 原子寫入 D1 的 `orders`/`order_items`/`order_field_values`（含自訂客戶欄位值）。訂單編號格式 `QW${Date.now()}${隨機三碼}`，重新整理或伺服器重啟都不會遺失資料。後台「訂單管理」頁可查看列表、展開明細、切換狀態（`pending_payment`/`paid`/`cancelled`）。

## 6. 自動化測試 —— 維持現況，暫不處理

目前的驗證方式是手動 `curl` API、`npx tsc --noEmit`、`npm run lint`、`npm run cf:build`，以及用 Playwright 手動跑過瀏覽器互動流程，還沒有寫成可重複執行的測試檔案。

**建議**：至少替 `lib/pricing.ts`（金額計算，尤其是組合折扣與運費門檻）與 `POST /api/orders`／`lib/admin-data.ts` 的驗證規則補上單元測試，這幾處的邏輯最容易在未來修改時被不小心改壞。

## 部署目標：Cloudflare

專案部署到 Cloudflare（Workers + D1），這也是選用 Cloudflare D1 而非一般 SQLite 檔案的原因（`better-sqlite3` 等原生模組無法在 Cloudflare Workers 執行）。Next.js 的 Cloudflare 轉接器用 `@opennextjs/cloudflare`（已確認可支援 Next.js 16，`proxy.ts` 的 Node.js middleware 支援目前仍屬實驗性但功能正常）。

**部署前尚待完成的一次性手動步驟**（非程式碼變更）：
- Resend 寄件網域驗證（DNS 設定）——正式環境寄信前需要在 Resend 完成；開發階段可先用 sandbox 模式測試。
- 正式環境的 secrets 設定：`wrangler secret put RESEND_API_KEY` / `EMAIL_FROM` / `ADMIN_PASSWORD` / `SESSION_SECRET`。
- 確認 `wrangler.jsonc` 的 D1 `database_id` 已填入正式資料庫 ID，並已對正式（`--remote`）資料庫套用過 migration 與 seed。
