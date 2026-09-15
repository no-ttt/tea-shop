import { NextRequest, NextResponse } from "next/server";
import { updateBundleDiscount, deleteBundleDiscount } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<import("@/lib/admin-data").BundleDiscountInput>;
    const bundle = await updateBundleDiscount(id, body);
    return NextResponse.json(bundle);
  } catch (err) {
    return handleAdminError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteBundleDiscount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminError(err);
  }
}
