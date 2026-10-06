export type WeightOption = 30 | 80 | 150;

export interface Region {
  id: string;
  title: string;
  subtitle: string;
  note: string | null;
  /** 分頁介紹（多行，顯示在副標題下方）；未填為 null */
  description: string | null;
  bgPos: string;
  bgImage: string;
  bgImageMobile: string;
}

export interface ProductStatus {
  id: string;
  label: string;
  type: "purchasable" | "tag";
  color: string | null;
}

export interface Product {
  id: string;
  name: string;
  region: string;
  /** 售完/預告商品可能沒有設定價格 */
  prices: Record<"30" | "80" | "150", number> | null;
  /** 克數以外的自訂購買選項（後台設定名稱與價格）；未設定為 null */
  customOption: { label: string; price: number } | null;
  note: string | null;
  statusId: string;
  images: string[];
}

/** 前台選購時選到的規格：克數，或商品的自訂選項 */
export type ProductOptionSelection = number | "custom";

/** 自訂選項名稱字數上限（後台輸入框與伺服器驗證共用） */
export const CUSTOM_OPTION_LABEL_MAX_LENGTH = 12;

export interface CustomerField {
  id: string;
  label: string;
  type: "text" | "tel" | "email" | "date";
  required: boolean;
  builtin: boolean;
}

export interface BundleDiscount {
  id: string;
  name: string;
  productIds: string[];
  discountType: "amount" | "percent";
  discountValue: number;
}

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  detail: string;
  price: number;
  /**
   * 克數。前台加入購物車時一定會帶，伺服器靠它對照資料庫的現行價格；
   * 從 order_items 讀回的舊訂單明細沒有存這個欄位，所以是 optional。
   */
  weight?: number;
  /** 選的是商品的自訂選項（此時沒有 weight）；伺服器依此改用 custom_option_price 對照價格 */
  custom?: boolean;
}

/**
 * 購物車與資料庫現況不一致的品項（客人開著舊頁面時，店家在後台改了狀態或價格）。
 * - unavailable：商品已售完/預告/被刪除，或該克數已無價格，應從購物車移除
 * - priceChanged：價格已調整，應以 newPrice 取代
 */
export type CartIssue =
  | { kind: "unavailable"; key: string; name: string; detail: string; reason: string }
  | { kind: "priceChanged"; key: string; name: string; detail: string; oldPrice: number; newPrice: number };

/** 客人頁面上的結帳相關設定，哪幾部分已與資料庫不同 */
export interface CheckoutSettingsChanges {
  customerFields: boolean;
  bundles: boolean;
  /** 運費或免運門檻 */
  shipping: boolean;
  linePayQr: boolean;
}

export interface CheckoutCheckResponse {
  issues: CartIssue[];
  changed: CheckoutSettingsChanges;
  /** 以資料庫現況（排除無法購買品項、套用新價格/折扣/運費）算出的金額 */
  totals: OrderTotals;
  /** 目前的運費設定，前台用來提示新的運費/免運門檻與還差多少免運 */
  shipping: { freeThreshold: number; fee: number };
}

export type ShippingMethod = "mail" | "cvs";
export type PaymentMethod = "bank" | "linepay";

export interface OrderPayload {
  cart: CartLine[];
  customer: {
    name: string;
    phone: string;
    lineId?: string;
    email: string;
    zip?: string;
    address?: string;
  };
  /** 店家在後台新增的自訂客戶欄位（CustomerField.builtin === false）填寫值，key 為欄位 id */
  customFieldValues?: Record<string, string>;
  birthday?: string;
  isGift: boolean;
  giftName?: string;
  /** 前台不預選；未選擇時為 null，由 createOrder 回「請選擇取貨方式」 */
  shippingMethod: ShippingMethod | null;
  cvsType?: string;
  cvsStoreName?: string;
  /** 前台不預選；未選擇時為 null，由 createOrder 回「請選擇付款方式」 */
  paymentMethod: PaymentMethod | null;
  bankTransferLast5?: string;
  linePayLast3?: string;
  /** 下單者填寫的文字備註（選填，上限見 lib/order-validation.ts#ORDER_NOTE_MAX_LENGTH） */
  note?: string;
  /** 首頁載入時的結帳設定指紋（lib/data.ts#computeCheckoutVersion），伺服器用來判斷客人看到的設定是否過期 */
  checkoutVersion: string;
}

export interface OrderTotals {
  subtotal: number;
  bundleDiscountAmount: number;
  bundleName: string | null;
  shippingFee: number;
  qualifiesForFreeShipping: boolean;
  total: number;
}

export type OrderStatus = "pending_payment" | "paid" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["pending_payment", "paid", "cancelled"];

export interface OrderConfirmation extends OrderTotals {
  orderId: string;
  status: OrderStatus;
  cart: CartLine[];
}

export interface OrderErrorResponse {
  error: string;
  fieldId?: string;
  /** 只在 409（購物車或結帳設定與資料庫不一致）時出現 */
  checkout?: CheckoutCheckResponse;
}

/** 首頁會員資格說明字數上限（後台輸入框與伺服器驗證共用） */
export const MEMBER_NOTE_MAX_LENGTH = 1000;

/** 分頁介紹字數上限（後台輸入框與伺服器驗證共用） */
export const REGION_DESCRIPTION_MAX_LENGTH = 1000;
