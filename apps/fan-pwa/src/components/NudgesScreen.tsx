"use client";
import { useEffect, useState } from "react";
import type { Nudge } from "@/lib/types";

const SEEDED: Nudge[] = [
  {
    id: "n-1",
    kind: "delight",
    title: "Kohli's 50 coming up",
    body: "Scoreboard may flash your seat B-204 if he brings it up — keep your camera ready.",
    created_at: Date.now() - 45_000,
  },
  {
    id: "n-2",
    kind: "queue",
    title: "Beer queue just opened a slot",
    body: "Gate 4 Bar wait dropped to 60s. Kohli on strike — go now, you'll be back for the next over.",
    created_at: Date.now() - 120_000,
  },
  {
    id: "n-3",
    kind: "safety",
    title: "Short pause at Concourse South",
    body: "Medical unit clearing a path 2 rows down. Please use Concourse North instead for 3 minutes.",
    created_at: Date.now() - 210_000,
  },
];

export function NudgesScreen() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-4 space-y-3">
      <div className="tile">
        <div className="tile-header">proactive nudges</div>
        <div className="text-ink-mute text-[12px]">
          Pushed by the Experience / Care / Queue agents. Silent unless they matter.
        </div>
      </div>
      {SEEDED.map((n) => (
        <NudgeCard key={n.id} n={n} now={now} />
      ))}
      <div className="tile opacity-50">
        <div className="flex items-center justify-between">
          <span className="mono text-[10px] uppercase tracking-wider text-ink-fade">
            phase 5
          </span>
          <span className="text-[11px] text-ink-fade">
            Live FCM push ships with Care + Experience agents
          </span>
        </div>
      </div>
    </div>
  );
}

function NudgeCard({ n, now }: { n: Nudge; now: number }) {
  const color =
    n.kind === "delight"
      ? "#9B6CFF"
      : n.kind === "safety"
      ? "#FF5252"
      : "#FFB547";
  const ago = Math.max(0, Math.round((now - n.created_at) / 1000));
  return (
    <div className="tile" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center justify-between mb-1">
        <span className="mono text-[10px] uppercase tracking-wider" style={{ color }}>
          {n.kind}
        </span>
        <span className="mono text-[10px] uppercase tracking-wider text-ink-fade">
          {ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`}
        </span>
      </div>
      <div className="font-medium text-[14px]">{n.title}</div>
      <div className="text-[12px] text-ink-mute mt-1 leading-relaxed">{n.body}</div>
    </div>
  );
}
