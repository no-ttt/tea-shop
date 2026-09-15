import { NextRequest, NextResponse } from "next/server";
import { getBundleDiscounts } from "@/lib/data";
import { createBundleDiscount } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function GET() {
  const bundleDiscounts = await getBundleDiscounts();
  return NextResponse.json(bundleDiscounts);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as import("@/lib/admin-data").BundleDiscountInput;
    const bundle = await createBundleDiscount(body);
    return NextResponse.json(bundle, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
