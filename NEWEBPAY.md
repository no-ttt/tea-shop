<!-- 狀態：規劃中，尚未實作（2026-10-15） -->

# 串接藍新金流（NewebPay MPG）：信用卡 + LINE Pay

## 背景

目前結帳頁有兩種付款方式，「匯款後五碼」和「LINE Pay QR 後三碼」，都是客人自己回報的確認碼，沒有實際收款（見 TODO.md 第 3 項）。業主之後要改成**只有信用卡和 LINE Pay，並且實際跳轉到金流付款**。因為藍新的 MPG 付款頁同時支援這兩種，所以只要串接藍新一家。

業主的正式商店帳號還在申請中，先用**開發者自己在藍新測試平台申請的測試商店**（MerchantID / HashKey / HashIV）開發。之後換成正式帳號時，只要換掉 secrets，並把 `NEWEBPAY_ENV` 改成 `production`，不需要改程式碼。

## 流程

```
結帳頁選「信用卡」或「LINE Pay」→ 按送出訂單
 → POST /api/orders：沿用 createOrder 的驗證，寫入一筆 pending_payment 訂單（此時不寄信）
   回傳 { orderId, newebpay: { gatewayUrl, MerchantID, TradeInfo, TradeSha, Version } }
 → 前端組出隱藏的 <form method=POST action=gatewayUrl> 並自動送出，跳到藍新付款頁
 → 藍新伺服器呼叫 POST /api/payment/newebpay/notify（主要依據）
     驗證 TradeSha → 解密 TradeInfo → 確認 Status=SUCCESS、MerchantID 和 Amt 與訂單一致
     → UPDATE orders SET status='paid' WHERE id=? AND status='pending_payment'
     → 只有這次更新真的改到資料列時，才用 waitUntil 寄出 sendOrderNotification（避免重複寄信）
 → 客人的瀏覽器被藍新以 POST 送到 /api/payment/newebpay/return
     用同樣的驗證和冪等更新（當作 notify 遲到時的備援）→ 303 導向 /order/[id]
 → /order/[id] 頁面顯示「付款成功」或「付款未完成」
```

## 修改內容

### 1. 資料庫（`lib/db/schema.ts`，接著跑 `npm run db:generate` 產生新的 migration）
- `orders.paymentMethod` 的 enum 改成 `["credit", "linepay", "bank"]`。`bank` 只保留給既有的舊訂單；SQLite 不會檢查 enum，這只影響 TypeScript 型別。
- 新增欄位：
  - `payment_trade_no`：藍新的交易序號
  - `paid_at`
  - `payment_result`：藍新回傳的解密後 JSON，查帳用
  - `payload_snapshot`：下單時的 OrderPayload JSON。付款成功時需要它來呼叫現有的 `sendOrderNotification(payload, …)`，這樣寄信的程式碼不用改
- `bank_transfer_last5` / `line_pay_last3` 舊欄位保留，不刪除，避免舊資料出問題。

### 2. 新增 `lib/newebpay.ts`（唯一和藍新溝通的地方，角色和 `lib/storage.ts` 一樣）
- `buildMpgForm(order, method, origin)`：
  - 組出 URL-encoded 參數：MerchantID、RespondType=JSON、TimeStamp、Version、MerchantOrderNo=orderId、Amt、ItemDesc（最多 50 字）、Email、ReturnURL、NotifyURL、ClientBackURL；依客人選的方式只開 `CREDIT=1` 或 `LINEPAY=1`。
  - 用 Web Crypto 做 AES-256-CBC 加密（key 用 HashKey，iv 用 HashIV，Web Crypto 內建 PKCS7 padding），輸出 hex，得到 TradeInfo。
  - `TradeSha = SHA256("HashKey=…&" + TradeInfo + "&HashIV=…")`，轉大寫。
- `parseNewebpayCallback(formData)`：先驗證 TradeSha，再解密並 parse JSON，回傳 `{ status, merchantOrderNo, amt, tradeNo, raw }`。
- 正式和測試的付款網址依 `NEWEBPAY_ENV` 切換（ccore.newebpay.com / core.newebpay.com）。實作時以藍新最新版 MPG 技術文件為準，確認 Version 號和參數名稱。
- 不需要新增任何 npm 套件。

### 3. 資料層（`lib/data.ts`）
- `createOrder`：寫入 `payload_snapshot`，不再存 last3/last5。回傳型別加上 `newebpay` 表單資料（也可以由 route 呼叫 `buildMpgForm` 產生）。
- 新增 `markOrderPaid({ orderId, amt, tradeNo, raw })`：比對訂單總額，執行條件式 UPDATE，回傳 `{ updated: boolean, payload, confirmation }`，供呼叫端決定要不要寄信。
- 新增 `getOrderPublicStatus(orderId)`：只回傳 `{ orderId, status, total, paymentMethod }`，不含個資，給 /order/[id] 使用。
- `linePayQr` 的結帳版本比對（`CHECKOUT_VERSION_SECTIONS`）改成註解停用；`branding.linePayQrImage` 設定值保留。

### 4. API routes
- `app/api/orders/route.ts`：移除建單當下的寄信，改成回傳藍新表單資料。origin 從 request 取得，在 staging 上就會是 staging 的網址。
- 新增 `app/api/payment/newebpay/notify/route.ts`：驗證成功回 `200 "OK"`；簽章錯誤回 400，並記錄到 `order_failure_logs`。
- 新增 `app/api/payment/newebpay/return/route.ts`：處理完後 303 導向 `/order/[id]`。
- 新增 `app/api/orders/[id]/route.ts`（GET）：只回傳公開狀態。
- `proxy.ts` 只保護 `/admin`，以上新路由不需要額外處理，實作時再確認一次 matcher。

### 舊付款方式的處理原則：註解停用，不刪除
業主之後可能又改回來，所以「匯款後五碼」和「LINE Pay QR 後三碼」相關的程式都**用註解停用，不刪除**：
- 每段被註解的程式上方加上統一標記 `// [舊付款-停用] 改用藍新金流，保留以備恢復`。之後要恢復時，`grep "舊付款-停用"` 就能找到所有位置。
- `BankTransferModal.tsx`、`LinePayQrModal.tsx`、`LinePayConfirmModal.tsx` 三個元件檔原封不動保留，只把引用它們的 import 和 JSX 註解掉。
- `bankTransferLast5` / `linePayLast3` 欄位和型別保留成 optional。資料庫欄位與 `branding.linePayQrImage` 設定值也保留，只是不再讀取或顯示。
- 只有在註解會讓 TypeScript 或 lint 失敗的地方（例如未使用的變數）才會順手調整，並同樣標上標記。

### 5. 前台
- `lib/types.ts`：`PaymentMethod = "credit" | "linepay"`；`"bank"` 和舊欄位依上面的原則保留並加註解。
- `lib/order-validation.ts`：付款方式只檢查是否為 credit 或 linepay，last3/last5 的檢查改成註解。
- `CheckoutOverlay.tsx`：按鈕改成「信用卡」和「LINE Pay」，送出按鈕改成「前往付款」。舊的匯款與 QR 流程（三個 Modal 的開啟邏輯和 JSX）改成註解。
- `Storefront.tsx#handleSubmitOrder`：建單成功後組出表單並 `submit()`。409 的 `paid:` 判斷改成 false，因為還沒付款。
- 新增 `app/order/[id]/page.tsx`（Server Component，透過 `fetchJson` 呼叫 `/api/orders/[id]`）：成功時顯示訂單編號和金額；失敗時顯示「付款未完成，請重新下單」，附回首頁的按鈕。現有的 `OrderCompleteOverlay` 改為不再使用。

### 6. 後台
- 設定頁的 LINE Pay QR 上傳區塊改成註解停用（`app/admin/(protected)/settings`）。`lib/admin-data.ts` 的驗證保留，不影響運作。
- 訂單列表顯示付款方式（信用卡 / LINE Pay / 舊資料的匯款）、藍新交易序號、付款時間（`lib/admin-data.ts#mapOrderRowWithoutItems`）。

### 7. Email（`lib/email.ts`）
- `PAYMENT_METHOD_LABEL` 加上 `credit: "信用卡"`；last3/last5 這兩列保留（舊訂單才會有值，新訂單不會顯示）。改在付款成功時寄出，內容從「訂單成立」改成「付款完成」。

### 8. 設定與文件
- `.env.example` 和 `worker-configuration.d.ts`：新增 `NEWEBPAY_MERCHANT_ID`、`NEWEBPAY_HASH_KEY`、`NEWEBPAY_HASH_IV`、`NEWEBPAY_ENV`。全部是 secrets，依 wrangler.jsonc 註解的原則，不放進 vars。
- 更新 `CLAUDE.md`（「Explicitly not ported」中的 LINE Pay 敘述、`POST /api/orders` 段落），以及 `TODO.md` 第 3 項。

## 先不做（MVP 範圍外）
- 付款失敗後用同一筆訂單重新付款。目前做法是訂單停在 `pending_payment`，客人重新下單，業主在後台把舊訂單改成取消。
- 自動取消逾時沒付款的訂單、退款 API、信用卡分期。

## 驗證方式
1. `npx tsc --noEmit`、`npm run lint`、`npm run cf:build`，確認路由表裡有 `/api/payment/newebpay/*` 和 `/order/[id]`。
2. 寫一個一次性的 node script，用藍新文件上的範例 HashKey/IV 和明文，比對 `lib/newebpay.ts` 加密出來的 TradeInfo 和 TradeSha 是否和文件範例一致。
3. 在 staging 上測試，因為 staging 有公開網址，藍新的付款通知打得進來，不需要 `cloudflared tunnel`。把測試商店的三個值加進 `.dev.vars.staging`，執行 `npm run secrets:set:staging`、`npm run db:migrate:staging`、`npm run cf:deploy:staging`。Cloudflare Access 要先加一條 **Bypass** policy，讓 `/api/payment/newebpay/*` 不必登入，否則藍新的 notify 和 return 會被擋在登入頁。
4. 實際走一次購物 → 信用卡 → 藍新測試頁，用測試卡號 4000-2211-1111-1111 付款。確認 notify 有收到、D1 訂單變成 `paid` 且 `payment_trade_no` 有值、只寄出一封信（`EMAIL_TEST_REDIRECT_TO`）、`/order/[id]` 顯示成功。
5. 在藍新頁按取消或返回，確認訂單維持 `pending_payment`、不寄信、頁面顯示付款未完成。
6. 用 curl 送一個竄改過 TradeSha 的請求到 notify，確認回 400，訂單沒有變動。
7. 如果測試商店有開通 LINE Pay，也照第 4 點跑一次；沒開通就等正式帳號再測。
