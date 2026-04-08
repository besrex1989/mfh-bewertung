import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse }           from "next/server";
import type { NextRequest }       from "next/server";
import type { Database }          from "@/types/database";

const PROTECTED = ["/dashboard", "/new", "/valuation"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req: request, res: response });

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (session && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new/:path*",
    "/valuation/:path*",
    "/auth/login",
    "/auth/register",
  ],
};
