"use client";
import { useState } from "react";

interface Props {
  active: boolean;
  sessionId: string | null;
  onStart: (sessionId: string) => void;
  onStop: () => void;
}

export function CfToggle({ active, sessionId, onStart, onStop }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      if (active && sessionId) {
        await fetch("/api/cf/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        onStop();
      } else {
        const r = await fetch("/api/cf/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const j = (await r.json()) as { ok: boolean; session_id?: string; error?: string };
        if (!r.ok || !j.ok || !j.session_id) {
          throw new Error(j.error ?? `start failed (${r.status})`);
        }
        onStart(j.session_id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={
        active
          ? "Stop counterfactual simulator"
          : "Run counterfactual simulator alongside reality"
      }
      aria-pressed={active}
      aria-busy={busy}
      className={`mono text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
        active
          ? "bg-accent-purple text-surface-dim"
          : "bg-surface text-ink-mute hover:bg-surface-high hover:text-accent-purple"
      } disabled:opacity-50`}
      title={err ?? (active ? "Stop counterfactual" : "Run counterfactual")}
    >
      {busy ? "…" : active ? "■ counterfactual on" : "▶ run counterfactual"}
    </button>
  );
}
