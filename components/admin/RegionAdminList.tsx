"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { REGION_DESCRIPTION_MAX_LENGTH, type Region } from "@/lib/types";
import ImageUploadButton from "./ImageUploadButton";
import ConfirmDialog from "./ConfirmDialog";
import { useDragReorder } from "./useDragReorder";
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

      {/* key 綁定目前資料庫裡的順序與名稱：儲存/新增/刪除後 router.refresh() 拿到新資料時
          直接重新掛載，重設面板內的編輯狀態（不用 effect 同步 props → state）。 */}
      <RegionOrderPanel
        key={regions.map((r) => `${r.id}:${r.title}`).join("|")}
        regions={regions}
        onSaved={() => router.refresh()}
      />

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

function RegionOrderPanel({ regions, onSaved }: { regions: Region[]; onSaved: () => void }) {
  const [items, setItems] = useState(() => regions.map((r) => ({ id: r.id, title: r.title })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { draggingId, rowRef, handleProps } = useDragReorder(
    items.map((item) => item.id),
    (ids) => setItems(ids.map((id) => items.find((item) => item.id === id)!)),
  );

  const dirty = items.some((item, i) => item.id !== regions[i]?.id || item.title !== regions[i]?.title);

  const handleSave = async () => {
    if (items.some((item) => item.title.trim() === "")) {
      setError("分區名稱不可為空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regions/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
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

  if (regions.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>分區順序與名稱</h3>
      <p className={styles.helpText} style={{ marginBottom: 10 }}>
        名稱即前台分頁上顯示的文字；按住左側 ⋮⋮ 上下拖移可調整前台分頁的排列順序，改完按「儲存」一次套用。
      </p>

      {items.map((item, index) => (
        <div
          key={item.id}
          ref={rowRef(item.id)}
          className={`${styles.orderRow} ${draggingId === item.id ? styles.orderRowDragging : ""}`}
        >
          <button
            type="button"
            className={styles.dragHandle}
            aria-label={`拖移調整「${item.title}」的順序（也可用鍵盤上下鍵）`}
            disabled={saving}
            {...handleProps(item.id)}
          >
            ⋮⋮
          </button>
          <span className={styles.orderIndex}>{index + 1}</span>
          <input
            className={`${styles.input} ${styles.orderInput}`}
            value={item.title}
            disabled={saving}
            onChange={(e) =>
              setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, title: e.target.value } : p)))
            }
          />
        </div>
      ))}

      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className={styles.button} onClick={handleSave} disabled={saving || !dirty}>
          {saving ? "儲存中…" : "儲存順序與名稱"}
        </button>
        {dirty && (
          <button
            type="button"
            className={styles.buttonSecondary}
            disabled={saving}
            onClick={() => {
              setItems(regions.map((r) => ({ id: r.id, title: r.title })));
              setError(null);
            }}
          >
            還原
          </button>
        )}
      </div>
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
          {region.description && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, whiteSpace: "pre-line", lineHeight: 1.7 }}>
              {region.description}
            </div>
          )}
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
  const [description, setDescription] = useState(region?.description ?? "");
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
            body: JSON.stringify({ title, subtitle, note, description, bgImage, bgImageMobile }),
          })
        : await fetch("/api/admin/regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              subtitle,
              note,
              description,
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
        <label>分頁介紹（選填，顯示在首頁副標題下方，可換行）</label>
        <textarea
          className={styles.textarea}
          rows={4}
          maxLength={REGION_DESCRIPTION_MAX_LENGTH}
          placeholder="介紹這個分頁的茶款特色，例如產區風土、製茶工藝…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label>備註（選填，以強調色顯示的一行短句，例如「此系列三入一組享組合價」）</label>
        <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label>1. 電腦版底圖（寬螢幕用）</label>
        {bgImage && (
          <div className={styles.bgPreview} style={{ marginBottom: 6 }}>
            <Image src={bgImage} alt="桌機底圖預覽" fill sizes="480px" />
          </div>
        )}
        <ImageUploadButton
          folder="regions"
          onUploaded={setBgImage}
          label={bgImage ? "更換圖片" : "上傳圖片"}
          disabled={saving}
        />
      </div>
      <div className={styles.field}>
        <label>2. 手機版底圖（直式螢幕用）</label>
        {bgImageMobile && (
          <div className={styles.bgPreview} style={{ marginBottom: 6 }}>
            <Image src={bgImageMobile} alt="手機底圖預覽" fill sizes="480px" />
          </div>
        )}
        <ImageUploadButton
          folder="regions"
          onUploaded={setBgImageMobile}
          label={bgImageMobile ? "更換圖片" : "上傳圖片"}
          disabled={saving}
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
