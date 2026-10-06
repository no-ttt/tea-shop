import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const regions = sqliteTable("regions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  note: text("note"),
  /** 分頁介紹：顯示在副標題下方的多行說明文字（選填） */
  description: text("description"),
  bgPos: text("bg_pos").notNull(),
  bgImage: text("bg_image").notNull(),
  bgImageMobile: text("bg_image_mobile").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productStatuses = sqliteTable("product_statuses", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  type: text("type", { enum: ["purchasable", "tag"] }).notNull(),
  color: text("color"),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id),
  price30: integer("price_30"),
  price80: integer("price_80"),
  price150: integer("price_150"),
  /** 克數以外的「自訂」購買選項（例如「禮盒裝」）：名稱與價格必須同時有值或同時為 null */
  customOptionLabel: text("custom_option_label"),
  customOptionPrice: integer("custom_option_price"),
  note: text("note"),
  statusId: text("status_id")
    .notNull()
    .references(() => productStatuses.id),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const customerFields = sqliteTable("customer_fields", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  type: text("type", { enum: ["text", "tel", "email", "date"] }).notNull(),
  required: integer("required", { mode: "boolean" }).notNull(),
  builtin: integer("builtin", { mode: "boolean" }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // 軟刪除：外鍵約束會擋下刪除已被歷史訂單（order_field_values）使用過的欄位，
  // 為了讓店家有更好的體驗（而非直接看到資料庫層的外鍵錯誤），刪除改為標記停用。
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const bundleDiscounts = sqliteTable("bundle_discounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  discountType: text("discount_type", { enum: ["amount", "percent"] }).notNull(),
  discountValue: integer("discount_value").notNull(),
});

export const bundleDiscountProducts = sqliteTable(
  "bundle_discount_products",
  {
    bundleId: text("bundle_id")
      .notNull()
      .references(() => bundleDiscounts.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
  },
  (table) => [primaryKey({ columns: [table.bundleId, table.productId] })],
);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["pending_payment", "paid", "cancelled"] })
    .notNull()
    .default("pending_payment"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerLineId: text("customer_line_id"),
  customerEmail: text("customer_email").notNull(),
  customerZip: text("customer_zip"),
  customerAddress: text("customer_address"),
  birthday: text("birthday"),
  isGift: integer("is_gift", { mode: "boolean" }).notNull().default(false),
  giftName: text("gift_name"),
  shippingMethod: text("shipping_method", { enum: ["mail", "cvs"] }).notNull(),
  cvsType: text("cvs_type"),
  cvsStoreName: text("cvs_store_name"),
  paymentMethod: text("payment_method", { enum: ["bank", "linepay"] }).notNull(),
  bankTransferLast5: text("bank_transfer_last5"),
  linePayLast3: text("line_pay_last3"),
  /** 下單者在結帳頁填寫的文字備註（選填） */
  note: text("note"),
  subtotal: integer("subtotal").notNull(),
  bundleDiscountAmount: integer("bundle_discount_amount").notNull().default(0),
  bundleName: text("bundle_name"),
  shippingFee: integer("shipping_fee").notNull(),
  total: integer("total").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    cartKey: text("cart_key").notNull(),
    name: text("name").notNull(),
    detail: text("detail").notNull(),
    price: integer("price").notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

/**
 * 存放「非內建」客戶欄位（店家自行新增的自訂欄位，id 形如 custom_xxx）在某筆訂單的填寫值。
 * 內建欄位（name/phone/email/zip/address/lineId）已經是 orders 表的固定欄位，不重複存在這裡。
 */
export const orderFieldValues = sqliteTable(
  "order_field_values",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fieldId: text("field_id")
      .notNull()
      .references(() => customerFields.id),
    value: text("value").notNull(),
  },
  (table) => [index("order_field_values_order_id_idx").on(table.orderId)],
);

export const orderFailureLogs = sqliteTable("order_failure_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  occurredAt: text("occurred_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  orderIdAttempt: text("order_id_attempt"),
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  payloadSnapshot: text("payload_snapshot").notNull(),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
