import { NextRequest, NextResponse } from "next/server";
import { updateSiteSettings } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateSiteSettings(body);
    return NextResponse.json(settings);
  } catch (err) {
    return handleAdminError(err);
  }
}
