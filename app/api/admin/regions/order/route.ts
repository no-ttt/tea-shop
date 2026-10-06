import { NextRequest, NextResponse } from "next/server";
import { reorderRegions } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

// body: { items: [{ id, title }, ...] }，陣列順序即新的分區順序
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { items: { id: string; title: string }[] };
    await reorderRegions(body.items);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminError(err);
  }
}
