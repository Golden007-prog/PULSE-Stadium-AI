"use client";
import { agentColor } from "@/lib/colors";
import type { AgentTrace } from "@/lib/types";

type AgentRow = {
  id: string;
  name: string;
  model: string;
  active: boolean;
  rubric: string;
};

const AGENTS: AgentRow[] = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    model: "Gemini 2.5 Pro",
    active: true,
    rubric: "all",
  },
  { id: "flow", name: "Flow", model: "Gemini 2.5 Flash", active: true, rubric: "crowd" },
  { id: "queue", name: "Queue", model: "Gemini 2.5 Flash", active: true, rubric: "waits" },
  {
    id: "concierge",
    name: "Concierge",
    model: "Gemini 2.5 Flash",
    active: true,
    rubric: "fans",
  },
  { id: "care", name: "Care", model: "Gemini 2.5 Flash", active: false, rubric: "medical" },
  { id: "safety", name: "Safety", model: "Gemini 2.5 Pro", active: false, rubric: "anomaly" },
  {
    id: "experience",
    name: "Experience",
    model: "Gemini 2.5 Flash",
    active: false,
    rubric: "delight",
  },
  {
    id: "revenue",
    name: "Revenue",
    model: "Gemini 2.5 Flash",
    active: false,
    rubric: "ops",
  },
];

export function AgentRoster({
  traces,
  totalUsd,
  totalInvocations,
}: {
  traces: AgentTrace[];
  totalUsd: number;
  totalInvocations: number;
}) {
  // Latest invocation per agent id
  const last: Record<string, AgentTrace> = {};
  for (const t of traces) {
    for (const a of t.invocation_chain ?? []) {
      if (!last[a]) last[a] = t;
    }
  }

  return (
    <aside className="panel bg-surface-low text-[12px] overflow-hidden">
      <div className="panel-header border-b-0 flex items-center justify-between">
        <span>agent roster</span>
        <span className="mono text-ink-mute">{totalInvocations} invocations</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {AGENTS.map((a) => {
          const t = last[a.id];
          return (
            <div
              key={a.id}
              className={`px-4 py-2.5 border-0 flex items-start gap-3 ${
                a.active ? "" : "opacity-40"
              }`}
              style={{
                borderLeft: `2px solid ${agentColor(a.id)}`,
              }}
            >
              <div
                className={`mt-1.5 w-2 h-2 rounded-full ${a.active ? "pulse-dot" : ""}`}
                style={{ background: agentColor(a.id) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.name}</span>
                  <span className="mono text-[9px] uppercase tracking-wider text-ink-fade">
                    {a.active ? a.rubric : "phase 5"}
                  </span>
                </div>
                <div className="mono text-[10px] text-ink-fade mt-0.5">{a.model}</div>
                {t ? (
                  <div className="mono text-[10px] text-ink-mute mt-1 truncate">
                    {formatTraceSummary(t)}
                  </div>
                ) : a.active ? (
                  <div className="mono text-[10px] text-ink-fade mt-1">idle</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 mono text-[10px] text-ink-fade flex items-center justify-between bg-surface-lowest">
        <span>cumulative spend</span>
        <span className="text-accent-cyan">${totalUsd.toFixed(4)}</span>
      </div>
    </aside>
  );
}

function formatTraceSummary(t: AgentTrace): string {
  const s = (t.outputs as { summary?: string } | undefined)?.summary ?? "";
  return s.replace(/\s+/g, " ").slice(0, 70);
}
