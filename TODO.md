# 待辦事項

這份文件記錄這次從 `origin.html`（原本的棋願製造單頁式商店）遷移到 Next.js 時，刻意沒有做的項目，以及原因與後續建議。消費者購物流程（分區瀏覽 → 加入購物車 → 結帳）已 100% 遷移完成，資料層目前是 mock data，透過 API routes 提供。

## 1. 後台管理 CMS

原網站有一個完整的前端 CMS（密碼登入 `adminLogin()` + 多分頁管理面板 `#adminOverlay`），可以管理：

- 商品（新增/編輯/刪除、圖片上傳、狀態標籤）
- 分區（新增/編輯、桌機/手機底圖上傳）
- 字體大小與顏色（即時預覽）
- 客戶資料欄位（新增/改名/刪除/必填切換）
- 組合折扣（新增/刪除）
- 購買紀錄查詢（串接 Google Sheets）+ Excel 匯出
- 其他設定（Formspree/Google Sheets 網址、LINE Pay QR、管理密碼、匯出整份網站）

**這次沒有實作**，理由：CMS 的資料寫入對象應該是真正的資料庫，而這次的 `lib/data.ts` 還是 mock data，在資料庫確定之前先做 CMS 介面容易做兩次工。

**建議**：等 `lib/data.ts` 換成真資料庫查詢後，再依照現有的 GET API routes（`/api/regions`、`/api/products`、`/api/statuses`、`/api/checkout/fields`、`/api/bundle-discounts`）分別補上對應的 POST/PATCH/DELETE，並在 `/admin` 路由下做一個需要登入才能進入的管理介面。

## 2. Formspree／Google Apps Script 真實串接

`POST /api/orders` 目前只做驗證與金額計算，不會呼叫任何外部服務。原網站怎麼做的，見 [ORIGINAL_INTEGRATIONS.md](ORIGINAL_INTEGRATIONS.md)。

**建議**：正式上線前，在 `lib/data.ts` 的 `createOrder()` 驗證通過之後，依照 `ORIGINAL_INTEGRATIONS.md` 的說明加上對應的通知/寫入呼叫，或改用更穩定的方案（例如正式的 email 服務、資料庫直接寫入取代 Google Sheets）。

## 3. LINE Pay／匯款金流

目前的「匯款後五碼」「LINE Pay 後三碼」都只是使用者自行回報的確認碼，並沒有真正對接金流或銀行 API 做核對，這點與原網站相同（原網站本來就是人工核對後五碼/後三碼，不是即時金流串接）。

**建議**：若未來要接真正的第三方金流（例如 LINE Pay Online API），需要新增伺服器端的付款狀態查詢與 callback 處理，`OrderConfirmation` 的 `status` 欄位也要從目前固定的 `"pending_payment"` 改成會依實際金流狀態變化。

## 4. 購物車持久化

購物車目前是純 React state（`Storefront.tsx` 的 `cart`），重新整理頁面會清空。這與原網站行為一致（原網站的 `cart` 也只是頁面內的 JS 變數，沒有做 localStorage 持久化）。

**建議**：若要改善使用者體驗，可以用 `localStorage` 或 `sessionStorage` 保存購物車內容，頁面載入時還原。

## 5. 訂單沒有真正儲存

`createOrder()` 目前只回傳模擬的訂單確認，訂單資料不會被儲存在任何地方（重新整理後訂單完成頁的資料也會消失，因為它只存在於 `Storefront.tsx` 的 state 裡）。

**建議**：資料庫接上後，`createOrder()` 應該把訂單寫入資料庫並回傳可查詢的訂單編號，讓客人或店家之後可以用訂單編號查詢訂單狀態。

## 6. 自動化測試

目前的驗證方式是手動 `curl` API、`npx tsc --noEmit`、`npm run lint`，以及用 Playwright 手動跑過一次瀏覽器互動流程，還沒有寫成可重複執行的測試檔案（例如 Vitest + Playwright Test）。

**建議**：至少替 `lib/pricing.ts`（金額計算，尤其是組合折扣與運費門檻）與 `POST /api/orders` 的驗證規則補上單元測試，這兩處的邏輯最容易在未來修改時被不小心改壞。
