import type { OrderConfirmation } from "@/lib/types";
import type { CheckoutSubmitExtra } from "./CheckoutOverlay";
import shared from "./checkoutShared.module.css";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export default function OrderCompleteOverlay({
  confirmation,
  extra,
  onBackToShop,
}: {
  confirmation: OrderConfirmation | null;
  extra: CheckoutSubmitExtra | null;
  onBackToShop: () => void;
}) {
  if (!confirmation || !extra) return null;

  return (
    <div className={shared.overlay}>
      <div className={shared.wrap}>
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 16px",
            borderRadius: "50%",
            background: "rgba(120,170,120,0.18)",
            border: "2px solid #7fae7f",
            color: "#a8d6a8",
            fontSize: 32,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✓
        </div>
        <h2 className={shared.h1} style={{ textAlign: "center" }}>
          訂單已送出
        </h2>
        <div className={shared.sub} style={{ textAlign: "center" }}>
          感謝您的訂購，我們會盡快為您處理
        </div>

        <div className={shared.sectionTitle}>訂單編號</div>
        <div className={shared.card} style={{ textAlign: "center", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
          {confirmation.orderId}
        </div>

        <div className={shared.sectionTitle}>訂單明細</div>
        <div className={shared.card}>
          {confirmation.cart.map((line) => (
            <div key={line.key} className={shared.summaryRow}>
              <div>
                <div className="name">{line.name}</div>
                <div className="detail">{line.detail}</div>
              </div>
              <div>{fmt(line.price)}</div>
            </div>
          ))}
          <div className={shared.summarySubRow}>
            <span>商品小計</span>
            <span>{fmt(confirmation.subtotal)}</span>
          </div>
          {confirmation.bundleDiscountAmount > 0 && (
            <div className={shared.summarySubRow}>
              <span>{confirmation.bundleName ?? "組合折扣"}</span>
              <span>－{fmt(confirmation.bundleDiscountAmount)}</span>
            </div>
          )}
          <div className={shared.summarySubRow}>
            <span>運費</span>
            <span>{confirmation.shippingFee > 0 ? fmt(confirmation.shippingFee) : "免運"}</span>
          </div>
          <div className={shared.summaryTotal}>
            <span>總計</span>
            <span>{fmt(confirmation.total)}</span>
          </div>
        </div>

        <div className={shared.sectionTitle}>收件資訊</div>
        <div className={shared.card} style={{ fontSize: 13, lineHeight: 2 }}>
          姓名：{extra.name}
          <br />
          電話：{extra.phone}
          <br />
          {extra.birthday && (
            <>
              生日：{extra.birthday}
              <br />
            </>
          )}
          {extra.lineId && (
            <>
              LINE ID：{extra.lineId}
              <br />
            </>
          )}
          電子郵件：{extra.email}
          <br />
          {extra.shippingMethod === "cvs" ? (
            <>
              取貨方式：超商取貨（{extra.cvsType}）
              <br />
              門市名稱：{extra.cvsStoreName}
              <br />
            </>
          ) : (
            <>
              地址：{extra.zip ? `(${extra.zip}) ` : ""}
              {extra.address}
              <br />
            </>
          )}
          {extra.isGift && (
            <>
              送禮對象：{extra.giftName}
              <br />
            </>
          )}
          付款方式：{extra.paymentMethod === "bank" ? "匯款" : "LINE Pay"}
          {extra.paymentMethod === "bank"
            ? `（後五碼：${extra.bankTransferLast5}）`
            : `（客人回報電話後三碼：${extra.linePayLast3}）`}
          {extra.note && (
            <>
              <br />
              <span style={{ whiteSpace: "pre-line" }}>訂單備註：{extra.note}</span>
            </>
          )}
        </div>

        <button type="button" className={shared.button} style={{ marginTop: 22 }} onClick={onBackToShop}>
          返回選購
        </button>
      </div>
    </div>
  );
}
