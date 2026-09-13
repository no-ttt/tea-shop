import { NextResponse } from "next/server";
import { getRegions } from "@/lib/data";

export async function GET() {
  const regions = await getRegions();
  return NextResponse.json(regions);
}
