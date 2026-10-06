import Image from "next/image";
import type { Product, ProductOptionSelection, ProductStatus } from "@/lib/types";
import { optionLabel, optionPrice } from "@/lib/product-options";
import styles from "./ProductCard.module.css";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function plainName(name: string): string {
  return name.replace(/\n/g, " ");
}

export default function ProductCard({
  product,
  status,
  selectedWeight,
  weightOptions,
  onSelectWeight,
  onAddToCart,
  adding,
  addDisabled,
  onOpenLightbox,
}: {
  product: Product;
  status: ProductStatus;
  selectedWeight: ProductOptionSelection | null;
  weightOptions: number[];
  onSelectWeight: (productId: string, weight: ProductOptionSelection) => void;
  onAddToCart: (productId: string) => void;
  /** 這個商品正在向伺服器確認庫存/價格 */
  adding: boolean;
  /** 有任一商品正在確認中（避免同時多筆請求造成購物車更新順序錯亂） */
  addDisabled: boolean;
  /** 打開燈箱：傳入這個商品的所有照片與點到的那張索引，燈箱內可左右切換 */
  onOpenLightbox: (images: string[], index: number) => void;
}) {
  if (status.type !== "purchasable") {
    return (
      <div className={`${styles.item} ${styles.disabled}`}>
        <div className={styles.top}>
          <span className={styles.name}>{product.name}</span>
          <span className={styles.statusTag} style={{ color: status.color ?? "#c9bfa8" }}>
            {status.label}
          </span>
        </div>
        {product.note && <div className={styles.note}>{product.note}</div>}
      </div>
    );
  }

  const prices = product.prices;
  const customOption = product.customOption;
  // 可選的規格：有設定克數價格才列克數，有設定自訂選項才多一顆自訂按鈕
  const options: ProductOptionSelection[] = [...(prices ? weightOptions : []), ...(customOption ? ["custom" as const] : [])];
  const selectedPrice = selectedWeight ? optionPrice(product, selectedWeight) : null;
  const previewText =
    selectedWeight && selectedPrice !== null
      ? `${plainName(product.name)}／${optionLabel(product, selectedWeight)}／`
      : prices
        ? "請選擇克數"
        : "請選擇規格";

  return (
    <div className={styles.item}>
      <div className={styles.top}>
        <span className={styles.name}>{product.name}</span>
        {product.note && <span className={styles.note}>{product.note}</span>}
      </div>

      {product.images.length > 0 && (
        <div className={styles.photoGrid}>
          {product.images.map((src, i) => (
            <button
              key={`${i}-${src}`}
              type="button"
              className={styles.photoThumb}
              onClick={() => onOpenLightbox(product.images, i)}
              aria-label={`${product.name} 商品照片 ${i + 1}`}
            >
              <Image src={src} alt="" fill sizes="76px" />
            </button>
          ))}
        </div>
      )}

      {options.length > 0 && (
        <div className={styles.weightOptions}>
          {options.map((w) => (
            <button
              key={w}
              type="button"
              className={`${styles.weightBtn} ${selectedWeight === w ? styles.weightBtnSelected : ""}`}
              onClick={() => onSelectWeight(product.id, w)}
            >
              <span className={`${styles.g} ${selectedWeight === w ? styles.gSelected : ""}`}>
                {optionLabel(product, w)}
              </span>
              <span className={`${styles.p} ${selectedWeight === w ? styles.pSelected : ""}`}>
                {fmt(optionPrice(product, w) ?? 0)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        <div className={styles.preview}>
          {previewText}
          {selectedPrice !== null && <b>{fmt(selectedPrice)}</b>}
        </div>
        <button
          type="button"
          className={styles.addBtn}
          disabled={selectedPrice === null || addDisabled}
          onClick={() => onAddToCart(product.id)}
        >
          {adding ? "確認中…" : "加入"}
        </button>
      </div>
    </div>
  );
}
