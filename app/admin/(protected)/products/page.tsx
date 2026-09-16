import { getProducts, getRegions, getProductStatuses } from "@/lib/admin-data";
import ProductAdminList from "@/components/admin/ProductAdminList";

export default async function AdminProductsPage() {
  const [products, regions, statuses] = await Promise.all([
    getProducts(),
    getRegions(),
    getProductStatuses(),
  ]);

  return <ProductAdminList regions={regions} products={products} statuses={statuses} />;
}
