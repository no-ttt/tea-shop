import { getCustomerFields, getSiteSettings } from "@/lib/data";
import CustomerFieldsAdminList from "@/components/admin/CustomerFieldsAdminList";

export default async function AdminCustomerFieldsPage() {
  const [fields, settings] = await Promise.all([getCustomerFields(), getSiteSettings()]);
  return <CustomerFieldsAdminList fields={fields} freeShippingThreshold={settings.shipping.freeThreshold} />;
}
