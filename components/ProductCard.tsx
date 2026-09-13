import Image from "next/image";
import type { Product, ProductStatus } from "@/lib/types";
import { WEIGHT_OPTIONS } from "@/lib/mock-data";
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
  onSelectWeight,
  onAddToCart,
  onOpenLightbox,
}: {
  product: Product;
  status: ProductStatus;
  selectedWeight: number | null;
  onSelectWeight: (productId: string, weight: number) => void;
  onAddToCart: (productId: string) => void;
  onOpenLightbox: (src: string) => void;
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
  const previewText =
    selectedWeight && prices
      ? `${plainName(product.name)}／${selectedWeight}g／`
      : "請選擇克數";

  return (
    <div className={styles.item}>
      <div className={styles.top}>
        <span className={styles.name}>{product.name}</span>
        {product.note && <span className={styles.note}>{product.note}</span>}
      </div>

      {product.images.length > 0 ? (
        <div className={styles.photoGrid}>
          {product.images.map((src, i) => (
            <button
              key={src}
              type="button"
              className={styles.photoThumb}
              onClick={() => onOpenLightbox(src)}
              aria-label={`${product.name} 商品照片 ${i + 1}`}
            >
              <Image src={src} alt="" fill sizes="76px" />
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.photoEmpty}>尚無商品照片</div>
      )}

      {prices && (
        <div className={styles.weightOptions}>
          {WEIGHT_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              className={`${styles.weightBtn} ${selectedWeight === w ? styles.weightBtnSelected : ""}`}
              onClick={() => onSelectWeight(product.id, w)}
            >
              <span className={`${styles.g} ${selectedWeight === w ? styles.gSelected : ""}`}>{w}g</span>
              <span className={`${styles.p} ${selectedWeight === w ? styles.pSelected : ""}`}>
                {fmt(prices[String(w) as "30" | "80" | "150"])}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        <div className={styles.preview}>
          {previewText}
          {selectedWeight && prices && <b>{fmt(prices[String(selectedWeight) as "30" | "80" | "150"])}</b>}
        </div>
        <button
          type="button"
          className={styles.addBtn}
          disabled={!selectedWeight}
          onClick={() => onAddToCart(product.id)}
        >
          加入
        </button>
      </div>
    </div>
  );
}
