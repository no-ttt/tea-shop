import { NextRequest, NextResponse } from "next/server";
import { addProductImage, getProductImagesWithId } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const images = await getProductImagesWithId(id);
    return NextResponse.json({ images });
  } catch (err) {
    return handleAdminError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { url: string };
    const images = await addProductImage(id, body.url);
    return NextResponse.json({ images }, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
