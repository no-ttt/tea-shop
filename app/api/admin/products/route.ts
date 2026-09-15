import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import { createProduct } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") ?? undefined;
  const products = await getProducts(region);
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as import("@/lib/admin-data").ProductInput;
    const product = await createProduct(body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
