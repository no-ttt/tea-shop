import { NextResponse } from "next/server";
import { getProductStatuses } from "@/lib/data";

export async function GET() {
  const statuses = await getProductStatuses();
  return NextResponse.json(statuses);
}
