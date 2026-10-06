import type { Product, ProductOptionSelection, ProductStatus } from "@/lib/types";
import ProductCard from "./ProductCard";
import styles from "./ProductList.module.css";

export default function ProductList({
  products,
  currentRegion,
  statuses,
  selectedWeights,
  weightOptions,
  onSelectWeight,
  onAddToCart,
  addingProductId,
  onOpenLightbox,
}: {
  products: Product[];
  currentRegion: string;
  statuses: ProductStatus[];
  selectedWeights: Record<string, ProductOptionSelection>;
  weightOptions: number[];
  onSelectWeight: (productId: string, weight: ProductOptionSelection) => void;
  onAddToCart: (productId: string) => void;
  /** 正在向伺服器確認、尚未加入購物車的商品 id */
  addingProductId: string | null;
  onOpenLightbox: (images: string[], index: number) => void;
}) {
  const list = products.filter((p) => p.region === currentRegion);
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  return (
    <div className={styles.items}>
      {list.map((product) => {
        const status = statusMap.get(product.statusId) ?? {
          id: product.statusId,
          label: product.statusId,
          type: "tag" as const,
          color: "#c9bfa8",
        };
        return (
          <ProductCard
            key={product.id}
            product={product}
            status={status}
            selectedWeight={selectedWeights[product.id] ?? null}
            weightOptions={weightOptions}
            onSelectWeight={onSelectWeight}
            onAddToCart={onAddToCart}
            adding={addingProductId === product.id}
            addDisabled={addingProductId !== null}
            onOpenLightbox={onOpenLightbox}
          />
        );
      })}
    </div>
  );
}
