import { headers } from "next/headers";
import Storefront from "@/components/Storefront";
import type { Region, Product, ProductStatus, CustomerField, BundleDiscount } from "@/lib/types";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  return res.json() as Promise<T>;
}

export default async function Home() {
  const baseUrl = await getBaseUrl();

  const [regions, products, statuses, customerFields, bundleDiscounts] = await Promise.all([
    fetchJson<Region[]>(baseUrl, "/api/regions"),
    fetchJson<Product[]>(baseUrl, "/api/products"),
    fetchJson<ProductStatus[]>(baseUrl, "/api/statuses"),
    fetchJson<CustomerField[]>(baseUrl, "/api/checkout/fields"),
    fetchJson<BundleDiscount[]>(baseUrl, "/api/bundle-discounts"),
  ]);

  return (
    <Storefront
      regions={regions}
      products={products}
      statuses={statuses}
      customerFields={customerFields}
      bundleDiscounts={bundleDiscounts}
    />
  );
}
