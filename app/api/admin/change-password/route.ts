import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setAdminPasswordOverrideHash } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { newPassword?: unknown } | null;
    const newPassword = body?.newPassword;
    if (typeof newPassword !== "string" || newPassword.trim().length < 8) {
      return NextResponse.json({ error: "密碼至少需要 8 個字元" }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword.trim());
    await setAdminPasswordOverrideHash(hashed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "伺服器發生錯誤" }, { status: 500 });
  }
}
