export type WeightOption = 30 | 80 | 150;

export interface Region {
  id: string;
  title: string;
  subtitle: string;
  note: string | null;
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
  note: string | null;
  statusId: string;
  images: string[];
}

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
  shippingMethod: ShippingMethod;
  cvsType?: string;
  cvsStoreName?: string;
  paymentMethod: PaymentMethod;
  bankTransferLast5?: string;
  linePayLast3?: string;
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
}
