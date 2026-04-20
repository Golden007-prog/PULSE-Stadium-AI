"use client";
import { agentColor } from "@/lib/colors";
import type { AgentTrace } from "@/lib/types";

/**
 * Streaming log of ADK invocation traces. Renders newest-first with
 * the agent chain as coloured dots, the invocation tag, the prose
 * summary, and the token / cost / duration telemetry.
 *
 * The whole panel is a live-region so screen readers announce new
 * invocations as they arrive.
 */
export function AgentTracePanel({ traces }: { traces: AgentTrace[] }) {
  const latest = traces[0];
  const latestSummary =
    ((latest?.outputs as { summary?: string } | undefined)?.summary ?? "").slice(0, 220);

  return (
    <aside
      aria-label="Live agent-trace stream"
      className="panel bg-surface-low border-l-0 flex flex-col h-full"
    >
      <header className="panel-header flex items-center justify-between">
        <span>agent traces</span>
        <span className="mono text-ink-mute" aria-label={`${traces.length} traces`}>
          {traces.length}
        </span>
      </header>

      {/* Polite live-region mirrors the newest trace summary for screen readers. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {latest
          ? `Latest trace: ${(latest.invocation_chain ?? []).join(" then ")}. ${latestSummary}`
          : "Waiting for the first agent invocation."}
      </div>

      <ol className="flex-1 overflow-y-auto divide-y divide-surface list-none p-0 m-0">
        {traces.length === 0 ? (
          <li className="p-4 mono text-[11px] text-ink-fade">
            waiting for first invocation…
          </li>
        ) : (
          traces.map((t, i) => (
            <li key={t.trace_id ?? i}>
              <TraceRow trace={t} enter={i === 0} />
            </li>
          ))
        )}
      </ol>
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
    <article
      aria-label={`Trace: ${chain.join(" then ")}${tag ? ` (${tag})` : ""}`}
      className={`px-4 py-3 ${enter ? "trace-enter" : ""}`}
    >
      <div
        aria-label="Agent invocation chain"
        className="flex items-center gap-1.5 mb-1.5"
      >
        {chain.map((a, i) => (
          <span key={`${a}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-ink-fade text-[10px]">
                ›
              </span>
            )}
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full"
                style={{ background: agentColor(a) }}
              />
              <span className="mono text-[10px] uppercase tracking-wider">
                {a}
              </span>
            </span>
          </span>
        ))}
        <span className="flex-1" aria-hidden="true" />
        {tag && (
          <span className="mono text-[9px] uppercase tracking-wider text-ink-fade">
            {tag}
          </span>
        )}
      </div>
      {summary && (
        <p className="text-[11px] leading-relaxed text-ink-mute mb-2">
          {summary}
        </p>
      )}
      <div
        aria-label="Invocation telemetry"
        className="mono text-[9px] uppercase tracking-wider text-ink-fade flex gap-3"
      >
        <span aria-label={`${tokens} tokens`}>{tokens.toLocaleString()} tok</span>
        <span className="text-accent-cyan" aria-label={`${cost.toFixed(5)} dollars`}>
          ${cost.toFixed(5)}
        </span>
        <span aria-label={`${dur} milliseconds`}>{dur}ms</span>
      </div>
    </article>
  );
}
