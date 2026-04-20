import { NextResponse } from "next/server";
import { invokeCloudRun } from "@/lib/cloud-run";

export const dynamic = "force-dynamic";

const CF_URL = process.env.COUNTERFACTUAL_URL ?? "";

export async function POST(req: Request) {
  if (!CF_URL) {
    return NextResponse.json(
      { ok: false, error: "COUNTERFACTUAL_URL not configured" },
      { status: 500 }
    );
  }
  let session_id: string;
  try {
    const body = (await req.json().catch(() => ({}))) as { session_id?: string };
    session_id = (body?.session_id ?? "").trim() || `ops-${Date.now().toString(36)}`;
  } catch {
    session_id = `ops-${Date.now().toString(36)}`;
  }

  try {
    const data = await invokeCloudRun(`${CF_URL}/start`, "POST", { session_id });
    return NextResponse.json({ ok: true, session_id, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, session_id, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
