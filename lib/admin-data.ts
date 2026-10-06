import { eq, sql, desc, inArray, count } from "drizzle-orm";
import { getDb } from "./db/client";
import { getSiteSettings, getRegions, getProducts, getProductStatuses, getBundleDiscounts } from "./data";
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
  orderFailureLogs as orderFailureLogsTable,
} from "./db/schema";
import {
  CUSTOM_OPTION_LABEL_MAX_LENGTH,
  MEMBER_NOTE_MAX_LENGTH,
  ORDER_STATUSES,
  REGION_DESCRIPTION_MAX_LENGTH,
} from "./types";
import type { Region, Product, ProductStatus, CustomerField, BundleDiscount, CartLine, OrderStatus } from "./types";
import type { SiteSettings } from "./data";

// 純讀取、前後台資料本來就該一致，刻意 re-export（分工說明見 CLAUDE.md）。
export { getSiteSettings, getRegions, getProducts, getProductStatuses, getBundleDiscounts };
export type { SiteSettings };

export class AdminValidationError extends Error {}

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AdminValidationError(`${label}不可為空`);
  }
  return value;
}

/** 選填的多行文字：統一換行符號、去頭尾空白，空字串存成 null，並檢查字數上限 */
function optionalLongText(value: unknown, label: string, maxLength: number): string | null {
  const text = optionalString(value);
  if (text === null) return null;
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (normalized.length > maxLength) throw new AdminValidationError(`${label}請勿超過 ${maxLength} 字`);
  return normalized || null;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new AdminValidationError("欄位格式錯誤");
  return value.trim() === "" ? null : value;
}

// ---------- Regions ----------

export interface RegionInput {
  id?: string;
  title: string;
  subtitle: string;
  note?: string | null;
  description?: string | null;
  bgPos: string;
  bgImage: string;
  bgImageMobile: string;
  sortOrder?: number;
}

export async function createRegion(input: RegionInput): Promise<Region> {
  const db = await getDb();
  const id = requireNonEmpty(input.id ?? crypto.randomUUID(), "分區代碼");
  const title = requireNonEmpty(input.title, "標題");
  const subtitle = requireNonEmpty(input.subtitle, "副標題");
  const bgPos = requireNonEmpty(input.bgPos, "底圖定位");
  const bgImage = requireNonEmpty(input.bgImage, "電腦版底圖");
  const bgImageMobile = requireNonEmpty(input.bgImageMobile, "手機版底圖");
  const description = optionalLongText(input.description, "分頁介紹", REGION_DESCRIPTION_MAX_LENGTH);

  // 沒指定順序時排到最後面，新分區不會突然插到前台分頁最前面。
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const last = await db
      .select({ max: sql<number | null>`max(${regionsTable.sortOrder})` })
      .from(regionsTable)
      .get();
    sortOrder = (last?.max ?? -1) + 1;
  }

  await db.insert(regionsTable).values({
    id,
    title,
    subtitle,
    note: optionalString(input.note),
    description,
    bgPos,
    bgImage,
    bgImageMobile,
    sortOrder,
  });

  return { id, title, subtitle, note: optionalString(input.note), description, bgPos, bgImage, bgImageMobile };
}

export async function updateRegion(id: string, input: Partial<RegionInput>): Promise<Region> {
  const db = await getDb();
  const existing = await db.select().from(regionsTable).where(eq(regionsTable.id, id)).get();
  if (!existing) throw new AdminValidationError("找不到這個分區");

  const patch: Partial<typeof regionsTable.$inferInsert> = {};
  if (input.title !== undefined) patch.title = requireNonEmpty(input.title, "標題");
  if (input.subtitle !== undefined) patch.subtitle = requireNonEmpty(input.subtitle, "副標題");
  if (input.note !== undefined) patch.note = optionalString(input.note);
  if (input.description !== undefined)
    patch.description = optionalLongText(input.description, "分頁介紹", REGION_DESCRIPTION_MAX_LENGTH);
  if (input.bgPos !== undefined) patch.bgPos = requireNonEmpty(input.bgPos, "底圖定位");
  if (input.bgImage !== undefined) patch.bgImage = requireNonEmpty(input.bgImage, "電腦版底圖");
  if (input.bgImageMobile !== undefined)
    patch.bgImageMobile = requireNonEmpty(input.bgImageMobile, "手機版底圖");
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  if (Object.keys(patch).length > 0) {
    await db.update(regionsTable).set(patch).where(eq(regionsTable.id, id));
  }

  const updated = await db.select().from(regionsTable).where(eq(regionsTable.id, id)).get();
  if (!updated) throw new AdminValidationError("找不到這個分區");
  return {
    id: updated.id,
    title: updated.title,
    subtitle: updated.subtitle,
    note: updated.note,
    description: updated.description,
    bgPos: updated.bgPos,
    bgImage: updated.bgImage,
    bgImageMobile: updated.bgImageMobile,
  };
}

/**
 * 後台「分區順序與名稱」一次儲存：items 的陣列順序就是新的前台分頁順序，同時更新每個分區的標題。
 * 必須剛好包含目前所有分區（不多不少），避免拿到過期清單時把別人剛新增的分區順序弄亂。
 * 用 db.batch 一次寫入，不會只改到一半。
 */
export async function reorderRegions(items: { id: string; title: string }[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) throw new AdminValidationError("分區清單不可為空");
  const db = await getDb();
  const existing = await db.select({ id: regionsTable.id }).from(regionsTable).all();
  const existingIds = new Set(existing.map((r) => r.id));
  const seen = new Set<string>();
  const rows = items.map((item, index) => {
    if (!item || typeof item.id !== "string" || !existingIds.has(item.id) || seen.has(item.id)) {
      throw new AdminValidationError("分區清單已過期，請重新整理頁面後再試");
    }
    seen.add(item.id);
    return { id: item.id, title: requireNonEmpty(item.title, "分區名稱").trim(), sortOrder: index };
  });
  if (seen.size !== existingIds.size) {
    throw new AdminValidationError("分區清單已過期，請重新整理頁面後再試");
  }

  const [first, ...rest] = rows.map((row) =>
    db.update(regionsTable).set({ title: row.title, sortOrder: row.sortOrder }).where(eq(regionsTable.id, row.id)),
  );
  await db.batch([first, ...rest]);
}

export async function deleteRegion(id: string): Promise<void> {
  const db = await getDb();
  const inUse = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.regionId, id))
    .get();
  if (inUse) {
    throw new AdminValidationError("這個分區底下還有商品，請先刪除或搬移這些商品");
  }
  await db.delete(regionsTable).where(eq(regionsTable.id, id));
}

// ---------- Product statuses ----------

export interface ProductStatusInput {
  id?: string;
  label: string;
  type: "purchasable" | "tag";
  color?: string | null;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validateColor(color: string | null | undefined): string | null {
  if (color === undefined || color === null || color === "") return null;
  if (!HEX_COLOR_RE.test(color)) throw new AdminValidationError("顏色格式錯誤，需為 #rrggbb");
  return color;
}

export async function createProductStatus(input: ProductStatusInput): Promise<ProductStatus> {
  const db = await getDb();
  const id = requireNonEmpty(input.id ?? crypto.randomUUID(), "狀態代碼");
  const label = requireNonEmpty(input.label, "標籤文字");
  if (input.type !== "purchasable" && input.type !== "tag") {
    throw new AdminValidationError("狀態類型錯誤");
  }
  const color = validateColor(input.color);

  await db.insert(productStatusesTable).values({ id, label, type: input.type, color });
  return { id, label, type: input.type, color };
}

export async function updateProductStatus(
  id: string,
  input: Partial<ProductStatusInput>,
): Promise<ProductStatus> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(productStatusesTable)
    .where(eq(productStatusesTable.id, id))
    .get();
  if (!existing) throw new AdminValidationError("找不到這個狀態");

  if (existing.type === "purchasable" && input.label !== undefined && input.label !== existing.label) {
    throw new AdminValidationError("系統必要狀態不能改名");
  }

  const patch: Partial<typeof productStatusesTable.$inferInsert> = {};
  if (input.label !== undefined) patch.label = requireNonEmpty(input.label, "標籤文字");
  if (input.color !== undefined) patch.color = validateColor(input.color);

  if (Object.keys(patch).length > 0) {
    await db.update(productStatusesTable).set(patch).where(eq(productStatusesTable.id, id));
  }

  const updated = await db
    .select()
    .from(productStatusesTable)
    .where(eq(productStatusesTable.id, id))
    .get();
  if (!updated) throw new AdminValidationError("找不到這個狀態");
  return { id: updated.id, label: updated.label, type: updated.type, color: updated.color };
}

export async function deleteProductStatus(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(productStatusesTable)
    .where(eq(productStatusesTable.id, id))
    .get();
  if (!existing) throw new AdminValidationError("找不到這個狀態");
  if (existing.type === "purchasable") {
    throw new AdminValidationError("系統必要狀態不能刪除");
  }

  const inUse = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.statusId, id))
    .get();
  if (inUse) {
    throw new AdminValidationError("還有商品使用這個狀態，請先改指定其他狀態");
  }

  await db.delete(productStatusesTable).where(eq(productStatusesTable.id, id));
}

// ---------- Products ----------

export interface ProductInput {
  id?: string;
  name: string;
  region: string;
  prices?: Record<"30" | "80" | "150", number> | null;
  /** 自訂購買選項；null 代表不提供 */
  customOption?: { label: string; price: number } | null;
  note?: string | null;
  statusId: string;
  sortOrder?: number;
}

async function assertRegionExists(db: Awaited<ReturnType<typeof getDb>>, regionId: string) {
  const region = await db.select().from(regionsTable).where(eq(regionsTable.id, regionId)).get();
  if (!region) throw new AdminValidationError("找不到這個分區");
}

async function assertStatusExists(db: Awaited<ReturnType<typeof getDb>>, statusId: string) {
  const status = await db
    .select()
    .from(productStatusesTable)
    .where(eq(productStatusesTable.id, statusId))
    .get();
  if (!status) throw new AdminValidationError("找不到這個狀態");
}

function validatePrices(
  prices: Record<"30" | "80" | "150", number> | null | undefined,
): { price30: number | null; price80: number | null; price150: number | null } {
  if (!prices) return { price30: null, price80: null, price150: null };
  for (const key of ["30", "80", "150"] as const) {
    const v = prices[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      throw new AdminValidationError(`${key}g 價格格式錯誤`);
    }
  }
  return { price30: prices["30"], price80: prices["80"], price150: prices["150"] };
}

function validateCustomOption(
  option: { label: string; price: number } | null | undefined,
): { customOptionLabel: string | null; customOptionPrice: number | null } {
  if (!option) return { customOptionLabel: null, customOptionPrice: null };
  const label = typeof option.label === "string" ? option.label.trim() : "";
  if (!label) throw new AdminValidationError("請填寫自訂選項名稱");
  if (label.length > CUSTOM_OPTION_LABEL_MAX_LENGTH) {
    throw new AdminValidationError(`自訂選項名稱請勿超過 ${CUSTOM_OPTION_LABEL_MAX_LENGTH} 字`);
  }
  const price = option.price;
  if (typeof price !== "number" || !Number.isInteger(price) || price < 0) {
    throw new AdminValidationError("自訂選項價格需為 0 或正整數");
  }
  return { customOptionLabel: label, customOptionPrice: price };
}

function toCustomOption(row: { customOptionLabel: string | null; customOptionPrice: number | null }) {
  return row.customOptionLabel && row.customOptionPrice !== null
    ? { label: row.customOptionLabel, price: row.customOptionPrice }
    : null;
}

async function loadProductImages(db: Awaited<ReturnType<typeof getDb>>, productId: string): Promise<string[]> {
  const rows = await loadProductImagesWithId(db, productId);
  return rows.map((r) => r.url);
}

export interface ProductImageWithId {
  id: number;
  url: string;
}

async function loadProductImagesWithId(
  db: Awaited<ReturnType<typeof getDb>>,
  productId: string,
): Promise<ProductImageWithId[]> {
  const rows = await db
    .select()
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, productId))
    .orderBy(productImagesTable.sortOrder)
    .all();
  return rows.map((r) => ({ id: r.id, url: r.url }));
}

/** admin 專用：供編輯商品表單載入圖片時取得可用來刪除的 imageId（公開的 Product.images 只是 string[]，不含 id）。 */
export async function getProductImagesWithId(productId: string): Promise<ProductImageWithId[]> {
  const db = await getDb();
  return loadProductImagesWithId(db, productId);
}

/** 某分區目前最後一個商品之後的排序值（新商品／換到這個分區的商品排在最後面）。 */
async function nextProductSortOrder(db: Awaited<ReturnType<typeof getDb>>, regionId: string): Promise<number> {
  const last = await db
    .select({ max: sql<number | null>`max(${productsTable.sortOrder})` })
    .from(productsTable)
    .where(eq(productsTable.regionId, regionId))
    .get();
  return (last?.max ?? -1) + 1;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const db = await getDb();
  const id = requireNonEmpty(input.id ?? crypto.randomUUID(), "商品代碼");
  const name = requireNonEmpty(input.name, "品名");
  const region = requireNonEmpty(input.region, "分區");
  const statusId = requireNonEmpty(input.statusId, "狀態");
  await assertRegionExists(db, region);
  await assertStatusExists(db, statusId);
  const { price30, price80, price150 } = validatePrices(input.prices);
  const custom = validateCustomOption(input.customOption);

  await db.insert(productsTable).values({
    id,
    name,
    regionId: region,
    price30,
    price80,
    price150,
    ...custom,
    note: optionalString(input.note),
    statusId,
    sortOrder: input.sortOrder ?? (await nextProductSortOrder(db, region)),
  });

  return {
    id,
    name,
    region,
    prices: input.prices ?? null,
    customOption: toCustomOption(custom),
    note: optionalString(input.note),
    statusId,
    images: [],
  };
}

/**
 * 後台拖移排序：ids 的陣列順序就是該分區新的商品順序（前台同一分頁內的排列）。
 * 必須剛好包含該分區目前所有商品，避免用過期清單覆蓋；db.batch 一次寫入。
 */
export async function reorderProducts(regionId: string, ids: string[]): Promise<void> {
  const region = requireNonEmpty(regionId, "分區");
  if (!Array.isArray(ids) || ids.length === 0) throw new AdminValidationError("商品清單不可為空");
  const db = await getDb();
  const existing = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.regionId, region))
    .all();
  const existingIds = new Set(existing.map((p) => p.id));
  const unique = new Set(ids);
  if (unique.size !== ids.length || unique.size !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    throw new AdminValidationError("商品清單已過期，請重新整理頁面後再試");
  }

  const [first, ...rest] = ids.map((id, index) =>
    db.update(productsTable).set({ sortOrder: index }).where(eq(productsTable.id, id)),
  );
  await db.batch([first, ...rest]);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const db = await getDb();
  const existing = await db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  if (!existing) throw new AdminValidationError("找不到這個商品");

  const patch: Partial<typeof productsTable.$inferInsert> = {};
  if (input.name !== undefined) patch.name = requireNonEmpty(input.name, "品名");
  if (input.region !== undefined) {
    const region = requireNonEmpty(input.region, "分區");
    await assertRegionExists(db, region);
    patch.regionId = region;
    if (region !== existing.regionId && input.sortOrder === undefined) {
      patch.sortOrder = await nextProductSortOrder(db, region);
    }
  }
  if (input.statusId !== undefined) {
    const statusId = requireNonEmpty(input.statusId, "狀態");
    await assertStatusExists(db, statusId);
    patch.statusId = statusId;
  }
  if (input.note !== undefined) patch.note = optionalString(input.note);
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.prices !== undefined) {
    const { price30, price80, price150 } = validatePrices(input.prices);
    patch.price30 = price30;
    patch.price80 = price80;
    patch.price150 = price150;
  }
  if (input.customOption !== undefined) Object.assign(patch, validateCustomOption(input.customOption));

  if (Object.keys(patch).length > 0) {
    await db.update(productsTable).set(patch).where(eq(productsTable.id, id));
  }

  const updated = await db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  if (!updated) throw new AdminValidationError("找不到這個商品");
  const hasPrices = updated.price30 !== null && updated.price80 !== null && updated.price150 !== null;
  const images = await loadProductImages(db, id);

  return {
    id: updated.id,
    name: updated.name,
    region: updated.regionId,
    prices: hasPrices
      ? { "30": updated.price30 as number, "80": updated.price80 as number, "150": updated.price150 as number }
      : null,
    customOption: toCustomOption(updated),
    note: updated.note,
    statusId: updated.statusId,
    images,
  };
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDb();
  const inBundle = await db
    .select({ bundleId: bundleDiscountProductsTable.bundleId })
    .from(bundleDiscountProductsTable)
    .where(eq(bundleDiscountProductsTable.productId, id))
    .get();
  if (inBundle) {
    throw new AdminValidationError("這個商品還被組合折扣使用，請先從組合折扣中移除");
  }
  // order_items.product_id 有外鍵指向 products（沒有 cascade，也不該 cascade 刪掉歷史訂單），
  // 不先擋的話 DELETE 會直接撞外鍵變成 500，店家只看到籠統的錯誤。
  const inOrder = await db
    .select({ orderId: orderItemsTable.orderId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.productId, id))
    .get();
  if (inOrder) {
    throw new AdminValidationError("這個商品已有訂單紀錄，無法刪除；請改將狀態設為「已售完」等不可購買的狀態");
  }
  await db.delete(productsTable).where(eq(productsTable.id, id));
}

// ---------- Product images ----------

export async function addProductImage(productId: string, url: string): Promise<ProductImageWithId[]> {
  const db = await getDb();
  const product = await db.select().from(productsTable).where(eq(productsTable.id, productId)).get();
  if (!product) throw new AdminValidationError("找不到這個商品");

  const trimmedUrl = requireNonEmpty(url, "圖片網址");
  const existing = await loadProductImagesWithId(db, productId);
  if (existing.length >= 4) {
    throw new AdminValidationError("每個商品最多 4 張圖片");
  }

  await db.insert(productImagesTable).values({
    productId,
    url: trimmedUrl,
    sortOrder: existing.length,
  });

  return loadProductImagesWithId(db, productId);
}

export async function deleteProductImage(productId: string, imageId: number): Promise<ProductImageWithId[]> {
  const db = await getDb();
  const image = await db
    .select()
    .from(productImagesTable)
    .where(eq(productImagesTable.id, imageId))
    .get();
  if (!image || image.productId !== productId) {
    throw new AdminValidationError("找不到這張圖片");
  }
  await db.delete(productImagesTable).where(eq(productImagesTable.id, imageId));
  return loadProductImagesWithId(db, productId);
}

/**
 * 後台拖移調整商品圖片順序：imageIds 的陣列順序就是新的顯示順序（前台縮圖、燈箱都依這個順序）。
 * 必須剛好包含該商品目前所有圖片，避免用過期清單覆蓋；db.batch 一次寫入。
 */
export async function reorderProductImages(productId: string, imageIds: number[]): Promise<ProductImageWithId[]> {
  const db = await getDb();
  const existing = await loadProductImagesWithId(db, productId);
  const existingIds = new Set(existing.map((img) => img.id));
  const unique = new Set(imageIds);
  if (
    !Array.isArray(imageIds) ||
    unique.size !== imageIds.length ||
    unique.size !== existingIds.size ||
    imageIds.some((id) => !existingIds.has(id))
  ) {
    throw new AdminValidationError("圖片清單已過期，請重新整理頁面後再試");
  }
  if (imageIds.length > 0) {
    const [first, ...rest] = imageIds.map((id, index) =>
      db.update(productImagesTable).set({ sortOrder: index }).where(eq(productImagesTable.id, id)),
    );
    await db.batch([first, ...rest]);
  }
  return loadProductImagesWithId(db, productId);
}

// ---------- Bundle discounts ----------

export interface BundleDiscountInput {
  id?: string;
  name: string;
  productIds: string[];
  discountType: "amount" | "percent";
  discountValue: number;
}

function validateBundleDiscountValue(discountType: "amount" | "percent", discountValue: number) {
  if (typeof discountValue !== "number" || !Number.isFinite(discountValue) || discountValue < 0) {
    throw new AdminValidationError("折扣數值格式錯誤");
  }
  if (discountType === "percent" && discountValue > 100) {
    throw new AdminValidationError("折扣百分比不可超過 100");
  }
}

async function setBundleProducts(
  db: Awaited<ReturnType<typeof getDb>>,
  bundleId: string,
  productIds: string[],
) {
  await db.delete(bundleDiscountProductsTable).where(eq(bundleDiscountProductsTable.bundleId, bundleId));
  if (productIds.length === 0) return;

  for (const productId of productIds) {
    const product = await db.select().from(productsTable).where(eq(productsTable.id, productId)).get();
    if (!product) throw new AdminValidationError(`找不到商品：${productId}`);
  }

  await db
    .insert(bundleDiscountProductsTable)
    .values(productIds.map((productId) => ({ bundleId, productId })));
}

export async function createBundleDiscount(input: BundleDiscountInput): Promise<BundleDiscount> {
  const db = await getDb();
  const id = requireNonEmpty(input.id ?? crypto.randomUUID(), "組合折扣代碼");
  const name = requireNonEmpty(input.name, "折扣名稱");
  if (input.discountType !== "amount" && input.discountType !== "percent") {
    throw new AdminValidationError("折扣方式錯誤");
  }
  validateBundleDiscountValue(input.discountType, input.discountValue);
  if (!Array.isArray(input.productIds)) throw new AdminValidationError("商品清單格式錯誤");

  await db.insert(bundleDiscountsTable).values({
    id,
    name,
    discountType: input.discountType,
    discountValue: input.discountValue,
  });
  await setBundleProducts(db, id, input.productIds);

  return { id, name, productIds: input.productIds, discountType: input.discountType, discountValue: input.discountValue };
}

export async function updateBundleDiscount(
  id: string,
  input: Partial<BundleDiscountInput>,
): Promise<BundleDiscount> {
  const db = await getDb();
  const existing = await db.select().from(bundleDiscountsTable).where(eq(bundleDiscountsTable.id, id)).get();
  if (!existing) throw new AdminValidationError("找不到這個組合折扣");

  const patch: Partial<typeof bundleDiscountsTable.$inferInsert> = {};
  if (input.name !== undefined) patch.name = requireNonEmpty(input.name, "折扣名稱");
  const discountType = input.discountType ?? existing.discountType;
  if (input.discountType !== undefined) {
    if (input.discountType !== "amount" && input.discountType !== "percent") {
      throw new AdminValidationError("折扣方式錯誤");
    }
    patch.discountType = input.discountType;
  }
  if (input.discountValue !== undefined) {
    validateBundleDiscountValue(discountType, input.discountValue);
    patch.discountValue = input.discountValue;
  } else if (input.discountType !== undefined) {
    validateBundleDiscountValue(discountType, existing.discountValue);
  }

  if (Object.keys(patch).length > 0) {
    await db.update(bundleDiscountsTable).set(patch).where(eq(bundleDiscountsTable.id, id));
  }
  if (input.productIds !== undefined) {
    if (!Array.isArray(input.productIds)) throw new AdminValidationError("商品清單格式錯誤");
    await setBundleProducts(db, id, input.productIds);
  }

  const updated = await db.select().from(bundleDiscountsTable).where(eq(bundleDiscountsTable.id, id)).get();
  if (!updated) throw new AdminValidationError("找不到這個組合折扣");
  const joinRows = await db
    .select()
    .from(bundleDiscountProductsTable)
    .where(eq(bundleDiscountProductsTable.bundleId, id))
    .all();

  return {
    id: updated.id,
    name: updated.name,
    productIds: joinRows.map((r) => r.productId),
    discountType: updated.discountType,
    discountValue: updated.discountValue,
  };
}

export async function deleteBundleDiscount(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(bundleDiscountsTable).where(eq(bundleDiscountsTable.id, id));
}

// ---------- Customer fields ----------

export interface CustomerFieldInput {
  id?: string;
  label: string;
  type: "text" | "tel" | "email" | "date";
  required: boolean;
  sortOrder?: number;
  active?: boolean;
}

export interface AdminCustomerField extends CustomerField {
  active: boolean;
}

/** admin 專用：回傳所有欄位（含已停用），供後台清單顯示「啟用」按鈕用（公開的 getCustomerFields() 只回傳啟用中的欄位）。 */
export async function getAllCustomerFields(): Promise<AdminCustomerField[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(customerFieldsTable)
    .orderBy(customerFieldsTable.sortOrder)
    .all();
  return rows.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    builtin: f.builtin,
    active: f.active,
  }));
}

export async function createCustomerField(input: CustomerFieldInput): Promise<AdminCustomerField> {
  const db = await getDb();
  const id = requireNonEmpty(input.id ?? `custom_${Date.now()}`, "欄位代碼");
  const label = requireNonEmpty(input.label, "欄位名稱");
  if (input.type !== "text" && input.type !== "tel" && input.type !== "email" && input.type !== "date") {
    throw new AdminValidationError("欄位類型錯誤");
  }
  if (typeof input.required !== "boolean") throw new AdminValidationError("必填設定格式錯誤");

  const maxSortOrder = await db
    .select({ max: sql<number | null>`max(${customerFieldsTable.sortOrder})` })
    .from(customerFieldsTable)
    .get();
  const sortOrder = input.sortOrder ?? (maxSortOrder?.max ?? -1) + 1;

  await db.insert(customerFieldsTable).values({
    id,
    label,
    type: input.type,
    required: input.required,
    builtin: false,
    active: true,
    sortOrder,
  });

  return { id, label, type: input.type, required: input.required, builtin: false, active: true };
}

export async function updateCustomerField(
  id: string,
  input: Partial<CustomerFieldInput>,
): Promise<AdminCustomerField> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(customerFieldsTable)
    .where(eq(customerFieldsTable.id, id))
    .get();
  if (!existing) throw new AdminValidationError("找不到這個欄位");

  const patch: Partial<typeof customerFieldsTable.$inferInsert> = {};
  if (input.label !== undefined) patch.label = requireNonEmpty(input.label, "欄位名稱");
  if (input.type !== undefined) {
    if (input.type !== "text" && input.type !== "tel" && input.type !== "email" && input.type !== "date") {
      throw new AdminValidationError("欄位類型錯誤");
    }
    if (existing.builtin) throw new AdminValidationError("內建欄位不能修改類型");
    patch.type = input.type;
  }
  if (input.required !== undefined) {
    if (typeof input.required !== "boolean") throw new AdminValidationError("必填設定格式錯誤");
    patch.required = input.required;
  }
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") throw new AdminValidationError("啟用狀態格式錯誤");
    patch.active = input.active;
  }

  if (Object.keys(patch).length > 0) {
    await db.update(customerFieldsTable).set(patch).where(eq(customerFieldsTable.id, id));
  }

  const updated = await db
    .select()
    .from(customerFieldsTable)
    .where(eq(customerFieldsTable.id, id))
    .get();
  if (!updated) throw new AdminValidationError("找不到這個欄位");
  return {
    id: updated.id,
    label: updated.label,
    type: updated.type,
    required: updated.required,
    builtin: updated.builtin,
    active: updated.active,
  };
}

/**
 * 軟刪除（停用）：外鍵約束會擋下真正 DELETE 已被歷史訂單引用的欄位，
 * 改為 active = false，getCustomerFields() 只回傳啟用中的欄位。
 */
export async function deleteCustomerField(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(customerFieldsTable)
    .where(eq(customerFieldsTable.id, id))
    .get();
  if (!existing) throw new AdminValidationError("找不到這個欄位");
  if (id === "name" || id === "phone") {
    throw new AdminValidationError("姓名、電話是結帳必要欄位，不能停用");
  }

  await db.update(customerFieldsTable).set({ active: false }).where(eq(customerFieldsTable.id, id));
}

// ---------- Site settings ----------

const SETTINGS_KEY_VALIDATORS: Record<string, (value: unknown) => string> = {
  "theme.scaleTitle": (v) => validateScale(v),
  "theme.scaleItem": (v) => validateScale(v),
  "theme.scalePrice": (v) => validateScale(v),
  "theme.colorTitle": (v) => validateHexColorSetting(v),
  "theme.colorItem": (v) => validateHexColorSetting(v),
  "theme.colorPrice": (v) => validateHexColorSetting(v),
  "theme.scaleMemberNote": (v) => validateScale(v),
  "content.memberNote": (v) => validateLongText(v, MEMBER_NOTE_MAX_LENGTH),
  "shipping.freeThreshold": (v) => validateNonNegativeInt(v),
  "shipping.fee": (v) => validateNonNegativeInt(v),
  "notify.shopEmail": (v) => validateEmailSetting(v),
  "branding.logoImage": (v) => validateNonEmptySetting(v),
  "branding.linePayQrImage": (v) => validateNonEmptySetting(v),
  "weightOptions": (v) => validateWeightOptions(v),
};

/** 多行文字設定；允許空字串（代表不顯示），統一換行符號並去掉頭尾空白 */
function validateLongText(v: unknown, maxLength: number): string {
  if (typeof v !== "string") throw new AdminValidationError("欄位格式錯誤");
  const text = v.replace(/\r\n?/g, "\n").trim();
  if (text.length > maxLength) throw new AdminValidationError(`內容請勿超過 ${maxLength} 字`);
  return text;
}

function validateScale(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0.7 || n > 1.6) {
    throw new AdminValidationError("字級縮放需介於 0.7 到 1.6 之間");
  }
  return String(n);
}

function validateHexColorSetting(v: unknown): string {
  if (typeof v !== "string" || !HEX_COLOR_RE.test(v)) {
    throw new AdminValidationError("顏色格式錯誤，需為 #rrggbb");
  }
  return v;
}

function validateNonNegativeInt(v: unknown): string {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) {
    throw new AdminValidationError("數值需為 0 或正整數");
  }
  return String(n);
}

function validateEmailSetting(v: unknown): string {
  if (v === "" || v === null || v === undefined) return "";
  if (typeof v !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    throw new AdminValidationError("Email 格式錯誤");
  }
  return v;
}

function validateNonEmptySetting(v: unknown): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new AdminValidationError("欄位不可為空");
  }
  return v;
}

function validateWeightOptions(v: unknown): string {
  if (
    !Array.isArray(v) ||
    v.length === 0 ||
    !v.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)
  ) {
    throw new AdminValidationError("重量選項格式錯誤");
  }
  return JSON.stringify(v);
}

/**
 * 部分更新 site_settings key-value 表。傳入的 key 需在允許清單內，
 * 每個 key 依其型別做伺服端驗證（不只依賴前端 input 限制）。
 */
export async function updateSiteSettings(patch: Record<string, unknown>): Promise<SiteSettings> {
  const db = await getDb();

  for (const key of Object.keys(patch)) {
    if (!(key in SETTINGS_KEY_VALIDATORS)) {
      throw new AdminValidationError(`不支援的設定項目：${key}`);
    }
  }

  for (const [key, rawValue] of Object.entries(patch)) {
    const value = SETTINGS_KEY_VALIDATORS[key](rawValue);
    await db
      .insert(siteSettingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value } });
  }

  return getSiteSettings();
}

// ---------- Orders ----------

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerLineId: string | null;
  customerEmail: string;
  customerZip: string | null;
  customerAddress: string | null;
  birthday: string | null;
  isGift: boolean;
  giftName: string | null;
  shippingMethod: "mail" | "cvs";
  cvsType: string | null;
  cvsStoreName: string | null;
  paymentMethod: "bank" | "linepay";
  bankTransferLast5: string | null;
  linePayLast3: string | null;
  note: string | null;
  subtotal: number;
  bundleDiscountAmount: number;
  bundleName: string | null;
  shippingFee: number;
  total: number;
  createdAt: string;
  items: CartLine[];
}

function mapOrderRowWithoutItems(row: typeof ordersTable.$inferSelect): Omit<AdminOrder, "items"> {
  return {
    id: row.id,
    status: row.status,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerLineId: row.customerLineId,
    customerEmail: row.customerEmail,
    customerZip: row.customerZip,
    customerAddress: row.customerAddress,
    birthday: row.birthday,
    isGift: row.isGift,
    giftName: row.giftName,
    shippingMethod: row.shippingMethod,
    cvsType: row.cvsType,
    cvsStoreName: row.cvsStoreName,
    paymentMethod: row.paymentMethod,
    bankTransferLast5: row.bankTransferLast5,
    linePayLast3: row.linePayLast3,
    note: row.note,
    subtotal: row.subtotal,
    bundleDiscountAmount: row.bundleDiscountAmount,
    bundleName: row.bundleName,
    shippingFee: row.shippingFee,
    total: row.total,
    createdAt: row.createdAt,
  };
}

function mapOrderRow(row: typeof ordersTable.$inferSelect, items: CartLine[]): AdminOrder {
  return {
    ...mapOrderRowWithoutItems(row),
    items,
  };
}

const ORDERS_PAGE_SIZE = 50;

export interface ListOrdersParams {
  page?: number;
  status?: OrderStatus;
}

export interface ListOrdersResult {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listOrders(params: ListOrdersParams = {}): Promise<ListOrdersResult> {
  const db = await getDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = ORDERS_PAGE_SIZE;
  const where = params.status ? eq(ordersTable.status, params.status) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(ordersTable).where(where);

  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(where)
    .orderBy(desc(ordersTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();
  if (orderRows.length === 0) return { orders: [], total, page, pageSize };

  const orderIds = orderRows.map((o) => o.id);
  const itemRows = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)).all();

  const itemsByOrderId = new Map<string, CartLine[]>();
  for (const item of itemRows) {
    const line: CartLine = { key: item.cartKey, productId: item.productId, name: item.name, detail: item.detail, price: item.price };
    const existing = itemsByOrderId.get(item.orderId);
    if (existing) existing.push(line);
    else itemsByOrderId.set(item.orderId, [line]);
  }

  return {
    orders: orderRows.map((row) => mapOrderRow(row, itemsByOrderId.get(row.id) ?? [])),
    total,
    page,
    pageSize,
  };
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Omit<AdminOrder, "items">> {
  if (!ORDER_STATUSES.includes(status)) {
    throw new AdminValidationError("訂單狀態格式錯誤");
  }
  const db = await getDb();
  const updated = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning().get();
  if (!updated) throw new AdminValidationError("找不到這筆訂單");

  return mapOrderRowWithoutItems(updated);
}

// ---------- Order failure logs ----------

export interface AdminOrderFailure {
  id: number;
  occurredAt: string;
  orderIdAttempt: string | null;
  errorMessage: string;
  errorStack: string | null;
  payloadSnapshot: string;
}

const ORDER_FAILURES_PAGE_SIZE = 50;

export interface ListOrderFailuresParams {
  page?: number;
}

export interface ListOrderFailuresResult {
  failures: AdminOrderFailure[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listOrderFailures(params: ListOrderFailuresParams = {}): Promise<ListOrderFailuresResult> {
  const db = await getDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = ORDER_FAILURES_PAGE_SIZE;

  const [{ total }] = await db.select({ total: count() }).from(orderFailureLogsTable);

  const rows = await db
    .select()
    .from(orderFailureLogsTable)
    .orderBy(desc(orderFailureLogsTable.occurredAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  return {
    failures: rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt,
      orderIdAttempt: row.orderIdAttempt,
      errorMessage: row.errorMessage,
      errorStack: row.errorStack,
      payloadSnapshot: row.payloadSnapshot,
    })),
    total,
    page,
    pageSize,
  };
}
