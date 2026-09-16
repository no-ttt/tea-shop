import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/admin/LogoutButton";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "棋願製造｜後台管理",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authed = await verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!authed) {
    redirect("/admin/login");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.brand}>
          棋願製造 後台管理
        </Link>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/" className={styles.backToSite}>
            回到前台
          </Link>
          <LogoutButton />
        </div>
      </header>

      <AdminNav />

      <main className={styles.main}>{children}</main>
    </div>
  );
}
