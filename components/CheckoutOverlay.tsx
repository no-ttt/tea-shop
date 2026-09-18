import { useState } from "react";
import type { CartLine, CustomerField, OrderTotals, OrderPayload, OrderConfirmation, ShippingMethod, PaymentMethod } from "@/lib/types";
import BankTransferModal from "./BankTransferModal";
import FreeShippingConfirmModal from "./FreeShippingConfirmModal";
import LinePayQrModal from "./LinePayQrModal";
import LinePayConfirmModal from "./LinePayConfirmModal";
import CustomSelect from "./CustomSelect";
import shared from "./checkoutShared.module.css";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

const CVS_TYPES = ["7-ELEVEN", "全家 FamilyMart", "OK超商", "萊爾富"];

export interface CheckoutSubmitExtra {
  name: string;
  phone: string;
  lineId?: string;
  email: string;
  zip?: string;
  address?: string;
  birthday?: string;
  isGift: boolean;
  giftName?: string;
  shippingMethod: ShippingMethod;
  cvsType?: string;
  cvsStoreName?: string;
  paymentMethod: PaymentMethod;
  bankTransferLast5?: string;
  linePayLast3?: string;
}

export default function CheckoutOverlay({
  open,
  cart,
  totals,
  customerFields,
  freeShippingThreshold,
  linePayQrImage,
  onClose,
  onSubmit,
}: {
  open: boolean;
  cart: CartLine[];
  totals: OrderTotals;
  customerFields: CustomerField[];
  freeShippingThreshold: number;
  linePayQrImage: string;
  onClose: () => void;
  onSubmit: (
    payload: OrderPayload,
    extra: CheckoutSubmitExtra,
  ) => Promise<{ ok: true; confirmation: OrderConfirmation } | { ok: false; error: string }>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("mail");
  const [cvsType, setCvsType] = useState(CVS_TYPES[0]);
  const [cvsStoreName, setCvsStoreName] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [bankTransferLast5, setBankTransferLast5] = useState("");
  const [linePayLast3, setLinePayLast3] = useState("");

  const totalBeforeShipping = Math.max(0, totals.subtotal - totals.bundleDiscountAmount);
  const remainingForFreeShipping = freeShippingThreshold - totalBeforeShipping;
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [linePayQrOpen, setLinePayQrOpen] = useState(false);
  const [linePayConfirmOpen, setLinePayConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [freeShippingConfirmOpen, setFreeShippingConfirmOpen] = useState(false);

  if (!open) return null;

  const qualifiesForGroup = totals.qualifiesForFreeShipping;
  const nameField = customerFields.find((f) => f.id === "name");
  const phoneField = customerFields.find((f) => f.id === "phone");
  const lineIdField = customerFields.find((f) => f.id === "lineId");
  const emailField = customerFields.find((f) => f.id === "email");
  const birthdayField = customerFields.find((f) => f.id === "birthday");
  const zipField = customerFields.find((f) => f.id === "zip");
  const addressField = customerFields.find((f) => f.id === "address");
  const customFields = customerFields.filter((f) => !f.builtin);

  const handlePaymentSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setError(null);
    if (method === "bank") {
      setBankModalOpen(true);
    } else {
      setLinePayQrOpen(true);
    }
  };

  const handleSubmitClick = () => {
    if (!totals.qualifiesForFreeShipping) {
      setFreeShippingConfirmOpen(true);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    setError(null);

    const extra: CheckoutSubmitExtra = {
      name,
      phone,
      lineId: qualifiesForGroup ? lineId : undefined,
      email,
      zip: shippingMethod === "mail" ? zip : undefined,
      address: shippingMethod === "mail" ? address : undefined,
      birthday: birthYear && birthMonth && birthDay ? `${birthYear}/${birthMonth}/${birthDay}` : undefined,
      isGift,
      giftName: isGift ? giftName : undefined,
      shippingMethod,
      cvsType: shippingMethod === "cvs" ? cvsType : undefined,
      cvsStoreName: shippingMethod === "cvs" ? cvsStoreName : undefined,
      paymentMethod,
      bankTransferLast5: paymentMethod === "bank" ? bankTransferLast5 : undefined,
      linePayLast3: paymentMethod === "linepay" ? linePayLast3 : undefined,
    };

    const payload: OrderPayload = {
      cart,
      customer: { name, phone, lineId: extra.lineId, email, zip: extra.zip, address: extra.address },
      customFieldValues: customFields.length > 0 ? customFieldValues : undefined,
      birthday: extra.birthday,
      isGift,
      giftName: extra.giftName,
      shippingMethod,
      cvsType: extra.cvsType,
      cvsStoreName: extra.cvsStoreName,
      paymentMethod,
      bankTransferLast5: extra.bankTransferLast5,
      linePayLast3: extra.linePayLast3,
    };

    setSubmitting(true);
    const result = await onSubmit(payload, extra);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFreeShippingConfirmOpen(false);
  };

  return (
    <>
      <div className={shared.overlay}>
        <div className={shared.wrap}>
          <button type="button" className={shared.back} onClick={onClose}>
            ← 返回選購
          </button>
          <h1 className={shared.h1}>結帳資訊</h1>

          <div className={shared.sectionTitle}>訂單明細</div>
          <div className={shared.card}>
            {cart.map((line) => (
              <div key={line.key} className={shared.summaryRow}>
                <div>
                  <div className="name">{line.name}</div>
                  <div className="detail">{line.detail}</div>
                </div>
                <div>{fmt(line.price)}</div>
              </div>
            ))}
            <div className={shared.summaryTotal}>
              <span>總計</span>
              <span>{fmt(totals.total)}</span>
            </div>
          </div>

          <div className={shared.sectionTitle}>會員資訊</div>
          <div className={shared.formField}>
            <label>
              {nameField?.label ?? "姓名"} <span className={shared.requiredMark}>*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={shared.formField}>
            <label>
              {phoneField?.label ?? "電話"} <span className={shared.requiredMark}>*</span>
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {qualifiesForGroup && lineIdField && (
            <div className={shared.formField}>
              <label>
                {lineIdField.label} <span className={shared.requiredMark}>*</span>
              </label>
              <input type="text" value={lineId} onChange={(e) => setLineId(e.target.value)} />
            </div>
          )}
          <div className={shared.formField}>
            <label>
              {emailField?.label ?? "電子郵件"} <span className={shared.requiredMark}>*</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {customFields.map((field) => (
            <div className={shared.formField} key={field.id}>
              <label>
                {field.label} {field.required && <span className={shared.requiredMark}>*</span>}
              </label>
              <input
                type={field.type}
                value={customFieldValues[field.id] ?? ""}
                onChange={(e) =>
                  setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
              />
            </div>
          ))}
          {birthdayField && (
            <div className={shared.formField}>
              <label>
                {birthdayField.label} {birthdayField.required && <span className={shared.requiredMark}>*</span>}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <CustomSelect
                  value={birthYear}
                  onChange={setBirthYear}
                  options={[
                    { value: "", label: "年" },
                    ...Array.from({ length: 80 }, (_, i) => 2010 - i).map((y) => ({
                      value: String(y),
                      label: String(y),
                    })),
                  ]}
                />
                <CustomSelect
                  value={birthMonth}
                  onChange={setBirthMonth}
                  options={[
                    { value: "", label: "月" },
                    ...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                      value: String(m),
                      label: String(m),
                    })),
                  ]}
                />
                <CustomSelect
                  value={birthDay}
                  onChange={setBirthDay}
                  options={[
                    { value: "", label: "日" },
                    ...Array.from({ length: 31 }, (_, i) => i + 1).map((d) => ({
                      value: String(d),
                      label: String(d),
                    })),
                  ]}
                />
              </div>
            </div>
          )}

          <div className={shared.sectionTitle}>收件資訊</div>
          <div className={shared.formField}>
            <label>取貨方式</label>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  border: `1px solid ${shippingMethod === "mail" ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                  background: shippingMethod === "mail" ? "rgba(201,138,75,0.18)" : "rgba(255,255,255,0.04)",
                  color: shippingMethod === "mail" ? "var(--accent)" : "var(--cream)",
                  fontWeight: shippingMethod === "mail" ? 700 : 400,
                  cursor: "pointer",
                }}
                onClick={() => setShippingMethod("mail")}
              >
                郵寄地址
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  border: `1px solid ${shippingMethod === "cvs" ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                  background: shippingMethod === "cvs" ? "rgba(201,138,75,0.18)" : "rgba(255,255,255,0.04)",
                  color: shippingMethod === "cvs" ? "var(--accent)" : "var(--cream)",
                  fontWeight: shippingMethod === "cvs" ? 700 : 400,
                  cursor: "pointer",
                }}
                onClick={() => setShippingMethod("cvs")}
              >
                超商取貨門市
              </button>
            </div>
          </div>

          {shippingMethod === "mail" ? (
            <>
              {zipField && (
                <div className={shared.formField}>
                  <label>
                    {zipField.label} {zipField.required && <span className={shared.requiredMark}>*</span>}
                  </label>
                  <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
              )}
              {addressField && (
                <div className={shared.formField}>
                  <label>
                    {addressField.label} {addressField.required && <span className={shared.requiredMark}>*</span>}
                  </label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              )}
            </>
          ) : (
            <>
              <div className={shared.formField}>
                <label>
                  超商類型 <span className={shared.requiredMark}>*</span>
                </label>
                <CustomSelect
                  value={cvsType}
                  onChange={setCvsType}
                  options={CVS_TYPES.map((t) => ({ value: t, label: t }))}
                />
              </div>
              <div className={shared.formField}>
                <label>
                  門市名稱 <span className={shared.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="請輸入門市名稱（例如：台北中山門市）"
                  value={cvsStoreName}
                  onChange={(e) => setCvsStoreName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className={shared.formField}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
              <span>是否送禮</span>
            </label>
          </div>
          {isGift && (
            <div className={shared.formField}>
              <label>收禮人姓名</label>
              <input type="text" value={giftName} onChange={(e) => setGiftName(e.target.value)} />
            </div>
          )}

          <div className={shared.sectionTitle}>付款方式</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={{
                flex: 1,
                border: `1px solid ${paymentMethod === "bank" ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 10,
                padding: 12,
                textAlign: "center",
                background: paymentMethod === "bank" ? "rgba(201,138,75,0.18)" : "rgba(255,255,255,0.04)",
                color: paymentMethod === "bank" ? "var(--accent)" : "var(--cream)",
                fontWeight: paymentMethod === "bank" ? 700 : 400,
                cursor: "pointer",
              }}
              onClick={() => handlePaymentSelect("bank")}
            >
              匯款
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                border: `1px solid ${paymentMethod === "linepay" ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 10,
                padding: 12,
                textAlign: "center",
                background: paymentMethod === "linepay" ? "rgba(201,138,75,0.18)" : "rgba(255,255,255,0.04)",
                color: paymentMethod === "linepay" ? "var(--accent)" : "var(--cream)",
                fontWeight: paymentMethod === "linepay" ? 700 : 400,
                cursor: "pointer",
              }}
              onClick={() => handlePaymentSelect("linepay")}
            >
              LINE Pay
            </button>
          </div>
          {paymentMethod === "bank" && bankTransferLast5 && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              已記錄匯款後五碼：{bankTransferLast5}
            </div>
          )}
          {paymentMethod === "linepay" && linePayLast3 && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              已記錄付款回報後三碼：{linePayLast3}
            </div>
          )}

          {error && (
            <div style={{ color: "#e08a7a", fontSize: 13, marginTop: 14, textAlign: "center" }}>{error}</div>
          )}

          <button type="button" className={shared.button} style={{ marginTop: 22 }} disabled={submitting} onClick={handleSubmitClick}>
            {submitting ? "送出中…" : "送出訂單"}
          </button>
        </div>
      </div>

      {freeShippingConfirmOpen && (
        <FreeShippingConfirmModal
          remaining={remainingForFreeShipping}
          submitting={submitting}
          error={error}
          onConfirm={handleSubmit}
          onCancel={() => setFreeShippingConfirmOpen(false)}
        />
      )}

      {bankModalOpen && (
        <BankTransferModal
          onConfirm={(last5) => {
            setBankTransferLast5(last5);
            setBankModalOpen(false);
          }}
          onCancel={() => setBankModalOpen(false)}
        />
      )}

      {linePayQrOpen && (
        <LinePayQrModal
          qrImage={linePayQrImage}
          onConfirm={(last3) => {
            setLinePayLast3(last3);
            setLinePayQrOpen(false);
            setLinePayConfirmOpen(true);
          }}
          onCancel={() => setLinePayQrOpen(false)}
        />
      )}

      <LinePayConfirmModal
        open={linePayConfirmOpen}
        onYes={() => setLinePayConfirmOpen(false)}
        onNo={() => {
          setLinePayLast3("");
          setLinePayConfirmOpen(false);
          setLinePayQrOpen(true);
        }}
      />
    </>
  );
}
