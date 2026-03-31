import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image")
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/debts") || pathname === "/debts") {
    // #region agent log
    fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H3',location:'middleware.ts:auth',message:'Middleware auth state',data:{pathname,hasAuth:!!req.auth,hasUserId:!!req.auth?.user?.id},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/access" || pathname.startsWith("/access/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!req.auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (req.auth) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
