"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadTimeline, startDemo } from "@/lib/autoplay";

export default function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function watch() {
    setBusy(true);
    setErr(null);
    try {
      const tl = await loadTimeline("/scripted-responses/ipl-final-2026.json");
      const { run_id } = await startDemo(tl);
      router.push(`/ops?autoplay=true&run=${encodeURIComponent(run_id)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-dim text-ink overflow-hidden relative">
      {/* ambient scan line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.6) 50%, transparent 100%)",
        }}
      />
      {/* ambient radial */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(0,229,255,0.12), transparent 55%), radial-gradient(circle at 20% 80%, rgba(155,108,255,0.10), transparent 50%)",
        }}
      />

      <header className="relative flex items-center justify-between px-6 py-5 z-10">
        <div className="flex items-center gap-3">
          <span className="text-accent-cyan font-semibold tracking-[0.28em] text-sm">
            PULSE
          </span>
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-ink-fade">
            Virtual: PromptWars
          </span>
        </div>
        <div className="flex items-center gap-4 mono text-[10px] uppercase tracking-wider text-ink-fade">
          <a
            href="https://github.com/Golden007-prog/PULSE-Stadium-AI"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent-cyan"
          >
            github ↗
          </a>
          <a
            href="/ops"
            className="hover:text-accent-cyan"
          >
            ops console
          </a>
        </div>
      </header>

      <section className="relative min-h-[80vh] flex items-center px-6 md:px-16 z-10">
        <div className="max-w-3xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-ink-fade mb-6">
            m. chinnaswamy stadium · bengaluru · rcb v csk · final
          </div>
          <h1 className="text-6xl md:text-7xl font-semibold tracking-tight leading-[0.95] mb-4">
            PULSE<span className="text-accent-cyan">_</span>
            <br />
            the self-aware stadium.
          </h1>
          <p className="text-ink-mute text-lg md:text-xl leading-relaxed max-w-2xl mb-10">
            One multi-agent AI. 40,000 fans. Real-time. Built on Google ADK 2.5,
            Gemini 2.5, and Cloud Run — solo, in 48 hours.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-16">
            <button
              onClick={watch}
              disabled={busy}
              className="group relative mono text-[11px] uppercase tracking-[0.24em] px-6 py-4 bg-accent-cyan text-surface-dim hover:shadow-glow disabled:opacity-50 transition-shadow"
            >
              {busy ? "spinning up demo…" : "▶ watch the 2026 IPL final →"}
            </button>
            <Link
              href="/ops"
              className="mono text-[11px] uppercase tracking-[0.24em] px-5 py-4 border border-surface-high text-ink hover:text-accent-cyan hover:border-accent-cyan transition-colors"
            >
              explore ops console
            </Link>
            <a
              href="https://pulse-fan-pwa-524510164011.asia-south1.run.app"
              target="_blank"
              rel="noreferrer"
              className="mono text-[11px] uppercase tracking-[0.24em] px-5 py-4 border border-surface-high text-ink-mute hover:text-accent-purple hover:border-accent-purple transition-colors"
            >
              try the fan pwa ↗
            </a>
          </div>

          {err && (
            <div className="mono text-[11px] uppercase tracking-wider text-accent-red mb-8">
              {err}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3 max-w-4xl">
            <Pillar title="safety floor">
              Predict and prevent bottlenecks 10–15 minutes before they form.
            </Pillar>
            <Pillar title="coordination mid">
              Replace 15 WhatsApp groups with a traceable agent backbone.
            </Pillar>
            <Pillar title="delight ceiling">
              Per-fan, match-state-aware concierge — voice-native, zero-install.
            </Pillar>
          </div>
        </div>
      </section>

      <footer className="relative mono text-[10px] uppercase tracking-[0.18em] text-ink-fade px-6 py-4 border-t border-surface-low z-10 flex items-center justify-between">
        <span>
          built solo · 6 cloud run services · asia-south1 · goldenbasu007@gmail.com
        </span>
        <span>refs: allianz arena · sochi · itaewon · kanjuruhan</span>
      </footer>
    </main>
  );
}

function Pillar({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-low px-4 py-3">
      <div className="mono text-[9px] uppercase tracking-[0.18em] text-accent-cyan">
        {title}
      </div>
      <p className="text-ink-mute text-[12px] mt-1.5 leading-relaxed">{children}</p>
    </div>
  );
}
