"use client";

export interface ScriptedEvent {
  at_ms: number;
  type:
    | "zone_density"
    | "intervention"
    | "agent_trace"
    | "fan_query"
    | "anomaly"
    | "finale";
  data: Record<string, unknown>;
}

export interface ScriptedTimeline {
  name: string;
  duration_ms: number;
  initial_zones?: Record<string, number>;
  final_metrics?: Record<string, number>;
  events: ScriptedEvent[];
}

/**
 * Fetch the scripted timeline JSON shipped under /public.
 */
export async function loadTimeline(path: string): Promise<ScriptedTimeline> {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`failed to load timeline ${path}: ${r.status}`);
  return (await r.json()) as ScriptedTimeline;
}

/**
 * Start a new demo run and get back the run_id + the seeded counterfactual.
 */
export async function startDemo(
  timeline: ScriptedTimeline
): Promise<{ run_id: string; cf_started: boolean }> {
  const r = await fetch("/api/scenario/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initial_zones: timeline.initial_zones ?? {} }),
  });
  if (!r.ok) throw new Error(`/api/scenario/start ${r.status}`);
  const j = (await r.json()) as { run_id: string; cf_started: boolean };
  return j;
}

/**
 * Schedule the timeline via setTimeout. Returns a handle that cancels
 * all pending timers when called.
 */
export function schedule(
  timeline: ScriptedTimeline,
  run_id: string,
  onTick?: (elapsed_ms: number) => void,
  onEvent?: (e: ScriptedEvent) => void,
  onFinish?: () => void
): { cancel: () => void } {
  const startedAt = Date.now();
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const fire = (e: ScriptedEvent) => {
    if (cancelled) return;
    fetch("/api/scripted/fire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id, type: e.type, data: e.data }),
    }).catch((err) => console.error("[autoplay fire]", e.type, err));
    onEvent?.(e);
  };

  for (const e of timeline.events) {
    timers.push(setTimeout(() => fire(e), e.at_ms));
  }

  let tickTimer: ReturnType<typeof setInterval> | null = null;
  if (onTick) {
    tickTimer = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      onTick(elapsed);
      if (elapsed >= timeline.duration_ms) {
        if (tickTimer) clearInterval(tickTimer);
        onFinish?.();
      }
    }, 250);
  } else {
    timers.push(
      setTimeout(() => {
        if (!cancelled) onFinish?.();
      }, timeline.duration_ms)
    );
  }

  return {
    cancel: () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      if (tickTimer) clearInterval(tickTimer);
    },
  };
}
