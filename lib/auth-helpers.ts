import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  return id ?? null;
}

/** Use in Route Handlers: returns userId or null (caller returns 401). */
export async function requireUserId(): Promise<string | null> {
  return getSessionUserId();
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
