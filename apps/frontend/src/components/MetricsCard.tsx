"use client";
import Link from "next/link";

interface Props {
  waitReductionPct: number;
  peakReductionPct: number;
  incidentsPrevented: number;
  revenueLiftPct: number;
  medicalResponseS: number;
  onDismiss: () => void;
}

/** Single KPI card used for venue density, queues, revenue, and safety metrics. */
export function MetricsCard({
  waitReductionPct,
  peakReductionPct,
  incidentsPrevented,
  revenueLiftPct,
  medicalResponseS,
  onDismiss,
}: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm">
      <div className="bg-surface-low max-w-2xl w-full mx-4 px-8 py-7 relative"
           style={{ borderTop: "2px solid #00E5FF" }}>
        <div className="mono text-[10px] uppercase tracking-[0.28em] text-accent-cyan mb-3">
          Outcome · IPL Final 2026 · First 90 seconds
        </div>
        <h2 className="text-3xl font-semibold tracking-tight mb-1">
          Reality vs. Counterfactual
        </h2>
        <p className="text-ink-mute text-[13px] mb-6">
          What 4 agents + 1 orchestrator did, in 90 seconds, vs. the
          do-nothing timeline running in parallel.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-7">
          <Metric value={`−${waitReductionPct}%`} label="avg wait time" positive />
          <Metric
            value={`−${peakReductionPct}%`}
            label="peak density"
            positive
          />
          <Metric
            value={`${incidentsPrevented}`}
            label="incidents prevented"
            positive
          />
          <Metric
            value={`+${revenueLiftPct}%`}
            label="f&b revenue"
            positive
          />
          <Metric
            value={`${medicalResponseS}s`}
            label="medical response"
          />
        </div>

        <div className="flex items-center justify-between mono text-[10px] uppercase tracking-wider text-ink-fade mb-6">
          <span>one solo dev · 48 hours · asia-south1</span>
          <span className="text-accent-cyan">
            ADK 2.5 · Gemini 2.5 · Cloud Run
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDismiss}
            className="mono text-[11px] uppercase tracking-[0.2em] px-4 py-2.5 bg-accent-cyan text-surface-dim hover:shadow-glow"
          >
            Try it yourself →
          </button>
          <Link
            href="/"
            className="mono text-[11px] uppercase tracking-[0.2em] px-4 py-2.5 text-ink-mute hover:text-accent-cyan"
          >
            ← back to landing
          </Link>
          <div className="flex-1" />
          <span className="mono text-[10px] uppercase tracking-wider text-ink-fade">
            github.com/Golden007-prog/PULSE-Stadium-AI
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  positive,
}: {
  value: string;
  label: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-surface-dim px-3 py-3">
      <div
        className={`mono text-3xl font-semibold tracking-tight ${
          positive ? "text-accent-green" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mono text-[9px] uppercase tracking-[0.16em] text-ink-fade mt-1">
        {label}
      </div>
    </div>
  );
}
