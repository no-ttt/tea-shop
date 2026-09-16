import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_ADMIN_PAGE_PATHS = ["/admin/login"];
const PUBLIC_ADMIN_API_PATHS = ["/api/admin/login", "/api/admin/logout"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isPublic = isApi
    ? PUBLIC_ADMIN_API_PATHS.some((p) => pathname === p)
    : PUBLIC_ADMIN_PAGE_PATHS.some((p) => pathname === p);

  if (isPublic) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authed = await verifySessionCookie(cookie);
  if (authed) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
