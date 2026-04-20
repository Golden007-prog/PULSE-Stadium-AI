"use client";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { MatchTicker } from "@/components/MatchTicker";
import { AgentRoster } from "@/components/AgentRoster";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { PlaybackControls } from "@/components/PlaybackControls";
import { InterventionsStrip } from "@/components/InterventionCard";
import { CfToggle } from "@/components/CfToggle";
import { DeltaMetrics } from "@/components/DeltaMetrics";
import { AutoPlayBanner } from "@/components/AutoPlayBanner";
import { MetricsCard } from "@/components/MetricsCard";
import { useCollection, useDoc } from "@/lib/use-firestore";
import {
  loadTimeline,
  schedule,
  startDemo,
  type ScriptedTimeline,
} from "@/lib/autoplay";
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

/** Ops page wrapper; fetches initial venue state on the server and hydrates the client twin. */
export default function OpsPageWrap() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-surface-dim" />}>
      <OpsPage />
    </Suspense>
  );
}

// Module-scoped autoplay handle so unmount can cancel pending timers.
let _autoplayHandle: { cancel: () => void } | null = null;

function OpsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const autoplayFlag = params.get("autoplay") === "true";
  const runParam = params.get("run");

  // ── Reality state (live Firestore) ─────────────────────────────
  const { data: realityZones } = useCollection<Zone>("venues/chinnaswamy/zones");
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
  const [cfSessionId, setCfSessionId] = useState<string | null>(runParam);
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

  // ── Auto-play scheduler ───────────────────────────────────────
  const [timeline, setTimeline] = useState<ScriptedTimeline | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [autoplayRunning, setAutoplayRunning] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    if (!autoplayFlag || !runParam) return;
    let cancelled = false;

    (async () => {
      const tl = await loadTimeline("/scripted-responses/ipl-final-2026.json");
      if (cancelled) return;
      setTimeline(tl);
      setAutoplayRunning(true);
      setElapsedMs(0);
      _autoplayHandle?.cancel();
      _autoplayHandle = schedule(
        tl,
        runParam,
        (e) => setElapsedMs(e),
        undefined,
        () => {
          setAutoplayRunning(false);
          setShowMetrics(true);
        }
      );
    })();

    return () => {
      cancelled = true;
      _autoplayHandle?.cancel();
      _autoplayHandle = null;
    };
  }, [autoplayFlag, runParam]);

  async function resetDemo() {
    _autoplayHandle?.cancel();
    const tl =
      timeline ??
      (await loadTimeline("/scripted-responses/ipl-final-2026.json"));
    const { run_id } = await startDemo(tl);
    router.push(`/ops?autoplay=true&run=${encodeURIComponent(run_id)}`);
  }

  function skipToEnd() {
    _autoplayHandle?.cancel();
    setAutoplayRunning(false);
    setShowMetrics(true);
  }

  function dismissMetrics() {
    setShowMetrics(false);
    router.push("/ops");
  }

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

  const finalMetrics = timeline?.final_metrics ?? {
    wait_reduction_pct: 47,
    peak_reduction_pct: 38,
    incidents_prevented: 7,
    revenue_lift_pct: 18,
    medical_response_time_s: 195,
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden grid bg-surface-dim text-ink relative"
      style={{ gridTemplateRows: "56px 1fr 48px" }}
    >
      <MatchTicker attendance={orch.attendance_counted ?? 0} />

      <main
        id="main"
        tabIndex={-1}
        aria-label="PULSE operations console"
        className="relative grid overflow-hidden"
        style={{ gridTemplateColumns: "260px 1fr 380px" }}
      >
        <AgentRoster
          traces={traces}
          totalUsd={orch.total_usd ?? 0}
          totalInvocations={orch.total_invocations ?? 0}
        />

        <section
          aria-label="3D stadium twin with counterfactual overlay"
          className="relative bg-surface-dim flex flex-col overflow-hidden"
        >
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mono text-[10px] uppercase tracking-wider text-ink-fade pointer-events-none"
            >
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

          <div className="flex-1 min-h-0 flex">
            <div
              role="region"
              aria-label="Reality twin — live venue state with PULSE intervening"
              className="flex-1 relative"
            >
              <TwinLabel variant="reality" />
              <div className="absolute inset-0">
                <Twin3D zones={realityZones} variant="reality" autoRotate />
              </div>
              <InterventionsStrip interventions={interventions} />
              <Legend />
            </div>

            {cfActive && (
              <>
                <div
                  aria-hidden="true"
                  className="w-px bg-gradient-to-b from-accent-cyan via-accent-purple to-accent-purple opacity-60"
                />
                <div
                  role="region"
                  aria-label="Counterfactual twin — parallel timeline with all agent actions suppressed"
                  className="flex-1 relative"
                >
                  <TwinLabel variant="counterfactual" />
                  <div className="absolute inset-0">
                    <Twin3D
                      zones={cfZones.length ? cfZones : realityZones}
                      variant="counterfactual"
                      autoRotate
                    />
                  </div>
                  {!cfSummary && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="mono text-[11px] uppercase tracking-wider text-ink-fade bg-surface-low px-3 py-2">
                        spinning up counterfactual…
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {cfActive && (
            <DeltaMetrics
              reality={realityZones}
              cf={cfSummary}
              realityInterventionCount={interventions.length}
            />
          )}
        </section>

        <AgentTracePanel traces={traces} />
      </main>

      <PlaybackControls
        ticks={orch.ticks ?? 0}
        lastSummary={orch.last_summary ?? null}
        budgetPaused={orch.budget_paused ?? false}
        totalUsd={orch.total_usd ?? 0}
      />

      {autoplayFlag && timeline && (
        <AutoPlayBanner
          elapsedMs={elapsedMs}
          totalMs={timeline.duration_ms}
          running={autoplayRunning}
          onReset={resetDemo}
          onSkip={skipToEnd}
        />
      )}

      {showMetrics && (
        <MetricsCard
          waitReductionPct={finalMetrics.wait_reduction_pct}
          peakReductionPct={finalMetrics.peak_reduction_pct}
          incidentsPrevented={finalMetrics.incidents_prevented}
          revenueLiftPct={finalMetrics.revenue_lift_pct}
          medicalResponseS={finalMetrics.medical_response_time_s}
          onDismiss={dismissMetrics}
        />
      )}
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
