import type { CartLine, OrderTotals } from "@/lib/types";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/mock-data";
import styles from "./Cart.module.css";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export default function Cart({
  cart,
  totals,
  onRemove,
  onClear,
  onCheckout,
}: {
  cart: CartLine[];
  totals: OrderTotals;
  onRemove: (key: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  // 購物車顯示的「總計」只計小計－組合折扣，不含運費；運費只在文案與結帳時計算（照抄原網站 renderCart() 邏輯）
  const totalBeforeShipping = Math.max(0, totals.subtotal - totals.bundleDiscountAmount);
  const remaining = FREE_SHIPPING_THRESHOLD - totalBeforeShipping;

  return (
    <div className="card">
      <div className={styles.title}>
        <span>購買明細</span>
        <button type="button" className={styles.clearBtn} onClick={onClear}>
          清空
        </button>
      </div>

      <div className={styles.list}>
        {cart.length === 0 ? (
          <div className={styles.empty}>尚未選購任何商品</div>
        ) : (
          cart.map((line) => (
            <div key={line.key} className={styles.row}>
              <div>
                <div className={styles.name}>{line.name}</div>
                <div className={styles.detail}>{line.detail}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={styles.price}>{fmt(line.price)}</span>
                <button
                  type="button"
                  className={styles.removeX}
                  onClick={() => onRemove(line.key)}
                  aria-label="移除品項"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.totals}>
        <div className={styles.totalsRow}>
          <span>品項數</span>
          <span>{cart.length}</span>
        </div>
        <div className={`${styles.totalsRow} ${styles.grand}`}>
          <span>總計</span>
          <span>{fmt(totalBeforeShipping)}</span>
        </div>
      </div>

      {totals.bundleDiscountAmount > 0 && (
        <div className={styles.bundleNote}>
          已套用「{totals.bundleName}」折扣 －{fmt(totals.bundleDiscountAmount)}
        </div>
      )}

      {cart.length > 0 && (
        <div
          className={`${styles.shippingNotice} ${totals.qualifiesForFreeShipping ? styles.over : styles.under}`}
        >
          {totals.qualifiesForFreeShipping ? (
            <>
              🎉 已滿 {fmt(FREE_SHIPPING_THRESHOLD)} 元，享免運服務（省下 {fmt(SHIPPING_FEE)} 元運費），並可加入會員專屬群組享各種福利！
            </>
          ) : (
            <>
              再加購 <b>{fmt(remaining)}</b> 元即可享免運服務！
            </>
          )}
        </div>
      )}

      <button type="button" className={styles.checkoutBtn} disabled={cart.length === 0} onClick={onCheckout}>
        結　帳
      </button>
    </div>
  );
}
