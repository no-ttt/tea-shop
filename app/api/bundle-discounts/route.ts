import { NextResponse } from "next/server";
import { getBundleDiscounts } from "@/lib/data";

export async function GET() {
  const bundleDiscounts = await getBundleDiscounts();
  return NextResponse.json(bundleDiscounts);
}
