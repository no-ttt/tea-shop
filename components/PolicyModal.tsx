import { POLICY_CONTENT, type PolicyKey } from "@/lib/policy-content";
import styles from "./PolicyModal.module.css";

export default function PolicyModal({
  policyKey,
  onClose,
}: {
  policyKey: PolicyKey | null;
  onClose: () => void;
}) {
  if (!policyKey) return null;
  const data = POLICY_CONTENT[policyKey];

  return (
    <div className={styles.overlay}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="關閉">
            ✕
          </button>
          <h2 className={styles.title}>{data.title}</h2>
          {/* data.html 是開發者寫死的靜態法律文字，非使用者輸入內容 */}
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: data.html }} />
        </div>
      </div>
    </div>
  );
}
