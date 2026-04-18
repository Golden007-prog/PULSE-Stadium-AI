import { NextResponse } from "next/server";
import { invokeCloudRun } from "@/lib/cloud-run";

export const dynamic = "force-dynamic";

const SIM_URL = process.env.SIMULATOR_URL ?? "";

export async function POST() {
  if (!SIM_URL) {
    return NextResponse.json(
      { error: "SIMULATOR_URL not configured" },
      { status: 500 }
    );
  }
  try {
    const data = await invokeCloudRun(`${SIM_URL}/scenario/reset`, "POST");
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
