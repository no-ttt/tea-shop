# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js rewrite of the consumer-facing storefront and checkout flow from `../index.html` (a self-contained static HTML tea e-commerce site — see `../CLAUDE.md` for that file's structure). This rewrite covers browsing → cart → checkout only; the original's password-protected admin CMS and real Formspree/Google Sheets/LINE Pay integrations are deliberately not ported. See `TODO.md` for what's deferred and why, and `ORIGINAL_INTEGRATIONS.md` for exactly how the original site's order-notification flow worked (useful if/when those integrations get built here).

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit` — type-check only (`strict: true`)

No test runner is configured yet (see `TODO.md` item 6).

## Architecture

**Data flow — everything goes through the API routes, including the homepage.** `app/page.tsx` is a Server Component that fetches its own `/api/regions`, `/api/products`, `/api/statuses`, `/api/checkout/fields`, and `/api/bundle-discounts` routes (via an absolute URL built from request headers, `cache: "no-store"`) rather than calling the data layer directly. This is intentional: it means `lib/data.ts` has exactly one caller path (`app/api/**/route.ts`), so migrating off mock data later only requires editing that one file.

- **`lib/data.ts`** — the sole data-access layer. `getRegions()` / `getProducts(region?)` / `getProductStatuses()` / `getCustomerFields()` / `getBundleDiscounts()` / `createOrder(payload)`. Currently these just read/filter the arrays in `lib/mock-data.ts`; when a real database arrives, only this file's internals change — call signatures and return types should stay the same so `app/api/**/route.ts` doesn't need to change.
- **`lib/mock-data.ts`** — the mock dataset itself (7 regions, 60 products, statuses, customer fields, bundle discounts), extracted verbatim from `../index.html`'s embedded JS constants. Note: most products have empty `images: []` (only 3 of 60 ever had photos in the original site) and 9 sold-out products have `prices: null` — both are real gaps in the source data, not extraction bugs.
- **`lib/pricing.ts`** — all money math (`calcSubtotal`, `calcBundleDiscount`, `calcShippingFee`, `calcOrderTotals`). Bundle discount rule: cart must contain at least one unit of every product ID listed in a bundle; if multiple bundles qualify, only the single highest-discount one applies (no stacking). Free shipping threshold is NT$3,000 (`FREE_SHIPPING_THRESHOLD` in `lib/mock-data.ts`), flat fee otherwise (`SHIPPING_FEE`).
- **`components/Storefront.tsx`** — the only client component holding real app state (`"use client"`; cart, selected weights, current region, checkout/lightbox/policy modal open-state). Everything under it is presentational, threaded via props/callbacks — no Context, no global store.
- **`components/CheckoutOverlay.tsx`** — remounted via a `key` (`checkoutInstance` counter in `Storefront.tsx`) each time it's opened, instead of resetting its internal form state in a `useEffect` (that pattern trips the `react-hooks/set-state-in-effect` ESLint rule and is the idiomatic React fix — don't reintroduce the effect-based reset).
- **Cart total display excludes shipping.** `Cart.tsx` shows `subtotal − bundleDiscount` as "總計"; the shipping fee only appears in the shipping-notice text and gets added into the total at checkout (`totals.total` from `calcOrderTotals`, used in `CheckoutOverlay`/`OrderCompleteOverlay`). This matches `../index.html`'s `renderCart()` exactly — don't "fix" the cart display to include shipping, that would be a regression, not a bug fix.
- **`POST /api/orders`** (`app/api/orders/route.ts` → `lib/data.ts#createOrder`) — validates the full order (empty cart, per-field required/format checks — `lineId` is only required once the cart qualifies for free shipping, mirroring the original's conditional-visibility rule — CVS store name, gift recipient name, payment confirmation code) with error messages copied verbatim from the original site's `submitOrder()`, then returns a mocked `OrderConfirmation` with `status: "pending_payment"`. It does **not** call Formspree, Google Sheets, or any payment provider — see `ORIGINAL_INTEGRATIONS.md`.
- **Images** live under `public/images/` (`regions/`, `products/`), decoded from the base64 embedded in the original `index.html`; region background filenames were transliterated to ASCII (`fengtu-fajiao`, `zoushui-tanbei`) since CJK filenames aren't reliably URL-safe.
- **RWD breakpoints are `<480px` / `480–800px` / `≥800px`**, intentionally redesigned rather than copied from the original (which only had two inconsistent breakpoints at 760px and 800px for background-image and layout respectively — a real gap, not a stylistic choice). Desktop (`≥800px`) uses a two-column layout with a `position: sticky` cart.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
