import { NextResponse } from "next/server";
import { listOrders } from "@/lib/admin-data";
import { ORDER_STATUSES } from "@/lib/types";
import type { OrderStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const statusParam = searchParams.get("status");
  const status = ORDER_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;

  const result = await listOrders({ page, status });
  return NextResponse.json(result);
}
