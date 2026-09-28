import Storefront from "@/components/Storefront";
import {
  getRegions,
  getProducts,
  getProductStatuses,
  getCustomerFields,
  getBundleDiscounts,
  getSiteSettings,
  computeCheckoutVersion,
} from "@/lib/data";

export default async function Home() {
  const regions = await getRegions();
  const products = await getProducts();
  const statuses = await getProductStatuses();
  const customerFields = await getCustomerFields();
  const bundleDiscounts = await getBundleDiscounts();
  const siteSettings = await getSiteSettings();
  const checkoutVersion = await computeCheckoutVersion({
    customerFields,
    bundles: bundleDiscounts,
    settings: siteSettings,
  });

  return (
    <Storefront
      regions={regions}
      products={products}
      statuses={statuses}
      customerFields={customerFields}
      bundleDiscounts={bundleDiscounts}
      siteSettings={siteSettings}
      checkoutVersion={checkoutVersion}
    />
  );
}
