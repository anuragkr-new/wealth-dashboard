import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    const id = session?.user?.id;
    // #region agent log
    fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H4',location:'lib/auth-helpers.ts:getSessionUserId',message:'auth() resolved',data:{hasSession:!!session,hasUserId:!!id},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return id ?? null;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H5',location:'lib/auth-helpers.ts:getSessionUserId:catch',message:'auth() threw',data:{errorName:error instanceof Error ? error.name : 'unknown',errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

/** Use in Route Handlers: returns userId or null (caller returns 401). */
export async function requireUserId(): Promise<string | null> {
  return getSessionUserId();
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
