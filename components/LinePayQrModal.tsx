import { useState } from "react";
import shared from "./checkoutShared.module.css";

export default function LinePayQrModal({
  qrImage,
  onConfirm,
  onCancel,
}: {
  qrImage: string;
  onConfirm: (last3: string) => void;
  onCancel: () => void;
}) {
  const [last3, setLast3] = useState("");

  return (
    <div className={shared.overlay} style={{ zIndex: 60 }}>
      <div className={shared.wrap} style={{ maxWidth: 420, marginTop: 60 }}>
        <div className={shared.card} style={{ textAlign: "center" }}>
          <h2 className={shared.h1} style={{ marginBottom: 4 }}>
            棋願製造
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
            請用戶掃描此 QR Code並完成付款
          </p>
          <div style={{ position: "relative", width: "100%", maxWidth: 320, aspectRatio: "1", margin: "0 auto 18px" }}>
            {/* 使用者可透過後台輸入任意外部圖片網址，故用原生 img 跳過
                Next.js Image Optimizer 的網域白名單限制，避免未知網域直接讓頁面崩潰。 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImage}
              alt="LINE Pay QR Code"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
            />
          </div>
          <div className={shared.formField} style={{ textAlign: "left" }}>
            <label>付款完成請輸入電話後3碼</label>
            <input
              type="text"
              maxLength={3}
              inputMode="numeric"
              placeholder="例如：165"
              value={last3}
              onChange={(e) => setLast3(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={shared.button}
            onClick={() => {
              if (last3) onConfirm(last3);
            }}
          >
            確定
          </button>
          <button type="button" className={shared.buttonSecondary} onClick={onCancel}>
            取消，改選其他付款方式
          </button>
        </div>
      </div>
    </div>
  );
}
