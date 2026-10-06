import { getSiteSettings } from "@/lib/admin-data";
import SettingsAdminView from "@/components/admin/SettingsAdminView";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <SettingsAdminView
      shipping={settings.shipping}
      shopEmail={settings.notify.shopEmail}
      linePayQrImage={settings.branding.linePayQrImage}
      memberNote={settings.content.memberNote}
      memberNoteScale={settings.theme.scaleMemberNote}
    />
  );
}
