import styles from "./ValidationAlertModal.module.css";

/**
 * 按「結帳」時發現商品或運費有變動，讓客人看完變動後自己決定要繼續加購還是直接結帳
 * （例如免運門檻調高，客人可能想再加購湊免運）。
 */
export default function CheckoutChangesModal({
  message,
  onCheckout,
  onContinueShopping,
}: {
  message: string | null;
  onCheckout: () => void;
  onContinueShopping: () => void;
}) {
  if (!message) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.icon}>!</div>
          <div className={styles.message}>{message}</div>
          <button type="button" className={styles.button} onClick={onCheckout}>
            直接結帳
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={onContinueShopping}>
            繼續加購
          </button>
        </div>
      </div>
    </div>
  );
}
