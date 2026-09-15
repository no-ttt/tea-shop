import { NextRequest, NextResponse } from "next/server";
import { updateRegion, deleteRegion } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<import("@/lib/admin-data").RegionInput>;
    const region = await updateRegion(id, body);
    return NextResponse.json(region);
  } catch (err) {
    return handleAdminError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteRegion(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminError(err);
  }
}
