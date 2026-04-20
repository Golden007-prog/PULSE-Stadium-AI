import { NextResponse } from "next/server";
import type { QueueInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Stubbed queue state for phase 4. Mirrors the Queue Agent's stub in the
 * orchestrator so the PWA and the agent agree. Phase 3+ will migrate to a
 * live `/venues/{id}/queues` Firestore collection.
 */
const QUEUES: QueueInfo[] = [
  { queue_id: "gate-4-bar", zone: "F-W", wait_s: 90, staff: 2, items: ["beer"] },
  { queue_id: "gate-5-bar", zone: "F-E", wait_s: 240, staff: 2, items: ["beer"] },
  { queue_id: "stand-b-food", zone: "F-E", wait_s: 180, staff: 3, items: ["biryani", "samosa"] },
  { queue_id: "stand-a-food", zone: "F-W", wait_s: 60, staff: 3, items: ["samosa", "popcorn"] },
  { queue_id: "c-01-restroom", zone: "C-01", wait_s: 75, staff: 0, items: ["restroom"] },
  { queue_id: "c-12-restroom", zone: "C-12", wait_s: 150, staff: 0, items: ["restroom"] },
];

/** Return live queue ETAs and suggested reroutes for the fan PWA. */
export async function GET() {
  return NextResponse.json({ queues: QUEUES });
}
