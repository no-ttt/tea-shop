import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status: OrderStatus };
    const order = await updateOrderStatus(id, body.status);
    return NextResponse.json(order);
  } catch (err) {
    return handleAdminError(err);
  }
}
