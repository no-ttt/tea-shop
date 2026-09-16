import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, verifyAdminPassword, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
    const password = body?.password;
    if (typeof password !== "string" || password === "") {
      return NextResponse.json({ error: "請輸入密碼" }, { status: 400 });
    }

    const ok = await verifyAdminPassword(password);
    if (!ok) {
      return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
    }

    const cookieValue = await createSessionCookie();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "伺服器發生錯誤" }, { status: 500 });
  }
}
