"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminNav.module.css";

const TABS = [
  { href: "/admin/products", label: "品項管理" },
  { href: "/admin/regions", label: "分頁與底圖" },
  { href: "/admin/fonts", label: "文字大小" },
  { href: "/admin/orders", label: "購買紀錄" },
  { href: "/admin/customer-fields", label: "客戶資料欄位" },
  { href: "/admin/bundle-discounts", label: "組合折扣" },
  { href: "/admin/settings", label: "其他設定" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`${styles.tab} ${pathname?.startsWith(tab.href) ? styles.active : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
