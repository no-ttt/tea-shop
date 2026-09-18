import shared from "./checkoutShared.module.css";

export default function FreeShippingConfirmModal({
  remaining,
  onConfirm,
  onCancel,
}: {
  remaining: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={shared.overlay} style={{ zIndex: 60 }}>
      <div className={shared.wrap} style={{ maxWidth: 420, marginTop: 80 }}>
        <div className={shared.card}>
          <h2 className={shared.h1} style={{ marginBottom: 14 }}>
            尚未達免運門檻
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            再加購 <b style={{ color: "var(--accent)" }}>${remaining.toLocaleString("en-US")}</b>{" "}
            元即可享免運服務，確定要直接送出這筆訂單嗎？
          </p>
          <button type="button" className={shared.button} onClick={onConfirm}>
            直接送出訂單
          </button>
          <button type="button" className={shared.buttonSecondary} onClick={onCancel}>
            返回加購
          </button>
        </div>
      </div>
    </div>
  );
}
