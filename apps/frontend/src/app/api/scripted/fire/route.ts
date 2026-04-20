import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firestore-admin";

export const dynamic = "force-dynamic";

type EventEnvelope = {
  run_id?: string;
  type: "zone_density" | "intervention" | "agent_trace" | "fan_query" | "anomaly" | "finale";
  data: Record<string, unknown>;
};

const VENUE_ID = process.env.PULSE_VENUE_ID ?? "chinnaswamy";

/**
 * Server-side writer for the scripted 90-second auto-play.
 *
 * The client schedules POSTs to this endpoint at specific timings;
 * we translate each envelope into the right Firestore write so the
 * existing onSnapshot listeners (zones / interventions / agent_traces)
 * render identically to a live run.
 *
 * We deliberately bypass the orchestrator here — the auto-play must
 * be deterministic and $0-Gemini per run.
 */
export async function POST(req: Request) {
  let env: EventEnvelope;
  try {
    env = (await req.json()) as EventEnvelope;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const db = getDb();
  try {
    switch (env.type) {
      case "zone_density": {
        const { zone_id, density, note } = env.data as {
          zone_id: string;
          density: number;
          note?: string;
        };
        await db
          .collection("venues")
          .doc(VENUE_ID)
          .collection("zones")
          .doc(zone_id)
          .set(
            {
              current_density: density,
              last_update_note: note ?? "",
              last_updated: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        return NextResponse.json({ ok: true });
      }

      case "intervention": {
        const ref = db
          .collection("venues")
          .doc(VENUE_ID)
          .collection("interventions")
          .doc();
        const d = env.data as {
          initiating_agent: string;
          action: string;
          target: string;
          reason: string;
        };
        await ref.set({
          id: ref.id,
          initiating_agent: d.initiating_agent,
          action: d.action,
          target: d.target,
          reason: d.reason,
          status: "committed",
          metadata: { scripted: true, run_id: env.run_id ?? null },
          created_at: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ ok: true, id: ref.id });
      }

      case "agent_trace": {
        const traceId = `scripted-${env.run_id ?? Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const d = env.data as {
          tag: string;
          chain: string[];
          tokens_used?: number;
          cost_usd?: number;
          duration_ms?: number;
          summary?: string;
          inputs?: Record<string, unknown>;
        };
        await db
          .collection("agent_traces")
          .doc(traceId)
          .set({
            trace_id: traceId,
            root_agent: d.chain?.[0] ?? "orchestrator",
            invocation_chain: d.chain ?? [],
            tag: d.tag ?? "scripted",
            tokens_used: d.tokens_used ?? 0,
            cost_usd: d.cost_usd ?? 0,
            duration_ms: d.duration_ms ?? 0,
            inputs: d.inputs ?? { scripted: true },
            outputs: { summary: d.summary ?? "" },
            timestamp: Timestamp.now(),
          });
        return NextResponse.json({ ok: true, trace_id: traceId });
      }

      case "fan_query": {
        // Mirror a fan query into the /fan_actions collection so the fan-pwa
        // demo screen shows the same question being asked.
        const ref = db.collection("fan_actions").doc();
        const d = env.data as {
          fan_id: string;
          seat: string;
          query: string;
          modality?: string;
        };
        await ref.set({
          id: ref.id,
          fan_id: d.fan_id,
          seat: d.seat,
          query: d.query,
          modality: d.modality ?? "text",
          run_id: env.run_id ?? null,
          created_at: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ ok: true });
      }

      case "anomaly": {
        const ref = db.collection("vision_anomalies").doc();
        await ref.set({
          ...(env.data as object),
          run_id: env.run_id ?? null,
          created_at: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ ok: true });
      }

      case "finale": {
        if (!env.run_id) {
          return NextResponse.json(
            { ok: false, error: "finale requires run_id" },
            { status: 400 }
          );
        }
        await db
          .collection("demo_runs")
          .doc(env.run_id)
          .set(
            {
              ...(env.data as object),
              run_id: env.run_id,
              finished_at: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `unknown type ${String((env as EventEnvelope).type)}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
