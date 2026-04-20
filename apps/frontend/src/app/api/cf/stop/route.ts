import { NextResponse } from "next/server";
import { invokeCloudRun } from "@/lib/cloud-run";

export const dynamic = "force-dynamic";

const CF_URL = process.env.COUNTERFACTUAL_URL ?? "";

/** Stop the running counterfactual ABS simulation and persist its summary. */
export async function POST(req: Request) {
  if (!CF_URL) {
    return NextResponse.json(
      { ok: false, error: "COUNTERFACTUAL_URL not configured" },
      { status: 500 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as { session_id?: string };
  const session_id = (body?.session_id ?? "").trim();
  if (!session_id) {
    return NextResponse.json({ ok: false, error: "session_id required" }, { status: 400 });
  }
  try {
    const data = await invokeCloudRun(`${CF_URL}/stop`, "POST", { session_id });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
