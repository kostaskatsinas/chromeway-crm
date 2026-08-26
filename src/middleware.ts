import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/public", "/public-quote", "/api/auth", "/api/public", "/api/cron", "/api/health"];

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return new TextEncoder().encode(value || "insecure-local-development-secret");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Language cookie default
  let langCookie = req.cookies.get("cw_lang")?.value;
  if (!langCookie) {
    langCookie = "el";
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    const res = NextResponse.next();
    if (!req.cookies.get("cw_lang")) res.cookies.set("cw_lang", langCookie, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  const token = req.cookies.get("cw_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (!req.cookies.get("cw_lang")) res.cookies.set("cw_lang", langCookie, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|.*\\.png$|.*\\.svg$).*)"],
};
