import { useState } from "react";
import type { CartLine, CustomerField, OrderTotals, OrderPayload, OrderConfirmation, ShippingMethod, PaymentMethod } from "@/lib/types";
import BankTransferModal from "./BankTransferModal";
import FreeShippingConfirmModal from "./FreeShippingConfirmModal";
import LinePayQrModal from "./LinePayQrModal";
import LinePayConfirmModal from "./LinePayConfirmModal";
import CustomSelect from "./CustomSelect";
import ValidationAlertModal from "./ValidationAlertModal";
import { ORDER_NOTE_MAX_LENGTH, validateOrderForm, type OrderFormError } from "@/lib/order-validation";
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
  /** 未選擇時為 null（取貨/付款方式都不預選，送出時由伺服器提示客人選擇） */
  shippingMethod: ShippingMethod | null;
  cvsType?: string;
  cvsStoreName?: string;
  paymentMethod: PaymentMethod | null;
  bankTransferLast5?: string;
  linePayLast3?: string;
  note?: string;
}

export default function CheckoutOverlay({
  open,
  cart,
  totals,
  customerFields,
  freeShippingThreshold,
  linePayQrImage,
  onClose,
  onVerifyCheckout,
  onSubmit,
}: {
  open: boolean;
  cart: CartLine[];
  totals: OrderTotals;
  customerFields: CustomerField[];
  freeShippingThreshold: number;
  linePayQrImage: string;
  onClose: () => void;
  /** 向伺服器確認購物車與結帳設定是否仍是最新；回傳 false 代表已被更新，不應繼續付款流程 */
  onVerifyCheckout: () => Promise<boolean>;
  onSubmit: (
    payload: Omit<OrderPayload, "checkoutVersion">,
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
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(null);
  const [cvsType, setCvsType] = useState(CVS_TYPES[0]);
  const [cvsStoreName, setCvsStoreName] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [bankTransferLast5, setBankTransferLast5] = useState("");
  const [linePayLast3, setLinePayLast3] = useState("");
  const [note, setNote] = useState("");

  const totalBeforeShipping = Math.max(0, totals.subtotal - totals.bundleDiscountAmount);
  const remainingForFreeShipping = freeShippingThreshold - totalBeforeShipping;
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [linePayQrOpen, setLinePayQrOpen] = useState(false);
  const [linePayConfirmOpen, setLinePayConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [freeShippingConfirmOpen, setFreeShippingConfirmOpen] = useState(false);
  // 按過一次「送出訂單」後才開始即時標示缺漏欄位，避免客人一打開結帳頁就滿版紅字
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  // 送出前檢查沒過時跳出的提示視窗；關閉後捲到該欄位
  const [alertError, setAlertError] = useState<OrderFormError | null>(null);

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

  const handlePaymentSelect = async (method: PaymentMethod) => {
    setPaymentMethod(method);
    setError(null);
    // 付款前再確認一次購物車與結帳設定（客人可能在結帳頁停留很久），避免依過期的金額或舊 QR Code 付款；
    // 有變動時 Storefront 會更新購物車並跳出提示，這裡就不開付款視窗。
    setVerifying(true);
    const ok = await onVerifyCheckout();
    setVerifying(false);
    if (!ok) return;
    if (method === "bank") {
      setBankModalOpen(true);
    } else {
      setLinePayQrOpen(true);
    }
  };

  const buildOrder = () => {
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
      note: note.trim() || undefined,
    };

    const payload: Omit<OrderPayload, "checkoutVersion"> = {
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
      note: extra.note,
    };

    return { extra, payload };
  };

  // 跟伺服器 createOrder 同一套規則（lib/order-validation.ts），送出前就先在畫面上擋下缺漏
  const formError = attemptedSubmit ? validateOrderForm(buildOrder().payload, customerFields, qualifiesForGroup) : null;
  const fieldClass = (key: string) =>
    `${shared.formField} ${formError?.field === key ? shared.formFieldInvalid : ""}`;
  const fieldError = (key: string) =>
    formError?.field === key ? <div className={shared.fieldError}>{formError.message}</div> : null;

  /** 送出前檢查：沒過就跳提示並回傳 false（呼叫端不打 API）。 */
  const checkBeforeSubmit = (): boolean => {
    setAttemptedSubmit(true);
    const invalid = validateOrderForm(buildOrder().payload, customerFields, qualifiesForGroup);
    if (invalid) {
      setFreeShippingConfirmOpen(false);
      setAlertError(invalid);
      return false;
    }
    return true;
  };

  // 關閉提示後捲到缺漏的欄位並聚焦，客人不用自己往上找
  const handleAlertClose = () => {
    const field = alertError?.field;
    setAlertError(null);
    if (!field) return;
    const el = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input:not([type=checkbox]), textarea, button")?.focus({ preventScroll: true });
  };

  const handleSubmitClick = () => {
    setError(null);
    if (!checkBeforeSubmit()) return;
    if (!totals.qualifiesForFreeShipping) {
      setFreeShippingConfirmOpen(true);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    setError(null);
    // 免運確認視窗的「確認送出」也會走到這裡，打 API 前再檢查一次
    if (!checkBeforeSubmit()) return;
    const { extra, payload } = buildOrder();

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
            <div className={shared.summarySubRow}>
              <span>商品小計</span>
              <span>{fmt(totals.subtotal)}</span>
            </div>
            {totals.bundleDiscountAmount > 0 && (
              <div className={shared.summarySubRow}>
                <span>{totals.bundleName ?? "組合折扣"}</span>
                <span>－{fmt(totals.bundleDiscountAmount)}</span>
              </div>
            )}
            <div className={shared.summarySubRow}>
              <span>運費</span>
              <span>{totals.shippingFee > 0 ? fmt(totals.shippingFee) : "免運"}</span>
            </div>
            <div className={shared.summaryTotal}>
              <span>總計</span>
              <span>{fmt(totals.total)}</span>
            </div>
          </div>

          <div className={shared.sectionTitle}>會員資訊</div>
          <div className={fieldClass("cf_name")} data-field="cf_name">
            <label>
              {nameField?.label ?? "姓名"} <span className={shared.requiredMark}>*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            {fieldError("cf_name")}
          </div>
          <div className={fieldClass("cf_phone")} data-field="cf_phone">
            <label>
              {phoneField?.label ?? "電話"} <span className={shared.requiredMark}>*</span>
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {fieldError("cf_phone")}
          </div>
          {qualifiesForGroup && lineIdField && (
            <div className={fieldClass("cf_lineId")} data-field="cf_lineId">
              <label>
                {lineIdField.label} <span className={shared.requiredMark}>*</span>
              </label>
              <input type="text" value={lineId} onChange={(e) => setLineId(e.target.value)} />
              {fieldError("cf_lineId")}
            </div>
          )}
          <div className={fieldClass("cf_email")} data-field="cf_email">
            <label>
              {emailField?.label ?? "電子郵件"} <span className={shared.requiredMark}>*</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldError("cf_email")}
          </div>
          {customFields.map((field) => (
            <div className={fieldClass(`cf_${field.id}`)} data-field={`cf_${field.id}`} key={field.id}>
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
              {fieldError(`cf_${field.id}`)}
            </div>
          ))}
          {birthdayField && (
            <div className={fieldClass("cf_birthday")} data-field="cf_birthday">
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
              {fieldError("cf_birthday")}
            </div>
          )}

          <div className={shared.sectionTitle}>收件資訊</div>
          <div className={fieldClass("shippingMethod")} data-field="shippingMethod">
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
            {fieldError("shippingMethod")}
          </div>

          {shippingMethod === "mail" && (
            <>
              {zipField && (
                <div className={fieldClass("cf_zip")} data-field="cf_zip">
                  <label>
                    {zipField.label} {zipField.required && <span className={shared.requiredMark}>*</span>}
                  </label>
                  <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} />
                  {fieldError("cf_zip")}
                </div>
              )}
              {addressField && (
                <div className={fieldClass("cf_address")} data-field="cf_address">
                  <label>
                    {addressField.label} {addressField.required && <span className={shared.requiredMark}>*</span>}
                  </label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
                  {fieldError("cf_address")}
                </div>
              )}
            </>
          )}
          {shippingMethod === "cvs" && (
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
              <div className={fieldClass("cvsStoreName")} data-field="cvsStoreName">
                <label>
                  門市名稱 <span className={shared.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="請輸入門市名稱（例如：台北中山門市）"
                  value={cvsStoreName}
                  onChange={(e) => setCvsStoreName(e.target.value)}
                />
                {fieldError("cvsStoreName")}
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
            <div className={fieldClass("custGiftName")} data-field="custGiftName">
              <label>
                收禮人姓名 <span className={shared.requiredMark}>*</span>
              </label>
              <input type="text" value={giftName} onChange={(e) => setGiftName(e.target.value)} />
              {fieldError("custGiftName")}
            </div>
          )}

          <div className={fieldClass("orderNote")} data-field="orderNote">
            <label>訂單備註（選填）</label>
            <textarea
              className={shared.textarea}
              rows={3}
              maxLength={ORDER_NOTE_MAX_LENGTH}
              placeholder="有任何需要告訴我們的事，例如希望的到貨時段、包裝需求等"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className={shared.charCount}>
              {note.length} / {ORDER_NOTE_MAX_LENGTH}
            </div>
            {fieldError("orderNote")}
          </div>

          <div className={shared.sectionTitle}>付款方式</div>
          <div className={fieldClass("paymentMethod")} data-field="paymentMethod">
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
                disabled={verifying}
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
                disabled={verifying}
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
            {fieldError("paymentMethod")}
          </div>

          {(error ?? formError?.message) && (
            <div style={{ color: "#e08a7a", fontSize: 13, marginTop: 14, textAlign: "center" }}>
              {error ?? `還有欄位未完成：${formError?.message}`}
            </div>
          )}

          <button type="button" className={shared.button} style={{ marginTop: 22 }} disabled={submitting} onClick={handleSubmitClick}>
            {submitting ? "送出中…" : "送出訂單"}
          </button>
        </div>
      </div>

      <ValidationAlertModal message={alertError?.message ?? null} onClose={handleAlertClose} />

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
