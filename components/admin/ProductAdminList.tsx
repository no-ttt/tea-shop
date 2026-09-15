"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Product, ProductStatus, Region } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import CustomSelect from "../CustomSelect";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

export default function ProductAdminList({
  regions,
  products,
  statuses,
}: {
  regions: Region[];
  products: Product[];
  statuses: ProductStatus[];
}) {
  const router = useRouter();
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  const filtered = useMemo(
    () => (regionFilter === "all" ? products : products.filter((p) => p.region === regionFilter)),
    [products, regionFilter],
  );

  const deletingProduct = deletingId ? products.find((p) => p.id === deletingId) ?? null : null;

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/products/${deletingId}`, { method: "DELETE" });
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
      <h1 className={styles.pageTitle}>品項管理</h1>

      <ProductStatusManager statuses={statuses} onChanged={() => router.refresh()} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>目前所有品項（依分頁分組，可編輯／刪除）</h3>
        <div className={styles.toolbar}>
          <CustomSelect
            value={regionFilter}
            onChange={setRegionFilter}
            options={[{ value: "all", label: "全部分區" }, ...regions.map((r) => ({ value: r.id, label: r.title }))]}
          />

          <button type="button" className={styles.button} onClick={() => setAddingNew((v) => !v)}>
            {addingNew ? "取消新增" : "＋ 新增商品"}
          </button>
        </div>

        {addingNew && (
          <div className={`${styles.card} ${styles.cardEditing}`}>
            <ProductForm
              regions={regions}
              statuses={statuses}
              onCancel={() => setAddingNew(false)}
              onSaved={() => {
                setAddingNew(false);
                router.refresh();
              }}
            />
          </div>
        )}

        {filtered.length === 0 && <div className={styles.emptyState}>此分區沒有商品</div>}

        {filtered.map((product) =>
          editingId === product.id ? (
            <div key={product.id} className={`${styles.card} ${styles.cardEditing}`}>
              <ProductForm
                regions={regions}
                statuses={statuses}
                product={product}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </div>
          ) : (
            <ProductSummaryRow
              key={product.id}
              product={product}
              status={statusMap.get(product.statusId)}
              onEdit={() => setEditingId(product.id)}
              onRequestDelete={() => {
                setDeleteError(null);
                setDeletingId(product.id);
              }}
            />
          ),
        )}
      </div>

      {deletingProduct && (
        <ConfirmDialog
          message={
            deleteError
              ? deleteError
              : `確定要刪除「${deletingProduct.name.replace(/\n/g, " ")}」這個商品嗎？若商品還被組合折扣使用，刪除會失敗。`
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

function ProductStatusManager({
  statuses,
  onChanged,
}: {
  statuses: ProductStatus[];
  onChanged: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#c9bfa8");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const systemStatus = statuses.find((s) => s.type === "purchasable");
  const tagStatuses = statuses.filter((s) => s.type === "tag");
  const deletingStatus = tagStatuses.find((s) => s.id === deletingId) ?? null;

  const addStatus = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, type: "tag", color: newColor }),
      });
      if (!res.ok) {
        setAddError(await parseErrorMessage(res, "新增失敗"));
        setAdding(false);
        return;
      }
      setNewLabel("");
      setNewColor("#c9bfa8");
      setAdding(false);
      onChanged();
    } catch {
      setAddError("新增失敗，請確認網路連線");
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/statuses/${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await parseErrorMessage(res, "刪除失敗"));
        setDeleting(false);
        return;
      }
      setDeletingId(null);
      setDeleting(false);
      onChanged();
    } catch {
      setDeleteError("刪除失敗，請確認網路連線");
      setDeleting(false);
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>商品狀態管理</h3>
      <p className={styles.helpText} style={{ marginBottom: 8 }}>
        「正常上架」是系統必要狀態（會顯示克數與價格），不能刪除，也不能改名。其他狀態都是顯示用的標籤（例如已售完、棋願製造中），可以自由新增、改文字、改顏色、刪除。
      </p>

      {systemStatus && (
        <div className={styles.statusRow}>
          <div className={styles.statusRowHeader}>
            <span className={styles.n}>{systemStatus.label}</span>
            <span className={styles.helpText} style={{ margin: 0 }}>
              系統必要狀態
            </span>
          </div>
        </div>
      )}

      {tagStatuses.map((status) => (
        <StatusTagRow
          key={status.id}
          status={status}
          onChanged={onChanged}
          onRequestDelete={() => {
            setDeleteError(null);
            setDeletingId(status.id);
          }}
        />
      ))}

      <div className={styles.inlineRow} style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>新增狀態標籤</label>
        <input
          className={styles.input}
          placeholder="例如：限量預購、即將到貨"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          style={{ flex: 1, minWidth: 120 }}
        />
        <input
          type="color"
          className={styles.colorSwatch}
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
        />
      </div>
      {addError && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {addError}
        </p>
      )}
      <button
        type="button"
        className={styles.button}
        style={{ marginTop: 4 }}
        onClick={addStatus}
        disabled={adding}
      >
        {adding ? "新增中…" : "新增這個狀態"}
      </button>

      {deletingStatus && (
        <ConfirmDialog
          message={
            deleteError
              ? deleteError
              : `確定要刪除「${deletingStatus.label}」這個狀態嗎？若還有商品使用這個狀態，刪除會失敗。`
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

function StatusTagRow({
  status,
  onChanged,
  onRequestDelete,
}: {
  status: ProductStatus;
  onChanged: () => void;
  onRequestDelete: () => void;
}) {
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(status.color ?? "#c9bfa8");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (patch: { label?: string; color?: string }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/statuses/${status.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }
      setSaving(false);
      onChanged();
    } catch {
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  return (
    <div className={styles.statusRow}>
      <div className={styles.inlineRow}>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>標籤文字</label>
        <input
          className={styles.input}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== status.label && save({ label })}
          style={{ flex: 1, minWidth: 120 }}
        />
        <input
          type="color"
          className={styles.colorSwatch}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={() => color !== (status.color ?? "#c9bfa8") && save({ color })}
        />
        <button
          type="button"
          className={styles.buttonDanger}
          style={{ marginLeft: "auto" }}
          onClick={onRequestDelete}
          disabled={saving}
        >
          刪除
        </button>
      </div>
      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ProductSummaryRow({
  product,
  status,
  onEdit,
  onRequestDelete,
}: {
  product: Product;
  status: ProductStatus | undefined;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div style={{ fontWeight: 700, whiteSpace: "pre-line" }}>{product.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
            {product.region}
            {product.note ? ` ・ ${product.note}` : ""}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            {status && <span className={styles.tag}>{status.label}</span>}
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {product.prices
                ? `30g $${product.prices["30"]} ／ 80g $${product.prices["80"]} ／ 150g $${product.prices["150"]}`
                : "尚未設定價格"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className={styles.buttonSecondary} onClick={onEdit}>
            編輯
          </button>
          <button type="button" className={styles.buttonDanger} onClick={onRequestDelete}>
            刪除
          </button>
        </div>
      </div>

      {product.images.length > 0 && (
        <div className={styles.thumbRow}>
          {product.images.map((src) => (
            <div key={src} className={styles.thumb}>
              <Image src={src} alt={product.name} fill sizes="64px" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({
  regions,
  statuses,
  product,
  onCancel,
  onSaved,
}: {
  regions: Region[];
  statuses: ProductStatus[];
  product?: Product;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [region, setRegion] = useState(product?.region ?? regions[0]?.id ?? "");
  const [statusId, setStatusId] = useState(product?.statusId ?? statuses[0]?.id ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [note, setNote] = useState(product?.note ?? "");
  const [price30, setPrice30] = useState(product?.prices?.["30"]?.toString() ?? "");
  const [price80, setPrice80] = useState(product?.prices?.["80"]?.toString() ?? "");
  const [price150, setPrice150] = useState(product?.prices?.["150"]?.toString() ?? "");
  const [images, setImages] = useState<{ url: string; imageId?: number }[]>(
    (product?.images ?? []).map((url) => ({ url })),
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${product.id}/images`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { images: { id: number; url: string }[] };
        if (!cancelled) {
          setImages(data.images.map((img) => ({ url: img.url, imageId: img.id })));
        }
      } catch {
        // 讀取失敗時保留原本從 product.images 初始化的清單（無 imageId，刪除會退回本地移除）
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const parsePrice = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

  const buildPrices = () => {
    const p30 = parsePrice(price30);
    const p80 = parsePrice(price80);
    const p150 = parsePrice(price150);
    if (p30 === undefined && p80 === undefined && p150 === undefined) return null;
    return { "30": p30 ?? 0, "80": p80 ?? 0, "150": p150 ?? 0 };
  };

  const handleAddImage = async () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (images.length >= 4) {
      setError("每個商品最多 4 張圖片");
      return;
    }
    if (!product) {
      // 新商品尚未存在於資料庫，圖片先暫存在本地，商品建立成功後再一併送出
      setImages((prev) => [...prev, { url }]);
      setNewImageUrl("");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "新增圖片失敗"));
        setSaving(false);
        return;
      }
      const data = (await res.json()) as { images: { id: number; url: string }[] };
      setImages(data.images.map((img) => ({ url: img.url, imageId: img.id })));
      setNewImageUrl("");
      setSaving(false);
    } catch {
      setError("新增圖片失敗，請確認網路連線");
      setSaving(false);
    }
  };

  const handleRemoveImage = async (idx: number) => {
    const target = images[idx];
    if (!product || target.imageId === undefined) {
      // 新商品尚未存在於資料庫，或圖片還沒有對應的 imageId（例如讀取失敗），只從本地清單移除
      setImages((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/images/${target.imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "刪除圖片失敗"));
        setSaving(false);
        return;
      }
      const data = (await res.json()) as { images: { id: number; url: string }[] };
      setImages(data.images.map((img) => ({ url: img.url, imageId: img.id })));
      setSaving(false);
    } catch {
      setError("刪除圖片失敗，請確認網路連線");
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name,
        region,
        statusId,
        note,
        prices: buildPrices(),
      };
      const res = product
        ? await fetch(`/api/admin/products/${product.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }

      if (!product && images.length > 0) {
        const created = (await res.json()) as Product;
        for (const img of images) {
          const imgRes = await fetch(`/api/admin/products/${created.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: img.url }),
          });
          if (!imgRes.ok) {
            // 圖片上傳失敗就整個撤銷剛建立的商品，避免留下沒有圖片的孤兒商品，
            // 也避免使用者誤以為要重試而再按一次「新增商品」造成重複建立。
            const imgErrorMessage = await parseErrorMessage(imgRes, "圖片新增失敗");
            const rollbackRes = await fetch(`/api/admin/products/${created.id}`, { method: "DELETE" });
            if (!rollbackRes.ok) {
              setError(`商品已建立，但圖片新增失敗（${imgErrorMessage}），且自動取消也失敗，請手動至品項清單確認`);
            } else {
              setError(`商品新增失敗（圖片上傳失敗：${imgErrorMessage}，已自動取消）`);
            }
            setSaving(false);
            return;
          }
        }
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
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label>分區</label>
          <CustomSelect
            value={region}
            onChange={setRegion}
            options={regions.map((r) => ({ value: r.id, label: r.title }))}
          />
        </div>
        <div className={styles.field}>
          <label>狀態</label>
          <CustomSelect
            value={statusId}
            onChange={setStatusId}
            options={statuses.map((s) => ({ value: s.id, label: s.label }))}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>品名</label>
        <textarea className={styles.textarea} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label>備註標籤</label>
        <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label>30g 價格</label>
          <input
            type="number"
            className={styles.input}
            value={price30}
            onChange={(e) => setPrice30(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>80g 價格</label>
          <input
            type="number"
            className={styles.input}
            value={price80}
            onChange={(e) => setPrice80(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>150g 價格</label>
          <input
            type="number"
            className={styles.input}
            value={price150}
            onChange={(e) => setPrice150(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>商品圖片網址（最多 4 張）</label>
        <div className={styles.thumbRow}>
          {images.map((img, idx) => (
            <div key={`${img.url}-${idx}`} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" />
              <button
                type="button"
                className={styles.thumbRemove}
                onClick={() => handleRemoveImage(idx)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {images.length < 4 && (
          <div className={styles.inlineRow} style={{ marginTop: 8 }}>
            <input
              className={styles.input}
              placeholder="https://..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <button type="button" className={styles.buttonSecondary} onClick={handleAddImage} disabled={saving}>
              新增圖片
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" className={styles.button} onClick={handleSave} disabled={saving}>
          {saving ? "儲存中…" : product ? "儲存變更" : "新增商品"}
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
