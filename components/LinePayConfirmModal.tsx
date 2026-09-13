import shared from "./checkoutShared.module.css";

export default function LinePayConfirmModal({
  open,
  onYes,
  onNo,
}: {
  open: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  if (!open) return null;

  return (
    <div className={shared.overlay} style={{ zIndex: 70 }}>
      <div className={shared.wrap} style={{ maxWidth: 360, marginTop: 140 }}>
        <div className={shared.card} style={{ textAlign: "center" }}>
          <h2 className={shared.h1} style={{ marginBottom: 14 }}>
            請確認付款狀態
          </h2>
          <p style={{ marginBottom: 22, fontSize: 15 }}>請問是否已經完成付款？</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className={shared.buttonSecondary} style={{ flex: 1, marginTop: 0 }} onClick={onNo}>
              否，返回結帳
            </button>
            <button type="button" className={shared.button} style={{ flex: 1 }} onClick={onYes}>
              是，已完成付款
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
