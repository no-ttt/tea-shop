import { NextRequest, NextResponse } from "next/server";
import { createCustomerField, getAllCustomerFields } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function GET() {
  const fields = await getAllCustomerFields();
  return NextResponse.json(fields);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as import("@/lib/admin-data").CustomerFieldInput;
    const field = await createCustomerField(body);
    return NextResponse.json(field, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
