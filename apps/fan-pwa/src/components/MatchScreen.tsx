"use client";
import useSWR from "swr";
import type { MatchState } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Live match score, over, and striker info pulled from the scripted scenario feed. */
export function MatchScreen() {
  const { data } = useSWR<MatchState>("/api/match", fetcher, { refreshInterval: 10_000 });
  if (!data) {
    return (
      <div className="p-4 mono text-[11px] text-ink-fade">loading match…</div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="bg-surface-low scan-line p-4">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-ink-fade mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-red pulse-dot" />
          live · innings {data.innings}
        </div>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-3xl font-semibold">{data.home_team}</span>
          <span className="text-ink-fade text-sm">v</span>
          <span className="text-xl text-ink-fade">{data.away_team}</span>
        </div>
        <div className="mono text-4xl tracking-tight mb-3">{data.score}</div>
        <div className="grid grid-cols-3 gap-2 text-[12px]">
          <Stat label="over" value={data.over.toFixed(1)} />
          <Stat label="on strike" value={data.on_strike} accent />
          {data.non_striker && <Stat label="non-strike" value={data.non_striker} />}
          {data.target && <Stat label="target" value={data.target.toString()} />}
          {data.required && <Stat label="need" value={data.required} accent />}
          {typeof data.required_rr === "number" && (
            <Stat label="req rr" value={data.required_rr.toFixed(2)} />
          )}
        </div>
      </div>

      <div className="tile">
        <div className="tile-header">your moment</div>
        <div className="text-[13px] text-ink-mute leading-relaxed">
          Kohli needs a boundary this over to keep the run-rate. Next break in
          roughly {data.end_of_over_in_s ?? 45}s. The Concierge checks this
          state before routing you to any queue — so you never miss a ball.
        </div>
      </div>

      <div className="tile opacity-75">
        <div className="tile-header">live feed source</div>
        <div className="mono text-[11px] text-ink-fade">
          Frozen 2024 IPL final snapshot for phase 4. CricAPI polling via
          Cloud Scheduler → Firestore ships in phase 6.
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-dim px-2.5 py-2">
      <div className="mono text-[9px] uppercase tracking-wider text-ink-fade">
        {label}
      </div>
      <div
        className={`${
          accent ? "text-accent-cyan" : "text-ink"
        } mono text-[14px] mt-0.5`}
      >
        {value}
      </div>
    </div>
  );
}
