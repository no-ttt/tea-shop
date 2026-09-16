"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";
import shellStyles from "@/app/admin/(protected)/admin.module.css";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "密碼錯誤"));
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("登入失敗，請確認網路連線");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
      <h1 className={styles.pageTitle} style={{ textAlign: "center" }}>
        後台登入
      </h1>
      <div className={styles.section}>
        <div className={styles.field}>
          <input
            type="password"
            className={styles.input}
            placeholder="請輸入管理密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className={styles.button} disabled={loading} style={{ width: "100%" }}>
          {loading ? "登入中…" : "登入"}
        </button>
        {error && (
          <p className={styles.helpText} style={{ color: "#c0392b" }}>
            {error}
          </p>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <Link href="/" className={shellStyles.backToSite}>
          回到前台
        </Link>
      </div>
    </form>
  );
}
