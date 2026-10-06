"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Region,
  Product,
  ProductStatus,
  CustomerField,
  BundleDiscount,
  CartLine,
  CheckoutCheckResponse,
  OrderConfirmation,
  OrderErrorResponse,
  OrderPayload,
  ProductOptionSelection,
} from "@/lib/types";
import { optionLabel, optionPrice } from "@/lib/product-options";
import type { SiteSettings } from "@/lib/data";
import { calcOrderTotals } from "@/lib/pricing";
import type { PolicyKey } from "@/lib/policy-content";
import BackToTop from "./BackToTop";
import ScrollToCart from "./ScrollToCart";
import RegionBackground from "./RegionBackground";
import RegionTabs from "./RegionTabs";
import ProductList from "./ProductList";
import Cart from "./Cart";
import SiteFooter from "./SiteFooter";
import PolicyModal from "./PolicyModal";
import ImageLightbox from "./ImageLightbox";
import ValidationAlertModal from "./ValidationAlertModal";
import CheckoutChangesModal from "./CheckoutChangesModal";
import CheckoutOverlay, { type CheckoutSubmitExtra } from "./CheckoutOverlay";
import OrderCompleteOverlay from "./OrderCompleteOverlay";
import styles from "./Storefront.module.css";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export default function Storefront({
  regions,
  products,
  statuses,
  customerFields,
  bundleDiscounts,
  siteSettings,
  checkoutVersion,
}: {
  regions: Region[];
  products: Product[];
  statuses: ProductStatus[];
  customerFields: CustomerField[];
  bundleDiscounts: BundleDiscount[];
  siteSettings: SiteSettings;
  /** 首頁載入時的結帳設定指紋，檢查/送單時帶回伺服器比對（見 lib/data.ts#computeCheckoutVersion） */
  checkoutVersion: string;
}) {
  const router = useRouter();
  const [currentRegionId, setCurrentRegionId] = useState(regions[0]?.id ?? "");
  const [selectedWeights, setSelectedWeights] = useState<Record<string, ProductOptionSelection>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [policyKey, setPolicyKey] = useState<PolicyKey | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutInstance, setCheckoutInstance] = useState(0);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [orderExtra, setOrderExtra] = useState<CheckoutSubmitExtra | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [checkoutChangesMessage, setCheckoutChangesMessage] = useState<string | null>(null);
  // 客人最後一次「被告知」的運費設定。加入商品時運費變動不提示、但 router.refresh() 會悄悄把
  // siteSettings 換成新的，所以按結帳時要拿這個（而不是 props）比對，才能確保運費變動一定會提示到。
  const [acknowledgedShipping, setAcknowledgedShipping] = useState(siteSettings.shipping);

  const currentRegion = regions.find((r) => r.id === currentRegionId) ?? regions[0];
  const regionTitleMap = useMemo(() => new Map(regions.map((r) => [r.id, r.title])), [regions]);
  const totals = useMemo(
    () =>
      calcOrderTotals(
        cart,
        bundleDiscounts,
        siteSettings.shipping.freeThreshold,
        siteSettings.shipping.fee,
      ),
    [cart, bundleDiscounts, siteSettings.shipping.freeThreshold, siteSettings.shipping.fee],
  );
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const anyOverlayOpen =
    checkoutOpen ||
    !!orderConfirmation ||
    !!policyKey ||
    !!validationMessage ||
    !!checkoutChangesMessage ||
    !!lightbox;

  useEffect(() => {
    if (!anyOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [anyOverlayOpen]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  };

  const handleSelectWeight = (productId: string, weight: ProductOptionSelection) => {
    setSelectedWeights((prev) => ({ ...prev, [productId]: weight }));
  };

  /** 向伺服器確認購物車與結帳設定；檢查本身失敗（網路/伺服器錯誤）回傳 null，呼叫端不擋客人——送單時伺服器仍會再驗一次。 */
  const requestCheckoutCheck = async (lines: CartLine[]): Promise<CheckoutCheckResponse | null> => {
    try {
      const res = await fetch("/api/checkout/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: lines, checkoutVersion }),
      });
      return res.ok ? ((await res.json()) as CheckoutCheckResponse) : null;
    } catch {
      return null;
    }
  };

  const hasCheckoutChanges = (check: CheckoutCheckResponse) =>
    check.issues.length > 0 ||
    Object.values(check.changed).some(Boolean) ||
    check.shipping.freeThreshold !== acknowledgedShipping.freeThreshold ||
    check.shipping.fee !== acknowledgedShipping.fee;

  /**
   * 依伺服器的檢查結果更新購物車（移除無法購買的品項、改成新價格），並用 router.refresh()
   * 重新抓商品列表與結帳設定（會保留 cart 等 client state；checkoutVersion 也會跟著更新）。
   * 回傳要給客人看的提示；沒有需要告知客人的影響時 message 為 null。
   *
   * stage：
   * - browsing：加入購物車。只提示商品與組合折扣；運費/免運門檻的變動留到按結帳時再說。
   * - checkoutStart：按「結帳」。提示商品、折扣、運費，讓客人選擇繼續加購或直接結帳。
   * - payment／submit：選付款方式、送出訂單被擋下。另外提示填寫欄位與 LINE Pay QR Code 的變動。
   * 組合折扣/運費的變動，是拿「修正後的購物車 + 客人看過的舊設定」算出的金額和伺服器的金額比，
   * 這樣才不會把「商品改價連帶影響折扣」或「剛加入的商品讓購物車符合折扣」誤報成設定變動。
   */
  const applyCheckoutChanges = (
    check: CheckoutCheckResponse,
    baseCart: CartLine[],
    stage: "browsing" | "checkoutStart" | "payment" | "submit",
    options: { addedKey?: string; paid?: boolean } = {},
  ): { message: string | null; cartEmpty: boolean } => {
    const issueByKey = new Map(check.issues.map((issue) => [issue.key, issue]));
    const next = baseCart.flatMap((line) => {
      const issue = issueByKey.get(line.key);
      if (!issue) return [line];
      if (issue.kind === "unavailable") return [];
      return [{ ...line, price: issue.newPrice }];
    });
    const removedProductIds = baseCart
      .filter((line) => !next.some((l) => l.productId === line.productId))
      .map((line) => line.productId);
    setCart(next);
    if (removedProductIds.length > 0) {
      setSelectedWeights((weights) =>
        Object.fromEntries(Object.entries(weights).filter(([productId]) => !removedProductIds.includes(productId))),
      );
    }
    if (next.length === 0 && stage !== "browsing") setCheckoutOpen(false);
    router.refresh();

    const lines = check.issues.map((issue) => {
      const isAdded = issue.key === options.addedKey;
      return issue.kind === "unavailable"
        ? `・${issue.name}（${issue.detail}）${issue.reason}，${isAdded ? "無法加入購物車" : "已從購物車移除"}`
        : `・${issue.name}（${issue.detail}）價格已由 ${fmt(issue.oldPrice)} 調整為 ${fmt(issue.newPrice)}${isAdded ? "，已依新價格加入購物車" : ""}`;
    });

    const oldShipping = acknowledgedShipping;
    if (next.length > 0) {
      const expected = calcOrderTotals(next, bundleDiscounts, oldShipping.freeThreshold, oldShipping.fee);
      const actual = check.totals;
      if (expected.bundleDiscountAmount !== actual.bundleDiscountAmount) {
        lines.push(
          expected.bundleDiscountAmount === 0
            ? `・購物車現在符合組合折扣「${actual.bundleName}」，可折抵 ${fmt(actual.bundleDiscountAmount)}`
            : actual.bundleDiscountAmount === 0
              ? `・組合折扣「${expected.bundleName}」已不適用，原本折抵的 ${fmt(expected.bundleDiscountAmount)} 已取消`
              : `・組合折扣折抵金額已由 ${fmt(expected.bundleDiscountAmount)} 調整為 ${fmt(actual.bundleDiscountAmount)}`,
        );
      }
      if (stage !== "browsing") {
        const fee = (n: number) => (n === 0 ? "免運" : fmt(n));
        const remaining = check.shipping.freeThreshold - (actual.subtotal - actual.bundleDiscountAmount);
        const thresholdChanged = oldShipping.freeThreshold !== check.shipping.freeThreshold;
        if (expected.shippingFee !== actual.shippingFee) {
          lines.push(
            `・運費已由 ${fee(expected.shippingFee)} 調整為 ${fee(actual.shippingFee)}` +
              (actual.shippingFee > 0 ? `\n滿 ${fmt(check.shipping.freeThreshold)} 免運，還差 ${fmt(remaining)}` : ""),
          );
        } else if (thresholdChanged && actual.shippingFee > 0) {
          lines.push(
            `・免運門檻已由 ${fmt(oldShipping.freeThreshold)} 調整為 ${fmt(check.shipping.freeThreshold)}\n還差 ${fmt(remaining)} 即可免運`,
          );
        }
      }
    }
    if (stage !== "browsing") setAcknowledgedShipping(check.shipping);

    if (stage === "payment" || stage === "submit") {
      if (check.changed.customerFields) lines.push("・結帳填寫欄位已更新，請確認是否有需要補填的欄位");
      if (check.changed.linePayQr) lines.push("・LINE Pay 付款 QR Code 已更新，請使用新的 QR Code 付款");
    }
    if (stage !== "browsing" && next.length > 0) {
      const oldTotal = calcOrderTotals(baseCart, bundleDiscounts, oldShipping.freeThreshold, oldShipping.fee).total;
      if (check.totals.total !== oldTotal) {
        lines.push("", `結帳總金額（含運）由 ${fmt(oldTotal)} 變為 ${fmt(check.totals.total)}`);
      }
    }

    if (lines.length === 0) {
      // 送單被擋下一定要給說明；其他階段沒有需要告知的影響就不打擾。
      return {
        message: stage === "submit" ? "結帳相關設定已更新（不影響您的金額），請再按一次「送出訂單」。" : null,
        cartEmpty: next.length === 0,
      };
    }

    const footer =
      next.length === 0
        ? "購物車已清空，請重新選購。"
        : stage === "browsing"
          ? null
          : stage === "checkoutStart"
            ? "要繼續加購，還是直接前往結帳？"
            : stage === "submit" && options.paid
              ? "請確認新的金額與結帳資訊後再送出訂單；若您已依原金額完成付款，請聯繫店家處理差額或退款。"
              : "請確認新的金額與結帳資訊後再繼續。";
    const header = stage === "browsing" ? "商品資訊已更新：" : "商品或結帳資訊已更新：";
    return {
      message: [header, ...lines, ...(footer ? ["", footer] : [])].join("\n"),
      cartEmpty: next.length === 0,
    };
  };

  /**
   * 加入前先向伺服器確認（客人可能開著舊頁面）：已售完就不加入、價格有調整就用新價格加入，並提示客人；
   * 同時帶上整個購物車，順便把購物車裡其他品項/折扣/運費的變動一起告知。檢查本身失敗時照常加入。
   */
  const handleAddToCart = async (productId: string) => {
    const product = productMap.get(productId);
    const weight = selectedWeights[productId];
    if (!product || !weight || addingProductId) return;
    const price = optionPrice(product, weight);
    if (price === null) return;

    const line: CartLine = {
      key: `${productId}-${weight}-${Date.now()}`,
      productId,
      name: product.name.replace(/\n/g, " "),
      detail: `${regionTitleMap.get(product.region) ?? product.region}／${optionLabel(product, weight)}`,
      price,
      ...(weight === "custom" ? { custom: true } : { weight }),
    };
    const withLine = [...cart, line];

    setAddingProductId(productId);
    const check = await requestCheckoutCheck(withLine);
    setAddingProductId(null);

    if (!check || !hasCheckoutChanges(check)) {
      setCart(withLine);
      showToast("已儲存品項");
      return;
    }
    const { message } = applyCheckoutChanges(check, withLine, "browsing", { addedKey: line.key });
    if (message) setValidationMessage(message);
    else showToast("已儲存品項");
  };

  const handleRemoveFromCart = (key: string) => {
    setCart((prev) => {
      const removed = prev.find((l) => l.key === key);
      const next = prev.filter((l) => l.key !== key);
      if (removed && !next.some((l) => l.productId === removed.productId)) {
        setSelectedWeights((weights) => {
          const rest = { ...weights };
          delete rest[removed.productId];
          return rest;
        });
      }
      return next;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedWeights({});
  };

  const openCheckout = () => {
    setCheckoutInstance((n) => n + 1);
    setCheckoutOpen(true);
  };

  /**
   * 按「結帳」：先確認購物車與結帳設定。有變動時跳出對話框列出變動，讓客人選繼續加購或直接結帳；
   * 購物車因此被清空時只顯示提示。檢查本身失敗時照常進入結帳（送單時伺服器仍會再驗一次）。
   */
  const handleCheckoutClick = async () => {
    const check = await requestCheckoutCheck(cart);
    if (!check || !hasCheckoutChanges(check)) {
      openCheckout();
      return;
    }
    const { message, cartEmpty } = applyCheckoutChanges(check, cart, "checkoutStart");
    if (!message) openCheckout();
    else if (cartEmpty) setValidationMessage(message);
    else setCheckoutChangesMessage(message);
  };

  /** 選付款方式前的確認。回傳 true 代表可以繼續付款；有變動時會更新購物車、跳出提示並回傳 false。 */
  const verifyBeforePayment = async (): Promise<boolean> => {
    const check = await requestCheckoutCheck(cart);
    if (!check || !hasCheckoutChanges(check)) return true;
    const { message } = applyCheckoutChanges(check, cart, "payment");
    if (!message) return true;
    setValidationMessage(message);
    return false;
  };

  const handleSubmitOrder = async (
    formPayload: Omit<OrderPayload, "checkoutVersion">,
    extra: CheckoutSubmitExtra,
  ): Promise<{ ok: true; confirmation: OrderConfirmation } | { ok: false; error: string }> => {
    const payload: OrderPayload = { ...formPayload, checkoutVersion };
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      try {
        const body = (await res.json()) as OrderErrorResponse;
        if (res.status === 409 && body.checkout) {
          setValidationMessage(
            applyCheckoutChanges(body.checkout, cart, "submit", {
              paid: !!(payload.bankTransferLast5 || payload.linePayLast3),
            }).message,
          );
        }
        return { ok: false, error: body.error };
      } catch {
        // 伺服器回傳非 JSON 內容（例如上游 502），無法解析錯誤細節，退回通用訊息。
        return { ok: false, error: "訂單建立失敗，請稍後再試" };
      }
    }

    const confirmation = (await res.json()) as OrderConfirmation;
    setOrderConfirmation(confirmation);
    setOrderExtra(extra);
    setCheckoutOpen(false);
    setCart([]);
    setSelectedWeights({});
    return { ok: true, confirmation };
  };

  if (!currentRegion) return null;

  return (
    <>
      <RegionBackground region={currentRegion} />

      <div className={styles.brand}>
        {/* 使用者可透過後台輸入任意外部圖片網址（不限定網域），故用原生 img 跳過
            Next.js Image Optimizer 的網域白名單限制，避免未知網域直接讓頁面崩潰。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siteSettings.branding.logoImage} alt="棋願製造" width={120} height={120} />
      </div>

      <h1 className={styles.h1}>{currentRegion.title}</h1>
      <div className={styles.subtitle}>{currentRegion.subtitle}</div>
      {currentRegion.description && <p className={styles.regionDescription}>{currentRegion.description}</p>}
      {currentRegion.note && <div className={styles.comboNote}>{currentRegion.note}</div>}

      {/* 內容與字級由後台「其他設定 → 會員資格說明」編輯；清空則不顯示 */}
      {siteSettings.content.memberNote && <div className={styles.memberNote}>{siteSettings.content.memberNote}</div>}

      <div className={styles.layout}>
        <div className={styles.card}>
          <RegionTabs regions={regions} currentRegion={currentRegionId} onSelect={setCurrentRegionId} />
          <ProductList
            products={products}
            currentRegion={currentRegionId}
            statuses={statuses}
            selectedWeights={selectedWeights}
            weightOptions={siteSettings.weightOptions}
            onSelectWeight={handleSelectWeight}
            onAddToCart={handleAddToCart}
            addingProductId={addingProductId}
            onOpenLightbox={(images, index) => setLightbox({ images, index })}
          />
        </div>

        <div className={styles.cartCard} id="cart-section">
          <Cart
            cart={cart}
            totals={totals}
            freeShippingThreshold={siteSettings.shipping.freeThreshold}
            shippingFee={siteSettings.shipping.fee}
            onRemove={handleRemoveFromCart}
            onClear={handleClearCart}
            onCheckout={handleCheckoutClick}
          />
        </div>
      </div>

      <SiteFooter onOpenPolicy={setPolicyKey} />

      <BackToTop />
      <ScrollToCart />

      <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`}>{toast}</div>

      <CheckoutOverlay
        key={checkoutInstance}
        open={checkoutOpen}
        cart={cart}
        totals={totals}
        customerFields={customerFields}
        freeShippingThreshold={siteSettings.shipping.freeThreshold}
        linePayQrImage={siteSettings.branding.linePayQrImage}
        onClose={() => setCheckoutOpen(false)}
        onVerifyCheckout={verifyBeforePayment}
        onSubmit={handleSubmitOrder}
      />

      <OrderCompleteOverlay
        confirmation={orderConfirmation}
        extra={orderExtra}
        onBackToShop={() => {
          setOrderConfirmation(null);
          setOrderExtra(null);
        }}
      />

      <PolicyModal policyKey={policyKey} onClose={() => setPolicyKey(null)} />
      {lightbox && (
        <ImageLightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
      <ValidationAlertModal message={validationMessage} onClose={() => setValidationMessage(null)} />
      <CheckoutChangesModal
        message={checkoutChangesMessage}
        onCheckout={() => {
          setCheckoutChangesMessage(null);
          openCheckout();
        }}
        onContinueShopping={() => setCheckoutChangesMessage(null)}
      />
    </>
  );
}
