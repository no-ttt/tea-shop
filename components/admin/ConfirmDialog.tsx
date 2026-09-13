"use client";

import shared from "./adminShared.module.css";
import styles from "./ConfirmDialog.module.css";

export default function ConfirmDialog({
  message,
  confirmLabel = "確定",
  cancelLabel = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={shared.buttonSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? shared.buttonDanger : shared.button}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
