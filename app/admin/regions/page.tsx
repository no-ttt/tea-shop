import { getRegions } from "@/lib/data";
import RegionAdminList from "@/components/admin/RegionAdminList";

export default async function AdminRegionsPage() {
  const regions = await getRegions();
  return <RegionAdminList regions={regions} />;
}
