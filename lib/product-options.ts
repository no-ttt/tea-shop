import type { Product, ProductOptionSelection } from "./types";

/**
 * 前台選購規格（克數或自訂選項）對應的價格與顯示名稱，商品卡片與加入購物車共用。
 * 伺服器端的價格核對在 lib/data.ts#resolveCart，直接讀資料庫欄位，不經過這裡。
 */
export function optionPrice(product: Product, selection: ProductOptionSelection): number | null {
  if (selection === "custom") return product.customOption?.price ?? null;
  return product.prices?.[String(selection) as "30" | "80" | "150"] ?? null;
}

export function optionLabel(product: Product, selection: ProductOptionSelection): string {
  return selection === "custom" ? (product.customOption?.label ?? "") : `${selection}g`;
}
