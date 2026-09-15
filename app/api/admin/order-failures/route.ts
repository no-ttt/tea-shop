import { NextResponse } from "next/server";
import { listOrderFailures } from "@/lib/admin-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;

  const result = await listOrderFailures({ page });
  return NextResponse.json(result);
}
