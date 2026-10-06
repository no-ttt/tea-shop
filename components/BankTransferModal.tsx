import { useState } from "react";
import { BANK_LAST5_LENGTH, isDigits } from "@/lib/order-validation";
import shared from "./checkoutShared.module.css";

export default function BankTransferModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (last5: string) => void;
  onCancel: () => void;
}) {
  const [last5, setLast5] = useState("");
  const complete = isDigits(last5, BANK_LAST5_LENGTH);

  return (
    <div className={shared.overlay} style={{ zIndex: 60 }}>
      <div className={shared.wrap} style={{ maxWidth: 420, marginTop: 80 }}>
        <div className={shared.card}>
          <h2 className={shared.h1} style={{ marginBottom: 14 }}>
            匯款資訊
          </h2>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>銀行</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>中國信託銀行（822）</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>帳號</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>473540926530</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>戶名</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>黃宏棋</div>
          </div>
          <div className={shared.formField}>
            <label>請填寫匯款帳號後五碼，方便我們核對款項</label>
            <input
              type="text"
              maxLength={BANK_LAST5_LENGTH}
              inputMode="numeric"
              autoComplete="off"
              placeholder="例如：12345"
              value={last5}
              // 只留數字（貼上含空白、全形或其他字元時直接濾掉）
              onChange={(e) => setLast5(e.target.value.replace(/\D/g, "").slice(0, BANK_LAST5_LENGTH))}
            />
            <div className={shared.charCount}>
              {complete ? "✓ 已填寫完整" : `還差 ${BANK_LAST5_LENGTH - last5.length} 碼`}
            </div>
          </div>
          <button
            type="button"
            className={shared.button}
            disabled={!complete}
            onClick={() => {
              if (complete) onConfirm(last5);
            }}
          >
            確認
          </button>
          <button type="button" className={shared.buttonSecondary} onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
