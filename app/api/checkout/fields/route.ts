import { NextResponse } from "next/server";
import { getCustomerFields } from "@/lib/data";

export async function GET() {
  const fields = await getCustomerFields();
  return NextResponse.json(fields);
}
