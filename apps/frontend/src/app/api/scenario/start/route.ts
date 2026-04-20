import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { invokeCloudRun } from "@/lib/cloud-run";
import { getDb } from "@/lib/firestore-admin";

export const dynamic = "force-dynamic";

const CF_URL = process.env.COUNTERFACTUAL_URL ?? "";
const VENUE_ID = process.env.PULSE_VENUE_ID ?? "chinnaswamy";

/**
 * Start a scripted 90-second demo run.
 *
 * 1. Generate a fresh run_id.
 * 2. Reset the reality zones to the scenario's initial state (so the
 *    twin starts from a clean "pre-match" baseline each run — deterministic).
 * 3. Kick off a counterfactual session against the SAME run_id so the
 *    split-screen has parallel data.
 * 4. Register the run in /demo_runs/{run_id} for later auto-play metadata.
 *
 * The orchestrator + simulator are not touched — the scripted replay
 * writes Firestore directly via /api/scripted/fire so the demo is
 * $0-Gemini and byte-for-byte repeatable.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    initial_zones?: Record<string, number>;
  };

  const run_id = `demo-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  // 1. Seed reality zones with the scripted baseline if provided.
  if (body.initial_zones) {
    const db = getDb();
    const batch = db.batch();
    for (const [zone_id, density] of Object.entries(body.initial_zones)) {
      const ref = db
        .collection("venues")
        .doc(VENUE_ID)
        .collection("zones")
        .doc(zone_id);
      batch.set(
        ref,
        {
          current_density: density,
          last_update_note: `demo baseline · ${run_id}`,
          last_updated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }

  // 2. Kick off counterfactual against the same run_id (best-effort —
  //    if counterfactual service is cold, the client's split-screen
  //    still works off reality alone).
  let cf_started = false;
  if (CF_URL) {
    try {
      await invokeCloudRun(`${CF_URL}/start`, "POST", { session_id: run_id });
      cf_started = true;
    } catch (err) {
      console.error("cf start failed:", err);
    }
  }

  // 3. Register the run for later metrics / finale wiring.
  try {
    await getDb()
      .collection("demo_runs")
      .doc(run_id)
      .set({
        run_id,
        started_at: FieldValue.serverTimestamp(),
        cf_started,
        scenario: "ipl-final-2026",
      });
  } catch (err) {
    console.error("demo run register failed:", err);
  }

  return NextResponse.json({ ok: true, run_id, cf_started });
}
