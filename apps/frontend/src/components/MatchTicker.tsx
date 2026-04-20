"use client";
import { useEffect, useState } from "react";

const MATCH = {
  venue: "M. Chinnaswamy · Bengaluru",
  home: "RCB",
  away: "CSK",
  innings: 2,
  over: 18.3,
  on_strike: "Kohli",
  score: "RCB 152/3",
  target: "209",
  required: "57 from 9",
};

/** Live match score + clock ticker pulled from the scripted scenario state. */
export function MatchTicker({ attendance }: { attendance: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-14 bg-surface-low scan-line flex items-center px-4 gap-6 text-[12px]">
      <div className="flex items-center gap-2">
        <span className="text-accent-cyan font-semibold tracking-[0.25em] text-base">
          PULSE
        </span>
        <span className="text-ink-fade mono text-[10px] uppercase tracking-wider">
          ops console
        </span>
      </div>
      <div className="h-6 w-px bg-surface" />
      <div className="flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-red pulse-dot" />
        <span className="mono text-[10px] uppercase tracking-wider text-accent-red">
          live
        </span>
        <span className="text-ink-mute">{MATCH.venue}</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-5 text-[11px]">
        <Stat label="match" value={`${MATCH.home} v ${MATCH.away}`} />
        <Stat label="score" value={MATCH.score} />
        <Stat label="over" value={MATCH.over.toString()} />
        <Stat label="on strike" value={MATCH.on_strike} />
        <Stat label="req" value={MATCH.required} />
        <div className="w-px h-6 bg-surface" />
        <Stat label="attendance" value={attendance.toLocaleString()} highlight />
        <Stat label="local" value={now.toLocaleTimeString("en-GB")} />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center">
      <span className="mono text-[9px] uppercase tracking-[0.12em] text-ink-fade">
        {label}
      </span>
      <span
        className={`mono font-medium ${
          highlight ? "text-accent-cyan" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
