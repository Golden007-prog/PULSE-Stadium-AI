"use client";
import { useState } from "react";

export function PlaybackControls({
  ticks,
  lastSummary,
  budgetPaused,
  totalUsd,
}: {
  ticks: number;
  lastSummary: string | null;
  budgetPaused: boolean;
  totalUsd: number;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resetScenario() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/sim/reset", { method: "POST" });
      const j = await r.json();
      setMsg(r.ok ? "scenario restarted" : `error: ${j.error ?? r.status}`);
    } catch (e) {
      setMsg(`error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <footer className="h-12 bg-surface-low flex items-center px-4 gap-4 text-[11px]">
      <button
        onClick={resetScenario}
        disabled={busy}
        className="mono text-[10px] uppercase tracking-wider px-3 py-1.5 bg-accent-cyan text-surface-dim hover:shadow-glow disabled:opacity-50 transition-shadow"
      >
        {busy ? "resetting…" : "▶ reset scenario"}
      </button>
      <button
        className="mono text-[10px] uppercase tracking-wider px-3 py-1.5 bg-surface text-ink-fade cursor-not-allowed"
        disabled
        title="Ships in phase 5"
      >
        counterfactual (phase 5)
      </button>
      <div className="flex-1" />
      <Stat label="orch tick" value={ticks.toString()} />
      <Stat label="spend" value={`$${totalUsd.toFixed(4)}`} />
      {budgetPaused && (
        <span className="mono text-[10px] uppercase tracking-wider text-accent-red pulse-dot">
          budget paused
        </span>
      )}
      <div className="min-w-[280px] max-w-md text-right">
        {msg && (
          <span className="mono text-[10px] uppercase tracking-wider text-accent-cyan">
            {msg}
          </span>
        )}
        {!msg && lastSummary && (
          <span className="text-ink-mute text-[11px] truncate inline-block max-w-full align-middle">
            {lastSummary}
          </span>
        )}
      </div>
    </footer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="mono text-[9px] uppercase tracking-wider text-ink-fade">
        {label}
      </span>
      <span className="mono">{value}</span>
    </div>
  );
}
