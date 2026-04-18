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
      <main className="flex-1 overflow-y-auto">
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
    <header className="h-12 bg-surface-low flex items-center px-4 gap-3 scan-line">
      <span className="text-accent-cyan font-semibold tracking-[0.22em] text-sm">
        PULSE
      </span>
      <div className="h-4 w-px bg-surface" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">
          {fan.display_name}
          <span className="mono text-[11px] text-ink-fade ml-2">{fan.seat}</span>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="mono text-[10px] uppercase tracking-wider text-ink-fade hover:text-accent-cyan"
        title="Clear profile"
      >
        reset
      </button>
    </header>
  );
}
