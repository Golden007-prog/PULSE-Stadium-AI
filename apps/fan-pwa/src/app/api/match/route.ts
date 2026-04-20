import { NextResponse } from "next/server";
import type { MatchState } from "@/lib/types";

export const dynamic = "force-dynamic";

const MATCH: MatchState = {
  match_id: "RCB_vs_CSK_2026_final",
  home_team: "RCB",
  away_team: "CSK",
  innings: 2,
  over: 18.3,
  on_strike: "Kohli",
  non_striker: "Patidar",
  score: "RCB 152/3",
  target: 209,
  required: "57 from 9",
  required_rr: 9.5,
  end_of_over_in_s: 45,
};

/** Return the scripted scenario's current match score and clock. */
export async function GET() {
  return NextResponse.json(MATCH);
}
