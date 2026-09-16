"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/admin/(protected)/admin.module.css";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={styles.backToSite}
      style={{ background: "none", fontFamily: "inherit", cursor: "pointer" }}
    >
      登出
    </button>
  );
}
