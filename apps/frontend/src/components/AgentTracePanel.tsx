"use client";
import { agentColor } from "@/lib/colors";
import type { AgentTrace } from "@/lib/types";

export function AgentTracePanel({ traces }: { traces: AgentTrace[] }) {
  return (
    <aside className="panel bg-surface-low border-l-0 flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <span>agent traces</span>
        <span className="mono text-ink-mute">{traces.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-surface">
        {traces.length === 0 ? (
          <div className="p-4 mono text-[11px] text-ink-fade">
            waiting for first invocation…
          </div>
        ) : (
          traces.map((t, i) => (
            <TraceRow key={t.trace_id ?? i} trace={t} enter={i === 0} />
          ))
        )}
      </div>
    </aside>
  );
}

function TraceRow({ trace, enter }: { trace: AgentTrace; enter: boolean }) {
  const chain = trace.invocation_chain ?? [];
  const cost = trace.cost_usd ?? 0;
  const tokens = trace.tokens_used ?? 0;
  const dur = trace.duration_ms ?? 0;
  const tag = trace.tag ?? "";
  const summary =
    ((trace.outputs as { summary?: string } | undefined)?.summary ?? "").slice(
      0,
      220
    );

  return (
    <div className={`px-4 py-3 ${enter ? "trace-enter" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {chain.map((a, i) => (
          <span key={`${a}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-fade text-[10px]">›</span>}
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: agentColor(a) }}
              />
              <span className="mono text-[10px] uppercase tracking-wider">
                {a}
              </span>
            </span>
          </span>
        ))}
        <span className="flex-1" />
        {tag && (
          <span className="mono text-[9px] uppercase tracking-wider text-ink-fade">
            {tag}
          </span>
        )}
      </div>
      {summary && (
        <div className="text-[11px] leading-relaxed text-ink-mute mb-2">
          {summary}
        </div>
      )}
      <div className="mono text-[9px] uppercase tracking-wider text-ink-fade flex gap-3">
        <span>{tokens.toLocaleString()} tok</span>
        <span className="text-accent-cyan">${cost.toFixed(5)}</span>
        <span>{dur}ms</span>
      </div>
    </div>
  );
}
