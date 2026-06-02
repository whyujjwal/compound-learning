import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/login/callback"]);

function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

async function isValidJwt(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return looksLikeJwt(token);
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password && !process.env.JWT_SECRET) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  if (password && token === (await expectedToken(password))) {
    return NextResponse.next();
  }

  if (await isValidJwt(token)) {
    return NextResponse.next();
  }

  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest) {
  const login = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") {
    login.searchParams.set("next", request.nextUrl.pathname);
  }
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
