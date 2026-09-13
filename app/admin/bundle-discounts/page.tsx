import { getBundleDiscounts, getProducts } from "@/lib/data";
import BundleDiscountAdminList from "@/components/admin/BundleDiscountAdminList";

export default async function AdminBundleDiscountsPage() {
  const [bundles, products] = await Promise.all([getBundleDiscounts(), getProducts()]);
  return <BundleDiscountAdminList bundles={bundles} products={products} />;
}
