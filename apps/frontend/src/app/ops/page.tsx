"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { MatchTicker } from "@/components/MatchTicker";
import { AgentRoster } from "@/components/AgentRoster";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { PlaybackControls } from "@/components/PlaybackControls";
import { InterventionsStrip } from "@/components/InterventionCard";
import { CfToggle } from "@/components/CfToggle";
import { DeltaMetrics } from "@/components/DeltaMetrics";
import { useCollection, useDoc } from "@/lib/use-firestore";
import type {
  AgentTrace,
  CfSummary,
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
  // ── Reality state (live Firestore) ─────────────────────────────
  const { data: realityZones } = useCollection<Zone>(
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
  const { data: o } = useSWR<OrchResp>("/api/orchestrator", fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });

  // ── Counterfactual session ────────────────────────────────────
  const [cfSessionId, setCfSessionId] = useState<string | null>(null);
  const { data: cfSummary } = useDoc<CfSummary>(
    cfSessionId ? `counterfactual/${cfSessionId}` : null
  );
  const cfActive = Boolean(cfSessionId);

  const cfZones: Zone[] = useMemo(() => {
    if (!cfSummary?.zones_latest || realityZones.length === 0) return [];
    const densities = cfSummary.zones_latest;
    return realityZones.map((z) => ({
      ...z,
      current_density: densities[z.id] ?? z.current_density ?? 0,
      last_update_note: `cf tick ${cfSummary.tick ?? 0}`,
    }));
  }, [cfSummary, realityZones]);

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

        {/* Centre stack: twin(s) + delta strip */}
        <div
          className="relative bg-surface-dim flex flex-col overflow-hidden"
        >
          {/* Top-right HUD: CF toggle + metadata */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto">
            <div className="mono text-[10px] uppercase tracking-wider text-ink-fade pointer-events-none">
              {realityZones.length} zones · {interventions.length} interventions
              {cfActive && cfSummary?.tick != null && ` · cf t+${cfSummary.tick * 5}s`}
            </div>
            <CfToggle
              active={cfActive}
              sessionId={cfSessionId}
              onStart={(id) => setCfSessionId(id)}
              onStop={() => setCfSessionId(null)}
            />
          </div>

          {/* Twin row */}
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 relative">
              <TwinLabel variant="reality" />
              <div className="absolute inset-0">
                <Twin3D zones={realityZones} variant="reality" autoRotate />
              </div>
              <InterventionsStrip interventions={interventions} />
              <Legend />
            </div>

            {cfActive && (
              <>
                <div className="w-px bg-gradient-to-b from-accent-cyan via-accent-purple to-accent-purple opacity-60" />
                <div className="flex-1 relative">
                  <TwinLabel variant="counterfactual" />
                  <div className="absolute inset-0">
                    <Twin3D
                      zones={cfZones.length ? cfZones : realityZones}
                      variant="counterfactual"
                      autoRotate
                    />
                  </div>
                  {!cfSummary && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="mono text-[11px] uppercase tracking-wider text-ink-fade bg-surface-low px-3 py-2">
                        spinning up counterfactual…
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Delta metrics strip — only when CF is on */}
          {cfActive && (
            <DeltaMetrics
              reality={realityZones}
              cf={cfSummary}
              realityInterventionCount={interventions.length}
            />
          )}
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

function TwinLabel({ variant }: { variant: "reality" | "counterfactual" }) {
  const isCf = variant === "counterfactual";
  return (
    <div className="absolute top-3 left-3 z-10 pointer-events-none">
      <div
        className={`mono text-[10px] uppercase tracking-[0.22em] px-2 py-1 ${
          isCf
            ? "bg-accent-purple/15 text-accent-purple"
            : "bg-accent-cyan/15 text-accent-cyan"
        }`}
      >
        {isCf ? "counterfactual · no intervention" : "reality · pulse active"}
      </div>
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
