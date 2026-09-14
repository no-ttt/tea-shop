import Storefront from "@/components/Storefront";
import { getBaseUrl, fetchJson } from "@/lib/fetch-api";
import type { SiteSettings } from "@/lib/data";
import type { Region, Product, ProductStatus, CustomerField, BundleDiscount } from "@/lib/types";

export default async function Home() {
  const baseUrl = await getBaseUrl();

  const [regions, products, statuses, customerFields, bundleDiscounts, siteSettings] = await Promise.all([
    fetchJson<Region[]>(baseUrl, "/api/regions"),
    fetchJson<Product[]>(baseUrl, "/api/products"),
    fetchJson<ProductStatus[]>(baseUrl, "/api/statuses"),
    fetchJson<CustomerField[]>(baseUrl, "/api/checkout/fields"),
    fetchJson<BundleDiscount[]>(baseUrl, "/api/bundle-discounts"),
    fetchJson<SiteSettings>(baseUrl, "/api/site-settings"),
  ]);

  return (
    <Storefront
      regions={regions}
      products={products}
      statuses={statuses}
      customerFields={customerFields}
      bundleDiscounts={bundleDiscounts}
      siteSettings={siteSettings}
    />
  );
}
