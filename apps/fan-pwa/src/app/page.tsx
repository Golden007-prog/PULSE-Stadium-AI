"use client";
import { useEffect, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { TabBar, type TabId } from "@/components/TabBar";
import { ConciergeScreen } from "@/components/ConciergeScreen";
import { QueuesScreen } from "@/components/QueuesScreen";
import { WayfindScreen } from "@/components/WayfindScreen";
import { NudgesScreen } from "@/components/NudgesScreen";
import { MatchScreen } from "@/components/MatchScreen";
import type { FanProfile } from "@/lib/types";

const STORAGE_KEY = "pulse-fan-profile";

/** Tabbed shell that routes between Match, Queues, Wayfind, Nudges, and Concierge screens. */
export default function FanPwaHome() {
  const [fan, setFan] = useState<FanProfile | null>(null);
  const [tab, setTab] = useState<TabId>("concierge");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFan(JSON.parse(raw) as FanProfile);
    } catch {}
    setHydrated(true);
  }, []);

  function onboard(p: FanProfile) {
    setFan(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  }

  function signOut() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setFan(null);
  }

  if (!hydrated) return null;
  if (!fan) return <Onboarding onDone={onboard} />;

  return (
    <div className="h-screen flex flex-col bg-surface-dim">
      <Header fan={fan} onSignOut={signOut} />
      <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto">
        {tab === "concierge" && <ConciergeScreen fan={fan} />}
        {tab === "queues" && <QueuesScreen />}
        {tab === "wayfind" && <WayfindScreen fan={fan} />}
        {tab === "nudges" && <NudgesScreen />}
        {tab === "match" && <MatchScreen />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

function Header({ fan, onSignOut }: { fan: FanProfile; onSignOut: () => void }) {
  return (
    <header
      role="banner"
      className="h-12 bg-surface-low flex items-center px-4 gap-3 scan-line"
    >
      <span
        aria-label="PULSE — stadium concierge"
        className="text-accent-cyan font-semibold tracking-[0.22em] text-sm"
      >
        PULSE
      </span>
      <div className="h-4 w-px bg-surface" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">
          <span className="sr-only">Signed in as </span>
          {fan.display_name}
          <span className="mono text-[11px] text-ink-fade ml-2">
            <span className="sr-only">Seat </span>
            {fan.seat}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Clear fan profile and return to onboarding"
        className="mono text-[10px] uppercase tracking-wider text-ink-fade hover:text-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:outline-none"
      >
        reset
      </button>
    </header>
  );
}
