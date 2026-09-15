import { NextRequest, NextResponse } from "next/server";
import { updateProductStatus, deleteProductStatus } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<import("@/lib/admin-data").ProductStatusInput>;
    const status = await updateProductStatus(id, body);
    return NextResponse.json(status);
  } catch (err) {
    return handleAdminError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteProductStatus(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminError(err);
  }
}
