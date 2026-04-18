"use client";
import type { Intervention } from "@/lib/types";
import { agentColor } from "@/lib/colors";

export function InterventionsStrip({
  interventions,
}: {
  interventions: Intervention[];
}) {
  const recent = interventions.slice(0, 3);
  if (recent.length === 0) return null;
  return (
    <div className="absolute top-3 left-3 right-3 pointer-events-none flex flex-col gap-2">
      {recent.map((x, i) => (
        <div
          key={x.id}
          className="bg-surface/85 backdrop-blur-sm px-3 py-2 max-w-xl pointer-events-auto"
          style={{
            borderLeft: `3px solid ${agentColor(x.initiating_agent)}`,
            opacity: 1 - i * 0.3,
          }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="mono text-[10px] uppercase tracking-wider text-accent-cyan">
              {x.action.replace(/_/g, " ")}
            </span>
            <span className="mono text-[10px] uppercase tracking-wider text-ink-fade">
              · {x.initiating_agent}
            </span>
            <span className="mono text-[10px] uppercase tracking-wider text-ink-fade ml-auto">
              → {x.target}
            </span>
          </div>
          <div className="text-[11px] leading-snug text-ink-mute line-clamp-2">
            {x.reason}
          </div>
        </div>
      ))}
    </div>
  );
}
