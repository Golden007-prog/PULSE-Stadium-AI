"use client";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { MatchTicker } from "@/components/MatchTicker";
import { AgentRoster } from "@/components/AgentRoster";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { PlaybackControls } from "@/components/PlaybackControls";
import { InterventionsStrip } from "@/components/InterventionCard";
import { useCollection } from "@/lib/use-firestore";
import type {
  AgentTrace,
  Intervention,
  OrchestratorState,
  Zone,
} from "@/lib/types";

const Twin3D = dynamic(() => import("@/components/Twin3D"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-ink-fade mono text-[11px]">
      initialising twin…
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((r) => r.json());
type OrchResp = { state?: OrchestratorState } & Record<string, unknown>;

export default function OpsPage() {
  // LIVE: Firestore onSnapshot listeners (sub-500ms propagation).
  const { data: zones } = useCollection<Zone>(
    "venues/chinnaswamy/zones"
  );
  const { data: interventions } = useCollection<Intervention>(
    "venues/chinnaswamy/interventions",
    { orderBy: ["created_at", "desc"], limit: 20 }
  );
  const { data: traces } = useCollection<AgentTrace>("agent_traces", {
    orderBy: ["timestamp", "desc"],
    limit: 30,
  });

  // Orchestrator /health is NOT in Firestore — keep server polling for that.
  const { data: o } = useSWR<OrchResp>("/api/orchestrator", fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });

  const orch: OrchestratorState = o?.state ?? {
    running: false,
    ticks: 0,
    invocations: 0,
    total_invocations: 0,
    total_usd: 0,
    budget_paused: false,
    last_summary: null,
    attendance_counted: 0,
    fan_queries_pending: 0,
    anomalies_seen: 0,
    alerts_seen: 0,
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden grid bg-surface-dim text-ink"
      style={{ gridTemplateRows: "56px 1fr 48px" }}
    >
      <MatchTicker attendance={orch.attendance_counted ?? 0} />

      <div
        className="relative grid overflow-hidden"
        style={{ gridTemplateColumns: "260px 1fr 380px" }}
      >
        <AgentRoster
          traces={traces}
          totalUsd={orch.total_usd ?? 0}
          totalInvocations={orch.total_invocations ?? 0}
        />

        <div className="relative bg-surface-dim">
          <div className="absolute inset-0">
            <Twin3D zones={zones} />
          </div>
          <div className="absolute top-3 right-3 mono text-[10px] uppercase tracking-wider text-ink-fade pointer-events-none">
            {zones.length} zones · {interventions.length} interventions · live
          </div>
          <InterventionsStrip interventions={interventions} />
          <Legend />
        </div>

        <AgentTracePanel traces={traces} />
      </div>

      <PlaybackControls
        ticks={orch.ticks ?? 0}
        lastSummary={orch.last_summary ?? null}
        budgetPaused={orch.budget_paused ?? false}
        totalUsd={orch.total_usd ?? 0}
      />
    </div>
  );
}

function Legend() {
  const bands = [
    { max: 1.0, label: "calm", color: "#2EB578" },
    { max: 2.0, label: "nominal", color: "#3DDC84" },
    { max: 3.0, label: "busy", color: "#9DE83E" },
    { max: 3.8, label: "tight", color: "#FFB547" },
    { max: 4.8, label: "warn", color: "#FF8A3E" },
    { max: 6.0, label: "crush", color: "#FF5252" },
  ];
  return (
    <div className="absolute bottom-3 left-3 bg-surface-low/90 backdrop-blur-sm px-3 py-2 pointer-events-none">
      <div className="mono text-[9px] uppercase tracking-[0.18em] text-ink-fade mb-1.5">
        density · p/m²
      </div>
      <div className="flex items-center gap-2 mono text-[10px]">
        {bands.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5"
              style={{ background: b.color }}
            />
            <span className="text-ink-mute">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
