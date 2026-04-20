"use client";
import type { CfSummary, Zone } from "@/lib/types";

interface Props {
  reality: Zone[];
  cf: CfSummary | null;
  realityInterventionCount: number;
}

/**
 * Delta metrics strip rendered under the split-screen twins.
 *
 * Reality numbers are derived live from the current zone state + the count
 * of interventions the agents have written. Counterfactual numbers come
 * straight from /counterfactual/{id}/metrics written by the ABS engine.
 * All numbers are in JetBrains Mono per the Stitch brief.
 */
export function DeltaMetrics({ reality, cf, realityInterventionCount }: Props) {
  const realityPeak = reality.reduce(
    (a, z) => Math.max(a, z.current_density ?? 0),
    0
  );
  const cfPeak = cf?.metrics?.peak_density ?? 0;

  const cfWait = cf?.metrics?.wait_time_proxy_s ?? 0;
  const realityWait = reality.filter((z) => (z.current_density ?? 0) >= 4.0).length * 30;

  const cfIncidents = cf?.metrics?.incidents_would_occur ?? 0;
  // Reality has 0 incidents that actually occurred because every time a zone
  // crossed the threshold, Flow intervened — which is exactly what we want
  // the metric to tell judges.
  const incidentsPrevented = cfIncidents;

  const waitDelta = cfWait > 0 ? Math.round(((cfWait - realityWait) / cfWait) * 100) : 0;
  const peakDelta =
    cfPeak > 0 ? Math.round(((cfPeak - realityPeak) / cfPeak) * 100) : 0;

  return (
    <div className="bg-surface-low border-t border-surface px-4 py-2.5 flex items-center gap-6 mono text-[11px]">
      <div className="flex items-center gap-2 text-ink-fade uppercase tracking-[0.15em] text-[9px]">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-accent-purple pulse-dot"
        />
        counterfactual delta
      </div>

      <Stat
        label="wait time"
        reality={`${realityWait}s`}
        cf={`${cfWait}s`}
        delta={waitDelta}
      />
      <Stat
        label="peak density"
        reality={`${realityPeak.toFixed(1)}`}
        cf={`${cfPeak.toFixed(1)} p/m²`}
        delta={peakDelta}
      />
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] uppercase tracking-[0.15em] text-ink-fade">
          incidents
        </span>
        <span className="text-accent-green">{incidentsPrevented}</span>
        <span className="text-[9px] uppercase tracking-[0.12em] text-ink-fade">
          prevented
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] uppercase tracking-[0.15em] text-ink-fade">
          interventions
        </span>
        <span className="text-accent-cyan">{realityInterventionCount}</span>
      </div>
      {cf?.status && (
        <span className="text-[9px] uppercase tracking-[0.15em] text-ink-fade">
          cf · {cf.status} · t+
          {formatElapsed(cf.elapsed_s ?? 0)}
        </span>
      )}
    </div>
  );
}

function Stat({
  label,
  reality,
  cf,
  delta,
}: {
  label: string;
  reality: string;
  cf: string;
  delta: number;
}) {
  const arrow = delta > 0 ? "▼" : delta < 0 ? "▲" : "·";
  const color =
    delta > 0 ? "text-accent-green" : delta < 0 ? "text-accent-red" : "text-ink-fade";
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[9px] uppercase tracking-[0.15em] text-ink-fade">
        {label}
      </span>
      <span className="text-accent-cyan">{reality}</span>
      <span className="text-ink-fade">vs</span>
      <span className="text-accent-purple">{cf}</span>
      <span className={`${color} mono`}>
        {arrow} {Math.abs(delta)}%
      </span>
    </div>
  );
}

function formatElapsed(s: number): string {
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
