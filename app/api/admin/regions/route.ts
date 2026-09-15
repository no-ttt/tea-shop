import { NextRequest, NextResponse } from "next/server";
import { getRegions } from "@/lib/data";
import { createRegion } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function GET() {
  const regions = await getRegions();
  return NextResponse.json(regions);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as import("@/lib/admin-data").RegionInput;
    const region = await createRegion(body);
    return NextResponse.json(region, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
