import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SiteSettings } from "./data";
import type { CustomerField, OrderConfirmation, OrderPayload, PaymentMethod, ShippingMethod } from "./types";

const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  mail: "郵寄",
  cvs: "超商取貨",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank: "銀行匯款",
  linepay: "LINE Pay",
};

// 寄信時訂單已通過 createOrder 驗證，兩者都不會是 null；後備文字只是讓型別完整。
const shippingLabel = (method: ShippingMethod | null) => (method ? SHIPPING_METHOD_LABEL[method] : "未選擇");
const paymentLabel = (method: PaymentMethod | null) => (method ? PAYMENT_METHOD_LABEL[method] : "未選擇");

// 配送／付款資訊（店主通知與消費者確認信共用）：超商要帶出是哪一家，付款要帶出客人回報的對帳碼。
function shippingAndPaymentRows(payload: OrderPayload): Array<[string, string]> {
  const rows: Array<[string, string]> = [["配送方式", shippingLabel(payload.shippingMethod)]];
  if (payload.shippingMethod === "cvs") {
    rows.push(["超商", payload.cvsType ?? ""], ["超商門市", payload.cvsStoreName ?? ""]);
  } else {
    rows.push(["地址", `${payload.customer.zip ?? ""} ${payload.customer.address ?? ""}`]);
  }
  rows.push(["付款方式", paymentLabel(payload.paymentMethod)]);
  if (payload.paymentMethod === "bank") {
    rows.push(["匯款後五碼", payload.bankTransferLast5 ?? ""]);
  } else if (payload.paymentMethod === "linepay") {
    rows.push(["LINE Pay 後三碼", payload.linePayLast3 ?? ""]);
  }
  if (payload.note?.trim()) rows.push(["訂單備註", payload.note.trim()]);
  return rows;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderEmailHtml(
  payload: OrderPayload,
  confirmation: OrderConfirmation,
  customerFields: CustomerField[],
): string {
  // 欄位名稱沿用後台「顧客欄位」的設定（含免運門檻說明），店家改說明時信件會跟著變
  const lineIdLabel = customerFields.find((f) => f.id === "lineId")?.label ?? "LINE ID";

  const itemsHtml = confirmation.cart
    .map((item) => `<li>${escapeHtml(item.name)}（${escapeHtml(item.detail)}）× NT$${escapeHtml(String(item.price))}</li>`)
    .join("");

  const rows: Array<[string, string]> = [
    ["訂單編號", confirmation.orderId],
    ["客戶姓名", payload.customer.name],
    ["電話", payload.customer.phone],
    ["Email", payload.customer.email],
    // 只有滿免運門檻時前台才會顯示並要求填寫 LINE ID（店家要據此邀請加入會員群組），未達門檻時不會有值
    ...(payload.customer.lineId ? [[lineIdLabel, payload.customer.lineId] as [string, string]] : []),
    ...shippingAndPaymentRows(payload),
    ["商品小計", `NT$${confirmation.subtotal}`],
    ["組合折扣", confirmation.bundleName ? `${confirmation.bundleName}（-NT$${confirmation.bundleDiscountAmount}）` : "無"],
    ["運費", `NT$${confirmation.shippingFee}`],
    ["應付總額", `NT$${confirmation.total}`],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");

  return `
    <h2>新訂單通知 ${confirmation.orderId}</h2>
    <table>${rowsHtml}</table>
    <h3>訂購明細</h3>
    <ul>${itemsHtml}</ul>
  `;
}

function buildCustomerEmailHtml(payload: OrderPayload, confirmation: OrderConfirmation): string {
  const itemsHtml = confirmation.cart
    .map((item) => `<li>${escapeHtml(item.name)}（${escapeHtml(item.detail)}）× NT$${escapeHtml(String(item.price))}</li>`)
    .join("");

  const rows: Array<[string, string]> = [
    ["訂單編號", confirmation.orderId],
    ...shippingAndPaymentRows(payload),
    ["商品小計", `NT$${confirmation.subtotal}`],
    ["組合折扣", confirmation.bundleName ? `${confirmation.bundleName}（-NT$${confirmation.bundleDiscountAmount}）` : "無"],
    ["運費", `NT$${confirmation.shippingFee}`],
    ["應付總額", `NT$${confirmation.total}`],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");

  return `
    <h2>感謝您的訂購，${escapeHtml(payload.customer.name)}！</h2>
    <p>您的訂單 ${confirmation.orderId} 已成立，以下是訂單明細：</p>
    <table>${rowsHtml}</table>
    <h3>訂購明細</h3>
    <ul>${itemsHtml}</ul>
  `;
}

// fire-and-forget：呼叫端不 await，失敗只記錄不影響訂單建立結果；環境變數未設定時直接略過，不視為錯誤。
// 店主與消費者各寄一封，兩封各自失敗互不影響（Promise.allSettled），任一封失敗都會拋出彙總錯誤供呼叫端記錄。
export async function sendOrderNotification(
  payload: OrderPayload,
  confirmation: OrderConfirmation,
  settings: SiteSettings,
  customerFields: CustomerField[],
): Promise<void> {
  const { env } = getCloudflareContext();
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM 未設定，略過訂單通知");
    return;
  }

  const resend = new Resend(apiKey);
  const tasks: Array<Promise<void>> = [];

  // 本地測試模式：.dev.vars 設了 EMAIL_TEST_REDIRECT_TO 時，所有信都改寄到這個地址，
  // 不會寄到業主或客人的真實信箱；主旨標上原本的收件人方便核對。正式環境不設定這個變數。
  const redirectTo = env.EMAIL_TEST_REDIRECT_TO;
  if (redirectTo) console.warn(`[email] 測試模式：所有訂單信改寄到 ${redirectTo}`);
  const recipient = (to: string, subject: string) =>
    redirectTo ? { to: redirectTo, subject: `[測試] ${subject}（原收件人：${to}）` } : { to, subject };

  if (settings.notify.shopEmail) {
    tasks.push(
      resend.emails.send({
        from,
        ...recipient(settings.notify.shopEmail, `新訂單通知 ${confirmation.orderId}`),
        html: buildOrderEmailHtml(payload, confirmation, customerFields),
      }).then(({ error }) => {
        if (error) throw new Error(`寄送店主通知失敗：${error.message}`);
      }),
    );
  } else {
    console.warn("[email] 尚未設定收件信箱（notify.shopEmail），略過店主通知");
  }

  if (payload.customer.email) {
    tasks.push(
      resend.emails.send({
        from,
        ...recipient(payload.customer.email, `訂單確認 ${confirmation.orderId}`),
        html: buildCustomerEmailHtml(payload, confirmation),
      }).then(({ error }) => {
        if (error) throw new Error(`寄送消費者確認信失敗：${error.message}`);
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; "));
  }
}
