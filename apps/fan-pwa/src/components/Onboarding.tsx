"use client";
import { useState } from "react";
import type { FanProfile } from "@/lib/types";

export function Onboarding({ onDone }: { onDone: (p: FanProfile) => void }) {
  const [name, setName] = useState("Raj");
  const [seat, setSeat] = useState("B-204");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-subtitle"
      className="fixed inset-0 z-50 bg-surface-dim flex flex-col"
    >
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-ink-fade mb-6">
            Gen AI Academy APAC · Track 1
          </div>
          <h1
            id="onboarding-title"
            className="text-4xl font-semibold tracking-tight mb-2"
          >
            PULSE<span className="text-accent-cyan" aria-hidden="true">_</span>
          </h1>
          <p id="onboarding-subtitle" className="text-ink-mute mb-10 text-sm">
            Voice-native stadium concierge. No install. No login.
          </p>

          <label htmlFor="fan-name" className="block mb-5">
            <span className="tile-header block mb-2">name</span>
            <input
              id="fan-name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              aria-required="true"
              className="w-full bg-transparent border-b border-surface-high text-xl pb-2 focus:outline-none focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan transition-colors"
            />
          </label>

          <label htmlFor="fan-seat" className="block mb-10">
            <span className="tile-header block mb-2">seat</span>
            <input
              id="fan-seat"
              type="text"
              autoComplete="off"
              value={seat}
              onChange={(e) => setSeat(e.target.value.toUpperCase())}
              aria-required="true"
              aria-describedby="seat-hint"
              className="w-full bg-transparent border-b border-surface-high text-xl pb-2 focus:outline-none focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan transition-colors font-mono"
            />
            <span id="seat-hint" className="sr-only">
              Enter your stadium seat, for example B-204.
            </span>
          </label>

          <button
            type="button"
            disabled={!name || !seat}
            onClick={() =>
              onDone({
                fan_id: `${name.toLowerCase().replace(/\s+/g, "-")}-${seat.toLowerCase()}`,
                display_name: name,
                seat,
                language: "en-IN",
              })
            }
            aria-label="Enter the stadium and start the Concierge"
            className="w-full mono text-[11px] uppercase tracking-[0.2em] px-4 py-4 bg-accent-cyan text-surface-dim hover:shadow-glow disabled:opacity-40 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dim"
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
