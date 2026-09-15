import { NextRequest, NextResponse } from "next/server";
import { updateCustomerField, deleteCustomerField } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<import("@/lib/admin-data").CustomerFieldInput>;
    const field = await updateCustomerField(id, body);
    return NextResponse.json(field);
  } catch (err) {
    return handleAdminError(err);
  }
}

/** 停用（軟刪除），非真正 DELETE：外鍵約束會擋下已被歷史訂單引用的欄位。 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteCustomerField(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAdminError(err);
  }
}
