# 原網站的訂單通知機制

這份文件說明原本 `origin.html`（單一靜態頁面版本）的 `submitOrder()` 怎麼把訂單送出去。這次 Next.js 版本的 `POST /api/orders`（`lib/data.ts` 的 `createOrder()`）**沒有**實作以下任何一項——只做驗證與金額計算，回傳模擬的訂單確認，不會真的發出任何請求。之後要接回真實通知/紀錄時可以參考這份文件。

## 1. Formspree（訂單 email 通知）

送出訂單時，原網站先用 `buildOrderFormData()` 把訂單內容組成瀏覽器原生 `FormData`（姓名、電話、地址、品項明細、金額、付款方式等，全部用中文欄位名稱，例如「訂購明細」「商品小計」「應付總額」），再用：

```js
fetch(SITE.formspree, { method: "POST", body: formData, headers: { "Accept": "application/json" } })
```

送到 Formspree 的表單網址（原本設定的是 `https://formspree.io/f/mykrlapo`）。Formspree 收到後會轉寄成一封 email 給店家——這是店家收到「有新訂單」通知的唯一管道，沒有其他即時通知方式。

## 2. Google Apps Script（訂單寫入 Google 試算表）

`sendOrderToSheet()` 把訂單整理成 JSON：

```js
{ date, orderId, name, phone, items: [{name, weight, qty, amount}], total, paymentMethod }
```

用 `fetch(SITE.ordersEndpoint, { method: "POST", body: JSON.stringify(payload) })` 送到一個部署成「Web App」的 Google Apps Script 網址（原本設定的網址結尾是 `/exec`）。

該 Apps Script 後端程式（原始碼在 `origin.html` 的 `APPS_SCRIPT_CODE` 常數裡，並在後台「顯示 Apps Script 程式碼」按鈕顯示給商家複製貼上到自己的 Google 試算表）：

- `doPost(e)`：把訂單裡的每個品項拆成一列，寫入試算表的「訂單記錄」分頁（欄位：購買日期、訂單編號、客戶姓名、電話、品項、克數、數量、單項金額、訂單總額、付款方式）
- `doGet(e)`：依 `start`/`end` 這兩個 URL 參數（日期字串）查詢並回傳符合區間的訂單列，供後台「購買紀錄」分頁查詢與 Excel 匯出使用

也就是說，Google 試算表在原網站裡同時扮演「訂單資料庫」與「後台可查詢的訂單紀錄」兩種角色，因為原網站沒有真正的後端資料庫。

## 3. 送出順序與容錯

```js
if (formspreeValid) {
  fetch(formspreeUrl, {...})
    .then(() => { sendOrderToSheet(); finish(); })
    .catch(() => { alert("訂單通知寄送失敗，請確認網路連線後再試一次..."); });
} else {
  sendOrderToSheet();
  finish();
}
```

- 先呼叫 Formspree，成功後才呼叫 `sendOrderToSheet()`
- 若後台沒有設定 Formspree 網址，就直接呼叫 `sendOrderToSheet()`
- `sendOrderToSheet()` 本身用 `.catch(()=>{})` 靜默吞掉失敗，不會有任何提示
- 不論 Google Sheets 那邊成功與否，都會呼叫 `finish()` 讓畫面跳轉到訂單完成頁

換句話說，原網站的通知機制是「盡力而為」（best-effort），沒有重試機制，Google Sheets 那邊失敗甚至不會讓客人知道。訂單是否真的被記錄下來，實務上要靠店家自己去檢查 email 或試算表。

## 之後怎麼接回來

建議不要照抄原本這套「兩個各自獨立、best-effort、沒有重試」的機制，而是在資料庫接上之後：

1. `createOrder()` 驗證通過後，先把訂單寫進資料庫（這是唯一「訂單真的存在」的依據，不再依賴 email 或試算表）
2. 訂單寫入成功後，再非同步觸發 email 通知（可以用正式的 email 服務，例如 Resend/SendGrid，取代 Formspree）
3. 如果還是想要試算表這種「店家自己看得懂、不用開後台」的查詢方式，可以做成資料庫寫入後的一個非同步同步工作，而不是像原本那樣跟訂單送出流程綁在一起、失敗了也不會重試
