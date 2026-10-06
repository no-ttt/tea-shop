import { NextRequest, NextResponse } from "next/server";
import { reorderProducts } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

// body: { region, ids: [...] }，ids 的陣列順序即該分區新的商品順序
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { region: string; ids: string[] };
    await reorderProducts(body.region, body.ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminError(err);
  }
}
