"use client";

import { useEffect, useState } from "react";
import type { BundleDiscount, Product } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./adminShared.module.css";

export default function BundleDiscountAdminList({
  bundles: initialBundles,
  products,
}: {
  bundles: BundleDiscount[];
  products: Product[];
}) {
  const [bundles, setBundles] = useState(initialBundles);
  const [openPickerIdx, setOpenPickerIdx] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        id: crypto.randomUUID(),
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
            products={products}
            isPickerOpen={openPickerIdx === bundle.id}
            onTogglePicker={() =>
              setOpenPickerIdx((cur) => (cur === bundle.id ? null : bundle.id))
            }
            onChange={(patch) => updateBundle(bundle.id, patch)}
            onDelete={() => setDeletingId(bundle.id)}
          />
        ))}

        <button type="button" className={styles.button} onClick={addBundle}>
          ＋ 新增組合折扣
        </button>
      </div>

      {deletingBundle && (
        <ConfirmDialog
          message={`確定要刪除「${deletingBundle.name}」這組折扣嗎？`}
          confirmLabel="刪除"
          danger
          onConfirm={() => {
            setBundles((prev) => prev.filter((b) => b.id !== deletingId));
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

function BundleRow({
  bundle,
  products,
  isPickerOpen,
  onTogglePicker,
  onChange,
  onDelete,
}: {
  bundle: BundleDiscount;
  products: Product[];
  isPickerOpen: boolean;
  onTogglePicker: () => void;
  onChange: (patch: Partial<BundleDiscount>) => void;
  onDelete: () => void;
}) {
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
        <select
          className={styles.select}
          value={bundle.discountType}
          onChange={(e) => onChange({ discountType: e.target.value as "amount" | "percent" })}
        >
          <option value="amount">折扣固定金額</option>
          <option value="percent">折扣百分比</option>
        </select>
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

      <button type="button" className={styles.buttonDanger} onClick={onDelete}>
        刪除這組折扣
      </button>
    </div>
  );
}
