import { NextRequest, NextResponse } from "next/server";
import { createOrder, OrderValidationError } from "@/lib/data";
import type { OrderPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  let payload: OrderPayload;
  try {
    payload = (await request.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ error: "請求內容格式錯誤" }, { status: 400 });
  }

  try {
    const confirmation = await createOrder(payload);
    return NextResponse.json(confirmation);
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message, fieldId: err.fieldId }, { status: 400 });
    }
    throw err;
  }
}
