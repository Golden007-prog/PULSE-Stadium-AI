import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface-dim">
      <div className="max-w-xl w-full text-center">
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-ink-fade mb-6">
          Gen AI Academy APAC · Track 1
        </div>
        <h1 className="text-6xl font-semibold tracking-tight">
          PULSE<span className="text-accent-cyan">_</span>
        </h1>
        <p className="text-ink-mute mt-3 text-lg">the self-aware stadium</p>
        <p className="text-ink-fade mt-8 text-sm leading-relaxed">
          One multi-agent AI · 40,000 fans · real-time coordination.
          Deployed on Cloud Run with Google ADK and Gemini 2.5.
        </p>
        <div className="mt-10 flex gap-3 justify-center">
          <Link
            href="/ops"
            className="group relative px-6 py-3 bg-accent-cyan text-surface-dim font-medium mono uppercase tracking-wider text-xs hover:shadow-glow transition-shadow"
          >
            Watch the 2026 IPL final →
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-6 text-left">
          <Pillar title="Safety floor">
            Predict and prevent bottlenecks 10–15 min before they form.
          </Pillar>
          <Pillar title="Coordination mid">
            Replace 15 WhatsApp groups with a traceable agent backbone.
          </Pillar>
          <Pillar title="Delight ceiling">
            Per-fan, match-state-aware concierge, voice-native.
          </Pillar>
        </div>
      </div>
    </main>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-low px-3 py-3">
      <div className="mono text-[9px] uppercase tracking-wider text-accent-cyan">
        {title}
      </div>
      <p className="text-ink-mute text-[11px] mt-1.5 leading-relaxed">{children}</p>
    </div>
  );
}
