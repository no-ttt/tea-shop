"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SiteSettings } from "@/lib/admin-data";
import ImageUploadButton from "./ImageUploadButton";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

const SAVED_MESSAGE_TIMEOUT_MS = 3000;

export default function SettingsAdminView({
  shipping,
  shopEmail,
  linePayQrImage,
}: {
  shipping: SiteSettings["shipping"];
  shopEmail: string;
  linePayQrImage: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [freeThreshold, setFreeThreshold] = useState(shipping.freeThreshold);
  const [fee, setFee] = useState(shipping.fee);
  const [notifyEmail, setNotifyEmail] = useState(shopEmail);
  const [qrImage, setQrImage] = useState(linePayQrImage);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const clearSavedMessage = () => {
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    clearSavedMessage();
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "shipping.freeThreshold": freeThreshold,
          "shipping.fee": fee,
          "notify.shopEmail": notifyEmail,
          "branding.linePayQrImage": qrImage,
        }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }
      setSaving(false);
      setSaved(true);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), SAVED_MESSAGE_TIMEOUT_MS);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwSaving(true);
    setPwError(null);
    setPwSaved(false);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        setPwError(await parseErrorMessage(res, "更新失敗"));
        setPwSaving(false);
        return;
      }
      setNewPassword("");
      setPwSaving(false);
      setPwSaved(true);
    } catch {
      setPwError("更新失敗，請確認網路連線");
      setPwSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>其他設定</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {error && (
            <span className={styles.helpText} style={{ color: "#c0392b" }}>
              {error}
            </span>
          )}
          {saved && !error && (
            <span className={styles.helpText} style={{ color: "#2e7d32" }}>
              已儲存
            </span>
          )}
          <button type="button" className={styles.button} onClick={handleSave} disabled={saving || isPending}>
            {saving ? "儲存中…" : "儲存變更"}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>運費規則</h3>
        <div className={styles.field}>
          <label>免運門檻</label>
          <input
            type="number"
            min={0}
            className={styles.input}
            value={freeThreshold}
            onChange={(e) => {
              setFreeThreshold(Number(e.target.value));
              clearSavedMessage();
            }}
          />
        </div>
        <div className={styles.field}>
          <label>運費（未達免運門檻時收取的運費）</label>
          <input
            type="number"
            min={0}
            className={styles.input}
            value={fee}
            onChange={(e) => {
              setFee(Number(e.target.value));
              clearSavedMessage();
            }}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>訂單通知信箱</h3>
        <div className={styles.field}>
          <label>客人送出訂單後，通知信會寄到這個信箱</label>
          <input
            type="email"
            className={styles.input}
            placeholder="shop@example.com"
            value={notifyEmail}
            onChange={(e) => {
              setNotifyEmail(e.target.value);
              clearSavedMessage();
            }}
          />
        </div>
        <p className={styles.helpText}>留空則不會寄送訂單通知信。</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>LINE Pay 收款 QR Code</h3>
        <div className={styles.squarePreview} style={{ marginBottom: 16 }}>
          <Image src={qrImage} alt="目前使用中的 LINE Pay 收款 QR Code" fill sizes="140px" />
        </div>
        <ImageUploadButton
          folder="branding"
          label="更換 QR Code 圖片"
          compress={false}
          onUploaded={(url) => {
            setQrImage(url);
            clearSavedMessage();
          }}
        />
        <p className={styles.helpText}>上傳後記得按右上角「儲存變更」才會生效。</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>修改後台密碼</h3>
        <div className={styles.field}>
          <input
            type="password"
            className={styles.input}
            placeholder="輸入新密碼（至少 8 個字元）"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPwSaved(false);
              setPwError(null);
            }}
          />
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={handleChangePassword}
          disabled={pwSaving || newPassword.trim().length < 8}
        >
          {pwSaving ? "更新中…" : "更新密碼"}
        </button>
        {pwError && (
          <p className={styles.helpText} style={{ color: "#c0392b" }}>
            {pwError}
          </p>
        )}
        {pwSaved && !pwError && (
          <p className={styles.helpText} style={{ color: "#2e7d32" }}>
            已更新
          </p>
        )}
      </div>
    </div>
  );
}
