import type { Product, ProductStatus } from "@/lib/types";
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
  onOpenLightbox,
}: {
  products: Product[];
  currentRegion: string;
  statuses: ProductStatus[];
  selectedWeights: Record<string, number>;
  weightOptions: number[];
  onSelectWeight: (productId: string, weight: number) => void;
  onAddToCart: (productId: string) => void;
  onOpenLightbox: (src: string) => void;
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
            onOpenLightbox={onOpenLightbox}
          />
        );
      })}
    </div>
  );
}
