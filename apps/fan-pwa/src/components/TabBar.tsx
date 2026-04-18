"use client";

export type TabId = "concierge" | "queues" | "wayfind" | "nudges" | "match";

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "concierge", label: "Ask", icon: <Mic /> },
    { id: "queues", label: "Queues", icon: <QueueIcon /> },
    { id: "wayfind", label: "Route", icon: <Route /> },
    { id: "nudges", label: "Nudges", icon: <Bell /> },
    { id: "match", label: "Match", icon: <Bat /> },
  ];
  return (
    <nav className="h-14 bg-surface-low flex items-stretch justify-around">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 ${
              on ? "text-accent-cyan" : "text-ink-fade"
            }`}
            style={{
              borderTop: on ? "2px solid #00E5FF" : "2px solid transparent",
            }}
          >
            <div className="w-5 h-5">{t.icon}</div>
            <span className="mono text-[9px] uppercase tracking-wider">
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function Mic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}
function QueueIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="13" y2="18" />
    </svg>
  );
}
function Route() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v4a3.5 3.5 0 003.5 3.5H14a3.5 3.5 0 013.5 3.5" />
    </svg>
  );
}
function Bell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16l-2-3z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  );
}
function Bat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21l5-5" />
      <path d="M8 16l10-10a2.5 2.5 0 013.5 3.5L11.5 19.5a2.5 2.5 0 01-3.5 0l-1-1a2.5 2.5 0 010-3.5z" />
      <circle cx="5.5" cy="18.5" r="1.2" />
    </svg>
  );
}
