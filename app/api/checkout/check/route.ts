import { NextRequest, NextResponse } from "next/server";
import { checkCheckout } from "@/lib/data";
import type { CartLine } from "@/lib/types";

/**
 * 結帳前的預先檢查（開啟結帳頁、選擇付款方式時呼叫），讓客人在付款前就知道
 * 商品已售完/改價，或結帳設定（折扣、運費、顧客欄位、LINE Pay QR Code）已變動。
 * 真正的把關仍在 POST /api/orders 裡再做一次。
 */
export async function POST(request: NextRequest) {
  let cart: CartLine[];
  let checkoutVersion: string;
  try {
    const body = (await request.json()) as { cart?: unknown; checkoutVersion?: unknown };
    if (
      typeof body.checkoutVersion !== "string" ||
      !Array.isArray(body.cart) ||
      !body.cart.every(
        (item: Partial<CartLine>) =>
          typeof item?.key === "string" &&
          typeof item.productId === "string" &&
          typeof item.name === "string" &&
          typeof item.detail === "string" &&
          typeof item.price === "number",
      )
    ) {
      return NextResponse.json({ error: "購物車資料格式錯誤" }, { status: 400 });
    }
    cart = body.cart as CartLine[];
    checkoutVersion = body.checkoutVersion;
  } catch {
    return NextResponse.json({ error: "請求內容格式錯誤" }, { status: 400 });
  }

  return NextResponse.json(await checkCheckout(cart, checkoutVersion));
}
