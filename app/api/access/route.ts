import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_CODE,
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_VALUE,
} from "@/lib/access-config";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
  } | null;
  const code = String(body?.code ?? "").trim();

  if (code !== ACCESS_CODE) {
    return NextResponse.json(
      { ok: false, error: "Invalid access code" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE_NAME, ACCESS_COOKIE_VALUE, cookieOptions);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
