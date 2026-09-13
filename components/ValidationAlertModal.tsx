import styles from "./ValidationAlertModal.module.css";

export default function ValidationAlertModal({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.icon}>!</div>
          <div className={styles.message}>{message}</div>
          <button type="button" className={styles.button} onClick={onClose}>
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
