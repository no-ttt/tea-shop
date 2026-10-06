import type { CustomerField, OrderPayload } from "./types";

/**
 * 結帳表單的填寫檢查，前後台共用同一份規則與錯誤訊息：
 * - 前台 CheckoutOverlay 在點「送出訂單」時先跑一次，缺漏直接標出欄位，不必等伺服器回應；
 * - 後端 createOrder 仍再跑一次（不能信任前端），訊息與原網站 submitOrder() 一致。
 * 這個檔案不能 import 任何只在伺服器可用的東西（DB、Cloudflare context），前台也會打包它。
 *
 * field 是出錯欄位的代號，前台用來捲動並標示該欄位：
 * cf_<customer_fields.id>、shippingMethod、cvsStoreName、custGiftName、orderNote、paymentMethod。
 */
export interface OrderFormError {
  message: string;
  field: string;
}

/** 匯款帳號後五碼／LINE Pay 回報的電話後三碼：必須剛好是這麼多位數字（付款視窗與伺服器共用） */
export const BANK_LAST5_LENGTH = 5;
export const LINEPAY_LAST3_LENGTH = 3;
export const isDigits = (value: string | undefined, length: number) =>
  typeof value === "string" && value.length === length && /^\d+$/.test(value);

/** 訂單備註字數上限（避免異常大量內容塞進 DB／email） */
export const ORDER_NOTE_MAX_LENGTH = 500;

export type OrderFormInput = Pick<
  OrderPayload,
  | "customer"
  | "customFieldValues"
  | "birthday"
  | "isGift"
  | "giftName"
  | "shippingMethod"
  | "cvsStoreName"
  | "paymentMethod"
  | "bankTransferLast5"
  | "linePayLast3"
  | "note"
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// lineId 不放在這個集合裡：它在下方迴圈最前面被單獨攔截並 continue，
// 永遠不會走到這個集合的判斷；且下方取值的分支本來就沒有處理 lineId，
// 若誤放進來、日後又有人動了前面的 continue 守衛，會悄悄退回 undefined 重現舊 bug。
const BUILTIN_FIELD_IDS = new Set(["name", "phone", "email", "zip", "address"]);

function builtinValue(input: OrderFormInput, fieldId: string): string | undefined {
  switch (fieldId) {
    case "name":
      return input.customer.name;
    case "phone":
      return input.customer.phone;
    case "email":
      return input.customer.email;
    case "zip":
      return input.customer.zip;
    case "address":
      return input.customer.address;
    default:
      return undefined;
  }
}

/** 回傳第一個錯誤（依畫面由上到下的順序），全部填妥則回傳 null。 */
export function validateOrderForm(
  input: OrderFormInput,
  customerFields: CustomerField[],
  qualifiesForGroup: boolean,
): OrderFormError | null {
  const customFieldValues = input.customFieldValues ?? {};

  for (const field of customerFields) {
    if (field.id === "lineId") {
      if (qualifiesForGroup && !input.customer.lineId?.trim()) {
        return { message: `請填寫${field.label}`, field: "cf_lineId" };
      }
      continue;
    }

    if (field.id === "birthday") {
      if (field.required && !input.birthday) {
        return { message: `請填寫${field.label}`, field: "cf_birthday" };
      }
      continue;
    }

    // 郵遞區號/地址只在選「郵寄地址」時需要；還沒選取貨方式時也先跳過，交給下方的「請選擇取貨方式」提示，
    // 避免客人還沒選就先被要求填地址。
    if (input.shippingMethod !== "mail" && (field.id === "zip" || field.id === "address")) continue;

    // 內建欄位用明確屬性取值；店家在後台新增的自訂欄位（builtin: false）從 customFieldValues 依 id 查表。
    const value = BUILTIN_FIELD_IDS.has(field.id) ? builtinValue(input, field.id) : customFieldValues[field.id];

    if (field.required && !value?.trim()) {
      return { message: `請填寫${field.label}`, field: `cf_${field.id}` };
    }

    if (field.type === "email" && value && !EMAIL_RE.test(value)) {
      return { message: `請填寫正確格式的${field.label}`, field: `cf_${field.id}` };
    }
  }

  if (input.shippingMethod !== "mail" && input.shippingMethod !== "cvs") {
    return { message: "請選擇取貨方式", field: "shippingMethod" };
  }

  if (input.shippingMethod === "cvs" && !input.cvsStoreName?.trim()) {
    return { message: "請填寫超商門市名稱", field: "cvsStoreName" };
  }

  if (input.isGift && !input.giftName?.trim()) {
    return { message: "已勾選送禮，請填寫收禮人姓名", field: "custGiftName" };
  }

  if (input.note !== undefined && typeof input.note !== "string") {
    return { message: "訂單備註格式錯誤", field: "orderNote" };
  }
  if (input.note && input.note.length > ORDER_NOTE_MAX_LENGTH) {
    return { message: `訂單備註請勿超過 ${ORDER_NOTE_MAX_LENGTH} 字`, field: "orderNote" };
  }

  if (input.paymentMethod !== "bank" && input.paymentMethod !== "linepay") {
    return { message: "請選擇付款方式", field: "paymentMethod" };
  }

  if (input.paymentMethod === "bank" && !input.bankTransferLast5) {
    return { message: "請先完成匯款資訊確認（填寫匯款後五碼）", field: "paymentMethod" };
  }
  if (input.paymentMethod === "bank" && !isDigits(input.bankTransferLast5, BANK_LAST5_LENGTH)) {
    return { message: "匯款後五碼需為完整 5 位數字，請重新點選「匯款」填寫", field: "paymentMethod" };
  }

  if (input.paymentMethod === "linepay" && !input.linePayLast3) {
    return { message: "請先掃描 QR Code 完成付款，並確認付款狀態", field: "paymentMethod" };
  }
  if (input.paymentMethod === "linepay" && !isDigits(input.linePayLast3, LINEPAY_LAST3_LENGTH)) {
    return { message: "電話後三碼需為完整 3 位數字，請重新點選「LINE Pay」填寫", field: "paymentMethod" };
  }

  return null;
}
