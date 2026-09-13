import type { PolicyKey } from "@/lib/policy-content";
import styles from "./SiteFooter.module.css";

export default function SiteFooter({ onOpenPolicy }: { onOpenPolicy: (key: PolicyKey) => void }) {
  return (
    <div className={styles.footer}>
      <div className={styles.row}>
        <div className={styles.links}>
          <button type="button" onClick={() => onOpenPolicy("privacy")}>
            隱私權政策
          </button>
          <span className={styles.divider}>｜</span>
          <button type="button" onClick={() => onOpenPolicy("terms")}>
            使用者條款與細則
          </button>
          <span className={styles.divider}>｜</span>
          <button type="button" onClick={() => onOpenPolicy("refund")}>
            退換貨政策
          </button>
        </div>
      </div>
      <div className={styles.company}>棋願製造　61032839</div>
    </div>
  );
}
