"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BundleDiscount, Product } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import CustomSelect from "../CustomSelect";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

const NEW_BUNDLE_PREFIX = "new_";

export default function BundleDiscountAdminList({
  bundles: initialBundles,
  products,
}: {
  bundles: BundleDiscount[];
  products: Product[];
}) {
  const router = useRouter();
  const [bundles, setBundles] = useState(initialBundles);
  const [openPickerIdx, setOpenPickerIdx] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (openPickerIdx === null) return;
    const onDocClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(`.${styles.multiSelectWrap}`)) return;
      setOpenPickerIdx(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openPickerIdx]);

  const addBundle = () => {
    setBundles((prev) => [
      ...prev,
      {
        id: `${NEW_BUNDLE_PREFIX}${crypto.randomUUID()}`,
        name: "新組合折扣",
        productIds: [],
        discountType: "percent",
        discountValue: 0,
      },
    ]);
  };

  const updateBundle = (id: string, patch: Partial<BundleDiscount>) => {
    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deletingBundle = deletingId !== null ? bundles.find((b) => b.id === deletingId) ?? null : null;

  const handleDelete = async () => {
    if (!deletingId) return;
    if (deletingId.startsWith(NEW_BUNDLE_PREFIX)) {
      setBundles((prev) => prev.filter((b) => b.id !== deletingId));
      setDeletingId(null);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/bundle-discounts/${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await parseErrorMessage(res, "刪除失敗"));
        setDeleting(false);
        return;
      }
      setBundles((prev) => prev.filter((b) => b.id !== deletingId));
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
      <h1 className={styles.pageTitle}>組合折扣</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>組合折扣</h3>
        <p className={styles.helpText}>
          設定「同時買了指定的幾樣品項」時，自動套用的折扣。客人結帳畫面與訂單金額都會自動套用符合條件的組合折扣（同時符合多組時，取折扣金額最高的一組）。
        </p>

        {bundles.length === 0 && <div className={styles.emptyState}>尚未設定組合折扣</div>}

        {bundles.map((bundle) => (
          <BundleRow
            key={bundle.id}
            bundle={bundle}
            isNew={bundle.id.startsWith(NEW_BUNDLE_PREFIX)}
            products={products}
            isPickerOpen={openPickerIdx === bundle.id}
            onTogglePicker={() =>
              setOpenPickerIdx((cur) => (cur === bundle.id ? null : bundle.id))
            }
            onChange={(patch) => updateBundle(bundle.id, patch)}
            onDelete={() => {
              setDeleteError(null);
              setDeletingId(bundle.id);
            }}
            onSaved={(saved) => {
              updateBundle(bundle.id, saved);
              if (bundle.id !== saved.id) {
                setBundles((prev) => prev.map((b) => (b.id === bundle.id ? { ...b, ...saved } : b)));
              }
              router.refresh();
            }}
          />
        ))}
      </div>

      <button type="button" className={styles.button} onClick={addBundle}>
        ＋ 新增組合折扣
      </button>

      {deletingBundle && (
        <ConfirmDialog
          message={deleteError ? deleteError : `確定要刪除「${deletingBundle.name}」這組折扣嗎？`}
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

function BundleRow({
  bundle,
  isNew,
  products,
  isPickerOpen,
  onTogglePicker,
  onChange,
  onDelete,
  onSaved,
}: {
  bundle: BundleDiscount;
  isNew: boolean;
  products: Product[];
  isPickerOpen: boolean;
  onTogglePicker: () => void;
  onChange: (patch: Partial<BundleDiscount>) => void;
  onDelete: () => void;
  onSaved: (saved: BundleDiscount) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(bundle.productIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ productIds: Array.from(next) });
  };

  const selected = new Set(bundle.productIds);
  const names = products
    .filter((p) => selected.has(p.id))
    .map((p) => p.name.replace(/\n/g, " "))
    .join("、");
  const btnLabel = selected.size > 0 ? `已選 ${selected.size} 項` : "點選以選擇品項";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = isNew
        ? await fetch("/api/admin/bundle-discounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: bundle.name,
              productIds: bundle.productIds,
              discountType: bundle.discountType,
              discountValue: bundle.discountValue,
            }),
          })
        : await fetch(`/api/admin/bundle-discounts/${bundle.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: bundle.name,
              productIds: bundle.productIds,
              discountType: bundle.discountType,
              discountValue: bundle.discountValue,
            }),
          });

      if (!res.ok) {
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }
      const saved = (await res.json()) as BundleDiscount;
      setSaving(false);
      onSaved(saved);
    } catch {
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  return (
    <div className={styles.cardNoBorder}>
      <div className={styles.field}>
        <label>折扣名稱</label>
        <input
          className={styles.input}
          value={bundle.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <p className={styles.helpText}>
        指定品項（{selected.size} 項）：{selected.size > 0 ? names : "尚未選擇"}
      </p>

      <div className={`${styles.multiSelectWrap} ${isPickerOpen ? styles.multiSelectWrapOpen : ""}`}>
        <button type="button" className={styles.multiSelectBtn} onClick={onTogglePicker}>
          {btnLabel}
        </button>
        <div className={styles.multiSelectPanel}>
          {products.map((p) => (
            <label key={p.id} className={styles.multiSelectOption}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <span>
                {p.name.replace(/\n/g, " ")}
                {p.region ? `（${p.region}）` : ""}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>折扣方式</label>
        <CustomSelect
          value={bundle.discountType}
          onChange={(v) => onChange({ discountType: v as "amount" | "percent" })}
          options={[
            { value: "amount", label: "折扣固定金額" },
            { value: "percent", label: "折扣百分比" },
          ]}
        />
      </div>

      <div className={styles.field}>
        <label>{bundle.discountType === "percent" ? "折扣百分比（例如 10 代表 9 折省 10%）" : "折扣金額（元）"}</label>
        <input
          type="number"
          min={0}
          className={styles.input}
          value={bundle.discountValue}
          onChange={(e) => onChange({ discountValue: Number(e.target.value) })}
        />
      </div>

      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className={styles.button} onClick={handleSave} disabled={saving}>
          {saving ? "儲存中…" : isNew ? "新增這組折扣" : "儲存變更"}
        </button>
        <button type="button" className={styles.buttonDanger} onClick={onDelete}>
          刪除這組折扣
        </button>
      </div>
    </div>
  );
}
