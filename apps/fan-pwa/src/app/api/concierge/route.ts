import { NextResponse } from "next/server";
import { invokeCloudRun } from "@/lib/cloud-run";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const ORCH_URL = process.env.ORCHESTRATOR_URL ?? "";

interface TriggerResp {
  trace_id?: string;
  chain?: string[];
  summary?: string;
  tokens_used?: number;
  cost_usd?: number;
  error?: string;
}

export async function POST(req: Request) {
  if (!ORCH_URL) {
    return NextResponse.json({ error: "ORCHESTRATOR_URL not set" }, { status: 500 });
  }
  const body = (await req.json()) as {
    fan_id?: string;
    seat?: string;
    query?: string;
    modality?: string;
  };
  const fan_id = body.fan_id ?? "raj-b-204";
  const seat = body.seat ?? "B-204";
  const modality = body.modality ?? "text";
  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const prompt = [
    "A fan has submitted a query. Delegate to the Concierge agent.",
    "",
    `fan_id: ${fan_id}`,
    `seat: ${seat}`,
    `modality: ${modality}`,
    `query: ${JSON.stringify(query)}`,
    "",
    "Concierge: look up the fan's profile, check the match state, and if the",
    "query is about food/drink/restroom, consult the Queue agent for the",
    "nearest option. Reply in <=15 words using the pattern:",
    '  "<queue/location>, <wait>s queue. <match hook>, you\'ll make it back for the over."',
  ].join("\n");

  try {
    const data = await invokeCloudRun<TriggerResp>(
      `${ORCH_URL}/trigger`,
      "POST",
      { prompt }
    );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
