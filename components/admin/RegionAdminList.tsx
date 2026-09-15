"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Region } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

export default function RegionAdminList({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deletingRegion = deletingId ? regions.find((r) => r.id === deletingId) ?? null : null;

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/regions/${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await parseErrorMessage(res, "刪除失敗"));
        setDeleting(false);
        return;
      }
      setDeletingId(null);
      setDeleting(false);
      router.refresh();
    } catch {
      setDeleteError("刪除失敗，請確認網路連線");
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>分區與底圖</h1>

      <div className={styles.section}>
        <div className={styles.toolbar}>
          <button type="button" className={styles.button} onClick={() => setAddingNew((v) => !v)}>
            {addingNew ? "取消新增" : "＋ 新增分區"}
          </button>
        </div>

        {addingNew && (
          <div className={`${styles.card} ${styles.cardEditing}`}>
            <RegionForm
              onCancel={() => setAddingNew(false)}
              onSaved={() => {
                setAddingNew(false);
                router.refresh();
              }}
            />
          </div>
        )}

        {regions.map((region) => (
          <RegionCard
            key={region.id}
            region={region}
            onRequestDelete={() => {
              setDeleteError(null);
              setDeletingId(region.id);
            }}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>

      {deletingRegion && (
        <ConfirmDialog
          message={
            deleteError
              ? deleteError
              : `確定要刪除「${deletingRegion.title}」這個分區嗎？分區底下若還有商品，刪除會失敗。`
          }
          confirmLabel={deleting ? "刪除中…" : "刪除"}
          danger
          onConfirm={handleDelete}
          onCancel={() => {
            setDeletingId(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}

function RegionCard({
  region,
  onRequestDelete,
  onSaved,
}: {
  region: Region;
  onRequestDelete: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className={`${styles.card} ${styles.cardEditing}`}>
        <RegionForm
          region={region}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onSaved();
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div style={{ fontWeight: 700 }}>{region.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
            {region.subtitle}
          </div>
          {region.note && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{region.note}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className={styles.buttonSecondary} onClick={() => setEditing(true)}>
            編輯
          </button>
          <button type="button" className={styles.buttonDanger} onClick={onRequestDelete}>
            刪除
          </button>
        </div>
      </div>

      <p className={styles.helpText} style={{ marginTop: 12, marginBottom: 6 }}>
        電腦版底圖預覽
      </p>
      <div className={styles.bgPreview}>
        <Image src={region.bgImage} alt={`${region.title} 桌機底圖`} fill sizes="480px" />
      </div>

      <p className={styles.helpText} style={{ marginTop: 8, marginBottom: 6 }}>
        手機版底圖預覽
      </p>
      <div className={styles.bgPreview}>
        <Image src={region.bgImageMobile} alt={`${region.title} 手機底圖`} fill sizes="480px" />
      </div>
    </div>
  );
}

function RegionForm({
  region,
  onCancel,
  onSaved,
}: {
  region?: Region;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(region?.title ?? "");
  const [subtitle, setSubtitle] = useState(region?.subtitle ?? "");
  const [note, setNote] = useState(region?.note ?? "");
  const [bgImage, setBgImage] = useState(region?.bgImage ?? "");
  const [bgImageMobile, setBgImageMobile] = useState(region?.bgImageMobile ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = region
        ? await fetch(`/api/admin/regions/${region.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, subtitle, note, bgImage, bgImageMobile }),
          })
        : await fetch("/api/admin/regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              subtitle,
              note,
              bgPos: "center",
              bgImage,
              bgImageMobile,
            }),
          });

      if (!res.ok) {
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }
      setSaving(false);
      onSaved();
    } catch {
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={styles.field}>
        <label>標題</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label>副標題</label>
        <input className={styles.input} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label>備註</label>
        <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label>1. 電腦版底圖網址（寬螢幕用）</label>
        {region && (
          <div className={styles.bgPreview} style={{ marginBottom: 6 }}>
            <Image src={region.bgImage} alt={`${region.title} 桌機底圖目前預覽`} fill sizes="480px" />
          </div>
        )}
        <input
          className={styles.input}
          placeholder="https://... 或 /images/..."
          value={bgImage}
          onChange={(e) => setBgImage(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label>2. 手機版底圖網址（直式螢幕用）</label>
        {region && (
          <div className={styles.bgPreview} style={{ marginBottom: 6 }}>
            <Image src={region.bgImageMobile} alt={`${region.title} 手機底圖目前預覽`} fill sizes="480px" />
          </div>
        )}
        <input
          className={styles.input}
          placeholder="https://... 或 /images/..."
          value={bgImageMobile}
          onChange={(e) => setBgImageMobile(e.target.value)}
        />
      </div>

      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" className={styles.button} onClick={handleSave} disabled={saving}>
          {saving ? "儲存中…" : region ? "儲存變更" : "新增分區"}
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
