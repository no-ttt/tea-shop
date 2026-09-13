import { getCustomerFields } from "@/lib/data";
import CustomerFieldsAdminList from "@/components/admin/CustomerFieldsAdminList";

export default async function AdminCustomerFieldsPage() {
  const fields = await getCustomerFields();
  return <CustomerFieldsAdminList fields={fields} />;
}
