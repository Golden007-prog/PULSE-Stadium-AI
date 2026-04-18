"use client";
import { useState } from "react";
import type { FanProfile } from "@/lib/types";

export function Onboarding({ onDone }: { onDone: (p: FanProfile) => void }) {
  const [name, setName] = useState("Raj");
  const [seat, setSeat] = useState("B-204");

  return (
    <div className="fixed inset-0 z-50 bg-surface-dim flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-ink-fade mb-6">
            Gen AI Academy APAC · Track 1
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">
            PULSE<span className="text-accent-cyan">_</span>
          </h1>
          <p className="text-ink-mute mb-10 text-sm">
            Voice-native stadium concierge. No install. No login.
          </p>

          <label className="block mb-5">
            <span className="tile-header block mb-2">name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-transparent border-b border-surface-high text-xl pb-2 focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </label>

          <label className="block mb-10">
            <span className="tile-header block mb-2">seat</span>
            <input
              value={seat}
              onChange={(e) => setSeat(e.target.value.toUpperCase())}
              className="w-full bg-transparent border-b border-surface-high text-xl pb-2 focus:outline-none focus:border-accent-cyan transition-colors font-mono"
            />
          </label>

          <button
            disabled={!name || !seat}
            onClick={() =>
              onDone({
                fan_id: `${name.toLowerCase().replace(/\s+/g, "-")}-${seat.toLowerCase()}`,
                display_name: name,
                seat,
                language: "en-IN",
              })
            }
            className="w-full mono text-[11px] uppercase tracking-[0.2em] px-4 py-4 bg-accent-cyan text-surface-dim hover:shadow-glow disabled:opacity-40 transition-shadow"
          >
            enter the stadium →
          </button>

          <div className="mt-10 text-[10px] mono uppercase tracking-[0.18em] text-ink-fade">
            by continuing you accept anonymous match-day analytics.
          </div>
        </div>
      </div>
    </div>
  );
}
