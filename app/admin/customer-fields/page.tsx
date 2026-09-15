import { getSiteSettings, getAllCustomerFields } from "@/lib/admin-data";
import CustomerFieldsAdminList from "@/components/admin/CustomerFieldsAdminList";

export default async function AdminCustomerFieldsPage() {
  const [fields, settings] = await Promise.all([getAllCustomerFields(), getSiteSettings()]);
  return <CustomerFieldsAdminList fields={fields} freeShippingThreshold={settings.shipping.freeThreshold} />;
}
