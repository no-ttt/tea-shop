"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCustomerField } from "@/lib/admin-data";
import ConfirmDialog from "./ConfirmDialog";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

export default function CustomerFieldsAdminList({
  fields,
  freeShippingThreshold,
}: {
  fields: AdminCustomerField[];
  freeShippingThreshold: number;
}) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const addField = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    setAddError(null);
    setActivateError(null);
    try {
      const res = await fetch("/api/admin/customer-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, type: "text", required: false }),
      });
      if (!res.ok) {
        setAddError(await parseErrorMessage(res, "新增失敗"));
        setAdding(false);
        return;
      }
      setNewLabel("");
      setAddingNew(false);
      setAdding(false);
      router.refresh();
    } catch {
      setAddError("新增失敗，請確認網路連線");
      setAdding(false);
    }
  };

  const deletingField = fields.find((f) => f.id === deletingId) ?? null;

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/customer-fields/${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await parseErrorMessage(res, "停用失敗"));
        setDeleting(false);
        return;
      }
      setDeletingId(null);
      setDeleting(false);
      router.refresh();
    } catch {
      setDeleteError("停用失敗，請確認網路連線");
      setDeleting(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    setActivateError(null);
    try {
      const res = await fetch(`/api/admin/customer-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) {
        setActivateError(await parseErrorMessage(res, "啟用失敗"));
        setActivatingId(null);
        return;
      }
      setActivatingId(null);
      router.refresh();
    } catch {
      setActivateError("啟用失敗，請確認網路連線");
      setActivatingId(null);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>客戶資料欄位</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>結帳表單欄位</h3>
        <p className={styles.helpText}>
          這裡可以新增、停用、修改客人結帳時要填寫的基本資料欄位（姓名、電話、LINE ID、電子郵件、郵遞區號、地址、生日），
          以及設定哪些欄位是「必填」。停用欄位後，該欄位就不會再出現在結帳表單上，之後也可以隨時重新啟用。姓名、電話是結帳必要欄位，不能停用。
          <br />
          「是否送禮」比較特殊，不在這裡管理，會固定顯示在結帳表單上。
        </p>

        {activateError && (
          <p className={styles.helpText} style={{ color: "#c0392b" }}>
            {activateError}
          </p>
        )}

        <div>
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              freeShippingThreshold={freeShippingThreshold}
              onDelete={() => {
                setDeleteError(null);
                setActivateError(null);
                setDeletingId(field.id);
              }}
              onActivate={() => handleActivate(field.id)}
              activating={activatingId === field.id}
              onSaved={() => router.refresh()}
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
            <button type="button" className={styles.button} onClick={addField} disabled={adding}>
              {adding ? "新增中…" : "新增"}
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => {
                setAddingNew(false);
                setNewLabel("");
                setAddError(null);
              }}
            >
              取消
            </button>
          </div>
        )}
        {addError && (
          <p className={styles.helpText} style={{ color: "#c0392b" }}>
            {addError}
          </p>
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
          message={
            deleteError
              ? deleteError
              : `確定要停用「${deletingField.label}」這個欄位嗎？停用後客人結帳時就不會再看到這個欄位。`
          }
          confirmLabel={deleting ? "停用中…" : "停用"}
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

function lineIdLabelFor(threshold: number) {
  return `LINE ID（滿 ${threshold.toLocaleString("zh-TW")} 元可加入會員專屬群組）`;
}

function FieldRow({
  field,
  freeShippingThreshold,
  onDelete,
  onActivate,
  activating,
  onSaved,
}: {
  field: AdminCustomerField;
  freeShippingThreshold: number;
  onDelete: () => void;
  onActivate: () => void;
  activating: boolean;
  onSaved: () => void;
}) {
  const isLineId = field.id === "lineId";
  const [required, setRequired] = useState(field.required);
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renameAreaRef = useRef<HTMLDivElement>(null);

  const displayLabel = isLineId ? lineIdLabelFor(freeShippingThreshold) : field.label;

  const startRenaming = () => {
    setLabel(field.label);
    setError(null);
    setRenaming(true);
  };

  const cancelRenaming = () => {
    setLabel(field.label);
    setError(null);
    setRenaming(false);
  };

  useEffect(() => {
    if (!renaming) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (renameAreaRef.current && !renameAreaRef.current.contains(e.target as Node)) {
        cancelRenaming();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renaming]);

  const saveLabel = async () => {
    if (label.trim() === "" || label === field.label) {
      setRenaming(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customer-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }
      setSaving(false);
      setRenaming(false);
      onSaved();
    } catch {
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  const handleRequiredChange = async (checked: boolean) => {
    setRequired(checked);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customer-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ required: checked }),
      });
      if (!res.ok) {
        setRequired(!checked);
        setError(await parseErrorMessage(res, "儲存失敗"));
        setSaving(false);
        return;
      }
      setSaving(false);
      onSaved();
    } catch {
      setRequired(!checked);
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  if (!field.active) {
    return (
      <div className={styles.inlineRow} style={{ opacity: 0.5 }}>
        <span style={{ minWidth: 160 }}>{displayLabel}</span>
        <span className={styles.helpText} style={{ margin: 0 }}>
          已停用，客人結帳時看不到這個欄位
        </span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="button" className={styles.buttonSuccess} onClick={onActivate} disabled={activating}>
            {activating ? "啟用中…" : "啟用"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inlineRow} ref={renaming ? renameAreaRef : undefined}>
      {renaming ? (
        <input
          className={styles.input}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ minWidth: 160 }}
          autoFocus
        />
      ) : (
        <span style={{ minWidth: 160 }}>{displayLabel}</span>
      )}

      {isLineId ? (
        <span
          className={styles.helpText}
          style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flexBasis: "100%" }}
        >
          滿 {freeShippingThreshold.toLocaleString("zh-TW")} 元才會顯示，不用另外設定必填。
        </span>
      ) : (
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={required}
            disabled={saving}
            onChange={(e) => handleRequiredChange(e.target.checked)}
          />
          必填
        </label>
      )}

      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        {!isLineId && renaming && (
          <>
            <button type="button" className={styles.button} onClick={saveLabel} disabled={saving}>
              {saving ? "儲存中…" : "儲存"}
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={cancelRenaming} disabled={saving}>
              取消
            </button>
          </>
        )}
        {!isLineId && !renaming && (
          <button type="button" className={styles.buttonSecondary} onClick={startRenaming}>
            修改名稱
          </button>
        )}
        {field.id !== "name" && field.id !== "phone" && (
          <button type="button" className={styles.buttonDanger} onClick={onDelete}>
            停用
          </button>
        )}
      </div>

      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b", flexBasis: "100%" }}>
          {error}
        </p>
      )}
    </div>
  );
}
