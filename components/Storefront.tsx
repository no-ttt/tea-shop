"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type {
  Region,
  Product,
  ProductStatus,
  CustomerField,
  BundleDiscount,
  CartLine,
  OrderConfirmation,
  OrderPayload,
} from "@/lib/types";
import { LOGO_IMAGE } from "@/lib/mock-data";
import { calcOrderTotals } from "@/lib/pricing";
import type { PolicyKey } from "@/lib/policy-content";
import RegionBackground from "./RegionBackground";
import RegionTabs from "./RegionTabs";
import ProductList from "./ProductList";
import Cart from "./Cart";
import SiteFooter from "./SiteFooter";
import PolicyModal from "./PolicyModal";
import ImageLightbox from "./ImageLightbox";
import ValidationAlertModal from "./ValidationAlertModal";
import CheckoutOverlay, { type CheckoutSubmitExtra } from "./CheckoutOverlay";
import OrderCompleteOverlay from "./OrderCompleteOverlay";
import styles from "./Storefront.module.css";

export default function Storefront({
  regions,
  products,
  statuses,
  customerFields,
  bundleDiscounts,
}: {
  regions: Region[];
  products: Product[];
  statuses: ProductStatus[];
  customerFields: CustomerField[];
  bundleDiscounts: BundleDiscount[];
}) {
  const [currentRegionId, setCurrentRegionId] = useState(regions[0]?.id ?? "");
  const [selectedWeights, setSelectedWeights] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [policyKey, setPolicyKey] = useState<PolicyKey | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutInstance, setCheckoutInstance] = useState(0);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [orderExtra, setOrderExtra] = useState<CheckoutSubmitExtra | null>(null);

  const currentRegion = regions.find((r) => r.id === currentRegionId) ?? regions[0];
  const totals = useMemo(() => calcOrderTotals(cart, bundleDiscounts), [cart, bundleDiscounts]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const anyOverlayOpen =
    checkoutOpen || !!orderConfirmation || !!policyKey || !!validationMessage || !!lightboxSrc;

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

  const handleSelectWeight = (productId: string, weight: number) => {
    setSelectedWeights((prev) => ({ ...prev, [productId]: weight }));
  };

  const handleAddToCart = (productId: string) => {
    const product = productMap.get(productId);
    const weight = selectedWeights[productId];
    if (!product || !weight || !product.prices) return;

    const price = product.prices[String(weight) as "30" | "80" | "150"];
    const line: CartLine = {
      key: `${productId}-${weight}-${Date.now()}`,
      productId,
      name: product.name.replace(/\n/g, " "),
      detail: `${product.region}／${weight}g`,
      price,
    };
    setCart((prev) => [...prev, line]);
    showToast("已儲存品項");
  };

  const handleRemoveFromCart = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmitOrder = async (
    payload: OrderPayload,
    extra: CheckoutSubmitExtra,
  ): Promise<{ ok: true; confirmation: OrderConfirmation } | { ok: false; error: string }> => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = (await res.json()) as { error: string };
      return { ok: false, error: body.error };
    }

    const confirmation = (await res.json()) as OrderConfirmation;
    setOrderConfirmation(confirmation);
    setOrderExtra(extra);
    setCheckoutOpen(false);
    setCart([]);
    return { ok: true, confirmation };
  };

  if (!currentRegion) return null;

  return (
    <>
      <RegionBackground region={currentRegion} />

      <div className={styles.brand}>
        <Image src={LOGO_IMAGE} alt="棋願製造" width={120} height={120} />
      </div>

      <h1 className={styles.h1}>{currentRegion.title}</h1>
      <div className={styles.subtitle}>{currentRegion.subtitle}</div>
      {currentRegion.note && <div className={styles.comboNote}>{currentRegion.note}</div>}

      <div className={styles.memberNote}>
        經典會員（Member）無購買數量限制；欲加入 VIP 會員，初次入會需購買「2 斤」茶款（不限茶）。
        <br />
        非 VIP 會員，價目表傳出後，有效期以傳出日計算，三日內有效。
      </div>

      <div className={styles.layout}>
        <div className={styles.card}>
          <RegionTabs regions={regions} currentRegion={currentRegionId} onSelect={setCurrentRegionId} />
          <ProductList
            products={products}
            currentRegion={currentRegionId}
            statuses={statuses}
            selectedWeights={selectedWeights}
            onSelectWeight={handleSelectWeight}
            onAddToCart={handleAddToCart}
            onOpenLightbox={setLightboxSrc}
          />
        </div>

        <div className={styles.cartCard}>
          <Cart
            cart={cart}
            totals={totals}
            onRemove={handleRemoveFromCart}
            onClear={handleClearCart}
            onCheckout={() => {
              setCheckoutInstance((n) => n + 1);
              setCheckoutOpen(true);
            }}
          />
        </div>
      </div>

      <SiteFooter onOpenPolicy={setPolicyKey} />

      <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`}>{toast}</div>

      <CheckoutOverlay
        key={checkoutInstance}
        open={checkoutOpen}
        cart={cart}
        totals={totals}
        customerFields={customerFields}
        onClose={() => setCheckoutOpen(false)}
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
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <ValidationAlertModal message={validationMessage} onClose={() => setValidationMessage(null)} />
    </>
  );
}
