import {
  REGIONS,
  PRODUCTS,
  PRODUCT_STATUSES,
  CUSTOMER_FIELDS,
  BUNDLE_DISCOUNTS,
  FREE_SHIPPING_THRESHOLD,
} from "./mock-data";
import { calcOrderTotals } from "./pricing";
import type {
  Region,
  Product,
  ProductStatus,
  CustomerField,
  BundleDiscount,
  OrderPayload,
  OrderConfirmation,
} from "./types";

export async function getRegions(): Promise<Region[]> {
  return REGIONS;
}

export async function getProducts(region?: string): Promise<Product[]> {
  if (!region) return PRODUCTS;
  return PRODUCTS.filter((p) => p.region === region);
}

export async function getProductStatuses(): Promise<ProductStatus[]> {
  return PRODUCT_STATUSES;
}

export async function getCustomerFields(): Promise<CustomerField[]> {
  return CUSTOMER_FIELDS;
}

export async function getBundleDiscounts(): Promise<BundleDiscount[]> {
  return BUNDLE_DISCOUNTS;
}

export class OrderValidationError extends Error {
  fieldId?: string;
  constructor(message: string, fieldId?: string) {
    super(message);
    this.fieldId = fieldId;
  }
}

let orderCounter = 0;

/**
 * 驗證規則與錯誤訊息逐字比照原網站 submitOrder()。
 * 驗證通過後計算金額並產生模擬訂單確認（不會呼叫任何外部服務）。
 */
export async function createOrder(payload: OrderPayload): Promise<OrderConfirmation> {
  if (payload.cart.length === 0) {
    throw new OrderValidationError("購物車是空的，請先選購商品");
  }

  const totals = calcOrderTotals(payload.cart);
  const qualifiesForGroup = totals.qualifiesForFreeShipping;

  for (const field of CUSTOMER_FIELDS) {
    if (field.id === "lineId") {
      if (qualifiesForGroup && !payload.customer.lineId) {
        throw new OrderValidationError(`請填寫${field.label}`, "cf_lineId");
      }
      continue;
    }

    const isCVS = payload.shippingMethod === "cvs";
    if (isCVS && (field.id === "zip" || field.id === "address")) continue;

    const value =
      field.id === "name"
        ? payload.customer.name
        : field.id === "phone"
          ? payload.customer.phone
          : field.id === "email"
            ? payload.customer.email
            : field.id === "zip"
              ? payload.customer.zip
              : field.id === "address"
                ? payload.customer.address
                : undefined;

    if (field.required && !value) {
      throw new OrderValidationError(`請填寫${field.label}`, `cf_${field.id}`);
    }

    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new OrderValidationError(`請填寫正確格式的${field.label}`, `cf_${field.id}`);
    }
  }

  if (payload.shippingMethod === "cvs" && !payload.cvsStoreName) {
    throw new OrderValidationError("請填寫超商門市名稱", "cvsStoreName");
  }

  if (payload.isGift && !payload.giftName) {
    throw new OrderValidationError("已勾選送禮，請填寫收禮人姓名", "custGiftName");
  }

  if (!payload.paymentMethod) {
    throw new OrderValidationError("請選擇付款方式");
  }

  if (payload.paymentMethod === "bank" && !payload.bankTransferLast5) {
    throw new OrderValidationError("請先完成匯款資訊確認（填寫匯款後五碼）");
  }

  if (payload.paymentMethod === "linepay" && !payload.linePayLast3) {
    throw new OrderValidationError("請先掃描 QR Code 完成付款，並確認付款狀態");
  }

  orderCounter += 1;
  const orderId = `QW${Date.now()}${orderCounter}`;

  return {
    orderId,
    status: "pending_payment",
    cart: payload.cart,
    ...totals,
  };
}

export { FREE_SHIPPING_THRESHOLD };
