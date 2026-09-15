import { NextRequest, NextResponse } from "next/server";
import { getProductStatuses } from "@/lib/data";
import { createProductStatus } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function GET() {
  const statuses = await getProductStatuses();
  return NextResponse.json(statuses);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as import("@/lib/admin-data").ProductStatusInput;
    const status = await createProductStatus(body);
    return NextResponse.json(status, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
