import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import styles from "@/app/admin/(protected)/admin.module.css";

export const metadata: Metadata = {
  title: "後台登入｜棋願製造",
};

export default function AdminLoginPage() {
  return (
    <div className={styles.shell} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <LoginForm />
    </div>
  );
}
