"use client";

import { useState } from "react";
import type { CustomerField } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./adminShared.module.css";

export default function CustomerFieldsAdminList({
  fields: initialFields,
  freeShippingThreshold,
}: {
  fields: CustomerField[];
  freeShippingThreshold: number;
}) {
  const [fields, setFields] = useState(initialFields);
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addField = () => {
    const label = newLabel.trim();
    if (!label) return;
    setFields((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label, type: "text", required: false, builtin: false },
    ]);
    setNewLabel("");
    setAddingNew(false);
  };

  const deletingField = fields.find((f) => f.id === deletingId) ?? null;

  return (
    <div>
      <h1 className={styles.pageTitle}>客戶資料欄位</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>結帳表單欄位</h3>
        <p className={styles.helpText}>
          這裡可以新增、刪除、修改客人結帳時要填寫的基本資料欄位（姓名、電話、LINE ID、電子郵件、郵遞區號、地址），
          以及設定哪些欄位是「必填」。刪除欄位後，該欄位就不會再出現在結帳表單上。
          <br />
          「生日」與「是否送禮」這兩個欄位比較特殊，不在這裡管理，會固定顯示在結帳表單上。
        </p>

        <div>
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              freeShippingThreshold={freeShippingThreshold}
              onDelete={() => setDeletingId(field.id)}
            />
          ))}
        </div>

        {addingNew && (
          <div className={styles.inlineRow} style={{ marginTop: 12 }}>
            <input
              className={styles.input}
              placeholder="欄位名稱"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ minWidth: 160 }}
              autoFocus
            />
            <button type="button" className={styles.button} onClick={addField}>
              新增
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => {
                setAddingNew(false);
                setNewLabel("");
              }}
            >
              取消
            </button>
          </div>
        )}

        <button
          type="button"
          className={styles.button}
          style={{ marginTop: 12 }}
          onClick={() => setAddingNew((v) => !v)}
        >
          ＋ 新增欄位
        </button>
      </div>

      {deletingField && (
        <ConfirmDialog
          message={`確定要刪除「${deletingField.label}」這個欄位嗎？刪除後客人結帳時就不會再看到這個欄位。`}
          confirmLabel="刪除"
          danger
          onConfirm={() => {
            setFields((prev) => prev.filter((f) => f.id !== deletingField.id));
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

function lineIdLabelFor(threshold: number) {
  return `LINE ID（滿 ${threshold.toLocaleString("zh-TW")} 元可加入會員專屬群組）`;
}

function FieldRow({
  field,
  freeShippingThreshold,
  onDelete,
}: {
  field: CustomerField;
  freeShippingThreshold: number;
  onDelete: () => void;
}) {
  const isLineId = field.id === "lineId";
  const [required, setRequired] = useState(field.required);
  const [renaming, setRenaming] = useState(false);
  const [threshold, setThreshold] = useState(freeShippingThreshold);
  const [label, setLabel] = useState(isLineId ? lineIdLabelFor(freeShippingThreshold) : field.label);

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    if (isLineId) setLabel(lineIdLabelFor(value));
  };

  return (
    <div className={styles.inlineRow}>
      {renaming ? (
        <input
          className={styles.input}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => setRenaming(false)}
          style={{ minWidth: 160 }}
          autoFocus
        />
      ) : (
        <span style={{ minWidth: 160 }}>{label}</span>
      )}

      {isLineId ? (
        <span className={styles.helpText} style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flexBasis: "100%" }}>
          滿
          <input
            type="number"
            min={0}
            className={styles.input}
            value={threshold}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            style={{ width: 90 }}
          />
          元才會顯示，不用另外設定必填。
        </span>
      ) : (
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          必填
        </label>
      )}

      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <button type="button" className={styles.buttonSecondary} onClick={() => setRenaming((v) => !v)}>
          修改名稱
        </button>
        <button type="button" className={styles.buttonDanger} onClick={onDelete}>
          刪除
        </button>
      </div>
    </div>
  );
}
