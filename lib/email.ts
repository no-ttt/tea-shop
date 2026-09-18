import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SiteSettings } from "./data";
import type { OrderConfirmation, OrderPayload } from "./types";

const SHIPPING_METHOD_LABEL: Record<OrderPayload["shippingMethod"], string> = {
  mail: "郵寄",
  cvs: "超商取貨",
};

const PAYMENT_METHOD_LABEL: Record<OrderPayload["paymentMethod"], string> = {
  bank: "銀行匯款",
  linepay: "LINE Pay",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderEmailHtml(payload: OrderPayload, confirmation: OrderConfirmation): string {
  const itemsHtml = confirmation.cart
    .map((item) => `<li>${escapeHtml(item.name)}（${escapeHtml(item.detail)}）× NT$${escapeHtml(String(item.price))}</li>`)
    .join("");

  const rows: Array<[string, string]> = [
    ["訂單編號", confirmation.orderId],
    ["客戶姓名", payload.customer.name],
    ["電話", payload.customer.phone],
    ["Email", payload.customer.email],
    ["配送方式", SHIPPING_METHOD_LABEL[payload.shippingMethod]],
    payload.shippingMethod === "cvs"
      ? ["超商門市", payload.cvsStoreName ?? ""]
      : ["地址", `${payload.customer.zip ?? ""} ${payload.customer.address ?? ""}`],
    ["付款方式", PAYMENT_METHOD_LABEL[payload.paymentMethod]],
    ["商品小計", `NT$${confirmation.subtotal}`],
    ["組合折扣", confirmation.bundleName ? `${confirmation.bundleName}（-NT$${confirmation.bundleDiscountAmount}）` : "無"],
    ["運費", `NT$${confirmation.shippingFee}`],
    ["應付總額", `NT$${confirmation.total}`],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
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
    ["配送方式", SHIPPING_METHOD_LABEL[payload.shippingMethod]],
    payload.shippingMethod === "cvs"
      ? ["超商門市", payload.cvsStoreName ?? ""]
      : ["地址", `${payload.customer.zip ?? ""} ${payload.customer.address ?? ""}`],
    ["付款方式", PAYMENT_METHOD_LABEL[payload.paymentMethod]],
    ["商品小計", `NT$${confirmation.subtotal}`],
    ["組合折扣", confirmation.bundleName ? `${confirmation.bundleName}（-NT$${confirmation.bundleDiscountAmount}）` : "無"],
    ["運費", `NT$${confirmation.shippingFee}`],
    ["應付總額", `NT$${confirmation.total}`],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
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

  if (settings.notify.shopEmail) {
    tasks.push(
      resend.emails.send({
        from,
        to: settings.notify.shopEmail,
        subject: `新訂單通知 ${confirmation.orderId}`,
        html: buildOrderEmailHtml(payload, confirmation),
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
        to: payload.customer.email,
        subject: `訂單確認 ${confirmation.orderId}`,
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
