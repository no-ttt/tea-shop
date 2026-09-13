"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Product, ProductStatus, Region } from "@/lib/types";
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
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  const filtered = useMemo(
    () => (regionFilter === "all" ? products : products.filter((p) => p.region === regionFilter)),
    [products, regionFilter],
  );

  return (
    <div>
      <h1 className={styles.pageTitle}>品項管理</h1>

      <ProductStatusManager statuses={statuses} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>目前所有品項（依分頁分組，可編輯／刪除）</h3>
        <div className={styles.toolbar}>
          <select
            className={styles.select}
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="all">全部分區</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>

          <button type="button" className={styles.button} onClick={() => setAddingNew((v) => !v)}>
            {addingNew ? "取消新增" : "＋ 新增商品"}
          </button>
        </div>

        {addingNew && (
          <div className={`${styles.card} ${styles.cardEditing}`}>
            <ProductForm regions={regions} statuses={statuses} onCancel={() => setAddingNew(false)} />
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
              />
            </div>
          ) : (
            <ProductSummaryRow
              key={product.id}
              product={product}
              status={statusMap.get(product.statusId)}
              onEdit={() => setEditingId(product.id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function ProductStatusManager({ statuses }: { statuses: ProductStatus[] }) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#c9bfa8");

  const systemStatus = statuses.find((s) => s.type === "purchasable");
  const tagStatuses = statuses.filter((s) => s.type === "tag");

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
        <div key={status.id} className={styles.statusRow}>
          <div className={styles.inlineRow}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>標籤文字</label>
            <input className={styles.input} defaultValue={status.label} style={{ flex: 1, minWidth: 120 }} />
            <input
              type="color"
              className={styles.colorSwatch}
              defaultValue={status.color ?? "#c9bfa8"}
            />
            <button
              type="button"
              className={styles.buttonDanger}
              style={{ marginLeft: "auto" }}
              disabled
              title="尚未串接後端，此功能即將推出"
            >
              刪除
            </button>
          </div>
        </div>
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
      <button
        type="button"
        className={styles.button}
        style={{ marginTop: 4 }}
        disabled
        title="尚未串接後端，此功能即將推出"
      >
        新增這個狀態
      </button>
    </div>
  );
}

function ProductSummaryRow({
  product,
  status,
  onEdit,
}: {
  product: Product;
  status: ProductStatus | undefined;
  onEdit: () => void;
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
          <button
            type="button"
            className={styles.buttonDanger}
            disabled
            title="尚未串接後端，此功能即將推出"
          >
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
}: {
  regions: Region[];
  statuses: ProductStatus[];
  product?: Product;
  onCancel: () => void;
}) {
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [previewIndex, setPreviewIndex] = useState(0);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const url of imagesRef.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
  }, []);

  const handleAddImage = (file: File) => {
    if (images.length >= 4) return;
    const url = URL.createObjectURL(file);
    setImages((prev) => [...prev, url]);
    setPreviewIndex((i) => i + 1);
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.startsWith("blob:")) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== idx);
    });
  };

  return (
    <div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label>分區</label>
          <select className={styles.select} defaultValue={product?.region ?? regions[0]?.id}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>狀態</label>
          <select className={styles.select} defaultValue={product?.statusId ?? "ok"}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label>品名</label>
        <textarea className={styles.textarea} defaultValue={product?.name} />
      </div>

      <div className={styles.field}>
        <label>備註標籤</label>
        <input className={styles.input} defaultValue={product?.note ?? ""} />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label>30g 價格</label>
          <input
            type="number"
            className={styles.input}
            defaultValue={product?.prices?.["30"] ?? ""}
          />
        </div>
        <div className={styles.field}>
          <label>80g 價格</label>
          <input
            type="number"
            className={styles.input}
            defaultValue={product?.prices?.["80"] ?? ""}
          />
        </div>
        <div className={styles.field}>
          <label>150g 價格</label>
          <input
            type="number"
            className={styles.input}
            defaultValue={product?.prices?.["150"] ?? ""}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>商品圖片（最多 4 張）</label>
        <div className={styles.thumbRow} key={previewIndex}>
          {images.map((src, idx) => (
            <div key={src} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
              <button
                type="button"
                className={styles.thumbRemove}
                onClick={() => handleRemoveImage(idx)}
              >
                ×
              </button>
            </div>
          ))}
          {images.length < 4 && (
            <label className={styles.uploadSlot}>
              ＋
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAddImage(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" className={styles.button} disabled title="尚未串接後端，此功能即將推出">
          {product ? "儲存變更" : "新增商品"}
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
