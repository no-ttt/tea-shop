import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db/client";
import {
  regions as regionsTable,
  products as productsTable,
  productImages as productImagesTable,
  productStatuses as productStatusesTable,
  customerFields as customerFieldsTable,
  bundleDiscounts as bundleDiscountsTable,
  bundleDiscountProducts as bundleDiscountProductsTable,
  siteSettings as siteSettingsTable,
  orders as ordersTable,
  orderItems as orderItemsTable,
  orderFieldValues as orderFieldValuesTable,
  orderFailureLogs as orderFailureLogsTable,
} from "./db/schema";
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
  const db = await getDb();
  const rows = await db.select().from(regionsTable).orderBy(regionsTable.sortOrder).all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    note: r.note,
    bgPos: r.bgPos,
    bgImage: r.bgImage,
    bgImageMobile: r.bgImageMobile,
  }));
}

export async function getProducts(region?: string): Promise<Product[]> {
  const db = await getDb();

  const productRows = region
    ? await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.regionId, region))
        .orderBy(productsTable.sortOrder)
        .all()
    : await db.select().from(productsTable).orderBy(productsTable.sortOrder).all();

  const productIds = productRows.map((p) => p.id);
  const imageRows = productIds.length
    ? await db
        .select()
        .from(productImagesTable)
        .where(inArray(productImagesTable.productId, productIds))
        .orderBy(productImagesTable.sortOrder)
        .all()
    : [];

  const imagesByProduct = new Map<string, string[]>();
  for (const img of imageRows) {
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img.url);
    imagesByProduct.set(img.productId, list);
  }

  return productRows.map((p) => {
    const hasPrices = p.price30 !== null && p.price80 !== null && p.price150 !== null;
    return {
      id: p.id,
      name: p.name,
      region: p.regionId,
      prices: hasPrices
        ? { "30": p.price30 as number, "80": p.price80 as number, "150": p.price150 as number }
        : null,
      note: p.note,
      statusId: p.statusId,
      images: imagesByProduct.get(p.id) ?? [],
    };
  });
}

export async function getProductStatuses(): Promise<ProductStatus[]> {
  const db = await getDb();
  const rows = await db.select().from(productStatusesTable).all();
  return rows.map((s) => ({
    id: s.id,
    label: s.label,
    type: s.type,
    color: s.color,
  }));
}

/**
 * 依賴 customer_fields.active 欄位（migration 0002_fuzzy_hercules.sql 才新增，0000/0001 沒有）。
 * 資料庫若只套用到較早的 migration，這個查詢會直接報 SQLITE_ERROR：no such column。
 * 部署/重建資料庫時務必確保全部 migration 都套用完整，不能只套一部分。
 */
export async function getCustomerFields(): Promise<CustomerField[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(customerFieldsTable)
    .where(eq(customerFieldsTable.active, true))
    .orderBy(customerFieldsTable.sortOrder)
    .all();
  return rows.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    builtin: f.builtin,
  }));
}

export async function getBundleDiscounts(): Promise<BundleDiscount[]> {
  const db = await getDb();
  const bundleRows = await db.select().from(bundleDiscountsTable).all();
  const joinRows = await db.select().from(bundleDiscountProductsTable).all();

  const productIdsByBundle = new Map<string, string[]>();
  for (const row of joinRows) {
    const list = productIdsByBundle.get(row.bundleId) ?? [];
    list.push(row.productId);
    productIdsByBundle.set(row.bundleId, list);
  }

  return bundleRows.map((b) => ({
    id: b.id,
    name: b.name,
    productIds: productIdsByBundle.get(b.id) ?? [],
    discountType: b.discountType,
    discountValue: b.discountValue,
  }));
}

export interface SiteSettings {
  theme: {
    scaleTitle: number;
    scaleItem: number;
    scalePrice: number;
    colorTitle: string;
    colorItem: string;
    colorPrice: string;
  };
  shipping: {
    freeThreshold: number;
    fee: number;
  };
  notify: {
    shopEmail: string;
  };
  branding: {
    logoImage: string;
    linePayQrImage: string;
  };
  weightOptions: number[];
}

const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  theme: {
    scaleTitle: 1,
    scaleItem: 1,
    scalePrice: 1,
    colorTitle: "#f3ede1",
    colorItem: "#f3ede1",
    colorPrice: "#c98a4b",
  },
  shipping: {
    freeThreshold: 3000,
    fee: 100,
  },
  notify: {
    shopEmail: "",
  },
  branding: {
    logoImage: "/images/logo.png",
    linePayQrImage: "/images/line-pay-qr.png",
  },
  weightOptions: [30, 80, 150],
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const rows = await db.select().from(siteSettingsTable).all();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const num = (key: string, fallback: number) => {
    const raw = map.get(key);
    if (raw === undefined || raw.trim() === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const str = (key: string, fallback: string) => map.get(key) ?? fallback;

  return {
    theme: {
      scaleTitle: num("theme.scaleTitle", SITE_SETTINGS_DEFAULTS.theme.scaleTitle),
      scaleItem: num("theme.scaleItem", SITE_SETTINGS_DEFAULTS.theme.scaleItem),
      scalePrice: num("theme.scalePrice", SITE_SETTINGS_DEFAULTS.theme.scalePrice),
      colorTitle: str("theme.colorTitle", SITE_SETTINGS_DEFAULTS.theme.colorTitle),
      colorItem: str("theme.colorItem", SITE_SETTINGS_DEFAULTS.theme.colorItem),
      colorPrice: str("theme.colorPrice", SITE_SETTINGS_DEFAULTS.theme.colorPrice),
    },
    shipping: {
      freeThreshold: num("shipping.freeThreshold", SITE_SETTINGS_DEFAULTS.shipping.freeThreshold),
      fee: num("shipping.fee", SITE_SETTINGS_DEFAULTS.shipping.fee),
    },
    notify: {
      shopEmail: str("notify.shopEmail", SITE_SETTINGS_DEFAULTS.notify.shopEmail),
    },
    branding: {
      logoImage: str("branding.logoImage", SITE_SETTINGS_DEFAULTS.branding.logoImage),
      linePayQrImage: str("branding.linePayQrImage", SITE_SETTINGS_DEFAULTS.branding.linePayQrImage),
    },
    weightOptions: (() => {
      const raw = map.get("weightOptions");
      if (!raw) return SITE_SETTINGS_DEFAULTS.weightOptions;
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) && parsed.every((v) => typeof v === "number")
          ? (parsed as number[])
          : SITE_SETTINGS_DEFAULTS.weightOptions;
      } catch {
        return SITE_SETTINGS_DEFAULTS.weightOptions;
      }
    })(),
  };
}

export class OrderValidationError extends Error {
  fieldId?: string;
  constructor(message: string, fieldId?: string) {
    super(message);
    this.fieldId = fieldId;
  }
}

/**
 * 驗證規則與錯誤訊息逐字比照原網站 submitOrder()。
 * 驗證通過後計算金額、寫入資料庫（orders／order_items／order_field_values），
 * 並以 fire-and-forget 方式觸發 email 通知。
 */
export async function createOrder(payload: OrderPayload): Promise<OrderConfirmation> {
  if (payload.cart.length === 0) {
    throw new OrderValidationError("購物車是空的，請先選購商品");
  }

  for (const item of payload.cart) {
    if (
      typeof item.key !== "string" ||
      typeof item.productId !== "string" ||
      typeof item.name !== "string" ||
      typeof item.detail !== "string" ||
      typeof item.price !== "number" ||
      !Number.isFinite(item.price)
    ) {
      throw new OrderValidationError("購物車資料格式錯誤");
    }
  }

  const [customerFields, bundles, settings] = await Promise.all([
    getCustomerFields(),
    getBundleDiscounts(),
    getSiteSettings(),
  ]);

  const totals = calcOrderTotals(payload.cart, bundles, settings.shipping.freeThreshold, settings.shipping.fee);
  const qualifiesForGroup = totals.qualifiesForFreeShipping;

  // lineId 不放在這個集合裡：它已經在下方迴圈最前面被單獨攔截並 continue，
  // 永遠不會走到這個集合的判斷；且下方三元運算鏈本來就沒有處理 lineId 的分支，
  // 若誤放進來、日後又有人動了前面的 continue 守衛，會悄悄退回 undefined 重現舊 bug。
  const BUILTIN_FIELD_IDS = new Set(["name", "phone", "email", "zip", "address"]);
  const customFieldValues = payload.customFieldValues ?? {};

  for (const field of customerFields) {
    if (field.id === "lineId") {
      if (qualifiesForGroup && !payload.customer.lineId) {
        throw new OrderValidationError(`請填寫${field.label}`, "cf_lineId");
      }
      continue;
    }

    if (field.id === "birthday") {
      if (field.required && !payload.birthday) {
        throw new OrderValidationError(`請填寫${field.label}`, "cf_birthday");
      }
      continue;
    }

    const isCVS = payload.shippingMethod === "cvs";
    if (isCVS && (field.id === "zip" || field.id === "address")) continue;

    // 內建欄位（builtin: true）維持型別安全的明確屬性存取；
    // 店家在後台新增的自訂欄位（builtin: false）則從 customFieldValues 依欄位 id 查表取值，
    // 而不是只認得寫死的 5 個內建欄位 id（原本漏接自訂欄位會讓 value 永遠是 undefined，卡死結帳）。
    const value = BUILTIN_FIELD_IDS.has(field.id)
      ? field.id === "name"
        ? payload.customer.name
        : field.id === "phone"
          ? payload.customer.phone
          : field.id === "email"
            ? payload.customer.email
            : field.id === "zip"
              ? payload.customer.zip
              : field.id === "address"
                ? payload.customer.address
                : undefined
      : customFieldValues[field.id];

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

  // QW + 毫秒時間戳(base36) + 2 碼隨機碼：短、人眼可讀，且遞增時間戳讓同時間訂單幾乎不重複。
  const orderId = `QW${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase();
  const db = await getDb();

  const isCVS = payload.shippingMethod === "cvs";
  const orderRow = {
    id: orderId,
    status: "pending_payment" as const,
    customerName: payload.customer.name,
    customerPhone: payload.customer.phone,
    customerLineId: payload.customer.lineId ?? null,
    customerEmail: payload.customer.email,
    customerZip: isCVS ? null : (payload.customer.zip ?? null),
    customerAddress: isCVS ? null : (payload.customer.address ?? null),
    birthday: payload.birthday ?? null,
    isGift: payload.isGift,
    giftName: payload.giftName ?? null,
    shippingMethod: payload.shippingMethod,
    cvsType: payload.cvsType ?? null,
    cvsStoreName: payload.cvsStoreName ?? null,
    paymentMethod: payload.paymentMethod,
    bankTransferLast5: payload.bankTransferLast5 ?? null,
    linePayLast3: payload.linePayLast3 ?? null,
    subtotal: totals.subtotal,
    bundleDiscountAmount: totals.bundleDiscountAmount,
    bundleName: totals.bundleName,
    shippingFee: totals.shippingFee,
    total: totals.total,
  };

  const itemRows = payload.cart.map((item) => ({
    orderId,
    productId: item.productId,
    cartKey: item.key,
    name: item.name,
    detail: item.detail,
    price: item.price,
  }));

  // 只存非內建（店家自訂）客戶欄位的填寫值；內建欄位（含 lineId/birthday）已經是 orders 表的固定欄位。
  const fieldValueRows = customerFields
    .filter((field) => !field.builtin && customFieldValues[field.id])
    .map((field) => ({
      orderId,
      fieldId: field.id,
      value: customFieldValues[field.id],
    }));

  try {
    if (fieldValueRows.length > 0) {
      await db.batch([
        db.insert(ordersTable).values(orderRow),
        db.insert(orderItemsTable).values(itemRows),
        db.insert(orderFieldValuesTable).values(fieldValueRows),
      ]);
    } else {
      await db.batch([db.insert(ordersTable).values(orderRow), db.insert(orderItemsTable).values(itemRows)]);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    try {
      await db.insert(orderFailureLogsTable).values({
        orderIdAttempt: orderId,
        errorMessage: error.message,
        errorStack: error.stack ?? null,
        payloadSnapshot: JSON.stringify(payload),
      });
    } catch (logErr) {
      console.error("[order_failure_logs] 寫入失敗記錄本身也失敗", logErr);
    }
    throw error;
  }

  const confirmation: OrderConfirmation = {
    orderId,
    status: "pending_payment",
    cart: payload.cart,
    ...totals,
  };

  return confirmation;
}
