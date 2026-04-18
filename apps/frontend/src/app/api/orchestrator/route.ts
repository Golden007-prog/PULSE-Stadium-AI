import { NextResponse } from "next/server";
import { invokeCloudRun } from "@/lib/cloud-run";

export const dynamic = "force-dynamic";

const ORCH_URL = process.env.ORCHESTRATOR_URL ?? "";

export async function GET() {
  if (!ORCH_URL) {
    return NextResponse.json(
      { error: "ORCHESTRATOR_URL not configured" },
      { status: 500 }
    );
  }
  try {
    const data = await invokeCloudRun(`${ORCH_URL}/health`, "GET");
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
