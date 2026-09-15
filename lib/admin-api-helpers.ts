import { NextResponse } from "next/server";
import { AdminValidationError } from "./admin-data";

export function handleAdminError(err: unknown): NextResponse {
  if (err instanceof AdminValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "伺服器發生錯誤" }, { status: 500 });
}
