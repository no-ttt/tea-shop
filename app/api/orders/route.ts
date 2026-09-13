import { NextRequest, NextResponse } from "next/server";
import { createOrder, OrderValidationError } from "@/lib/data";
import type { OrderPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as OrderPayload;

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
