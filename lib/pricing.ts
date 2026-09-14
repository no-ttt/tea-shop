import type { BundleDiscount, CartLine, OrderTotals } from "./types";

export function calcSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.price, 0);
}

interface BundleMatch {
  amount: number;
  name: string;
}

/**
 * 購物車必須同時包含某組合折扣指定的每個商品各一件才套用；
 * 若同時符合多組，只套用折扣金額最高的那一組（不疊加）。
 */
export function calcBundleDiscount(cart: CartLine[], bundles: BundleDiscount[]): BundleMatch {
  const cartProductIds = new Set(cart.map((line) => line.productId));
  const subtotal = calcSubtotal(cart);

  let best: BundleMatch = { amount: 0, name: "" };

  for (const bundle of bundles) {
    if (bundle.productIds.length === 0) continue;
    const qualifies = bundle.productIds.every((id) => cartProductIds.has(id));
    if (!qualifies) continue;

    const amount =
      bundle.discountType === "percent"
        ? Math.round((subtotal * bundle.discountValue) / 100)
        : bundle.discountValue;

    if (amount > best.amount) {
      best = { amount, name: bundle.name };
    }
  }

  return best;
}

export function qualifiesForFreeShipping(total: number, threshold: number): boolean {
  return total >= threshold;
}

export function calcShippingFee(total: number, threshold: number, fee: number): number {
  return qualifiesForFreeShipping(total, threshold) ? 0 : fee;
}

export function calcOrderTotals(
  cart: CartLine[],
  bundles: BundleDiscount[],
  threshold: number,
  fee: number,
): OrderTotals {
  const subtotal = calcSubtotal(cart);
  const bundle = calcBundleDiscount(cart, bundles);
  const afterDiscount = Math.max(0, subtotal - bundle.amount);
  const shippingFee = calcShippingFee(afterDiscount, threshold, fee);
  const qualifies = qualifiesForFreeShipping(afterDiscount, threshold);

  return {
    subtotal,
    bundleDiscountAmount: bundle.amount,
    bundleName: bundle.amount > 0 ? bundle.name : null,
    shippingFee,
    qualifiesForFreeShipping: qualifies,
    total: afterDiscount + shippingFee,
  };
}
