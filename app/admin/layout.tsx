import Link from "next/link";
import type { Metadata } from "next";
import AdminNav from "@/components/admin/AdminNav";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "棋願製造｜後台管理",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.brand}>
          棋願製造 後台管理
        </Link>
        <Link href="/" className={styles.backToSite}>
          回到前台
        </Link>
      </header>

      <AdminNav />

      <main className={styles.main}>{children}</main>
    </div>
  );
}
