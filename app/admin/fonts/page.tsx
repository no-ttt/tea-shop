import { getSiteSettings, getProductStatuses } from "@/lib/admin-data";
import FontsAdminView from "@/components/admin/FontsAdminView";

export default async function AdminFontsPage() {
  const [settings, statuses] = await Promise.all([getSiteSettings(), getProductStatuses()]);
  const comingSoonStatus = statuses.find((s) => s.id === "comingsoon") ?? null;

  return (
    <FontsAdminView
      theme={settings.theme}
      comingSoonColor={comingSoonStatus?.color ?? "#c9bfa8"}
      comingSoonStatusId={comingSoonStatus?.id ?? null}
    />
  );
}
