"use client";
import useSWR from "swr";
import type { QueueInfo } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Live queue ETA board with suggested reroutes from the Queue agent. */
export function QueuesScreen() {
  const { data } = useSWR<{ queues: QueueInfo[] }>("/api/queues", fetcher, {
    refreshInterval: 5000,
  });
  const queues = (data?.queues ?? []).slice().sort((a, b) => a.wait_s - b.wait_s);

  const shortest = queues[0];
  const liveSummary = shortest
    ? `Shortest wait: ${shortest.queue_id.replace(/-/g, " ")}, ${shortest.wait_s} seconds.`
    : "Loading live queues.";

  return (
    <div className="p-4 space-y-3">
      <div className="tile">
        <div className="tile-header">live queues</div>
        <div className="text-ink-mute text-[12px]">
          Auto-sorted by wait. Tap any row to let Concierge book you a slot (phase 5).
        </div>
      </div>

      {/* Polite live region — screen readers announce the shortest wait
          whenever the list refreshes. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveSummary}
      </div>

      <ul
        aria-label={`${queues.length} live queues sorted by wait time`}
        className="space-y-3 list-none p-0"
      >
        {queues.map((q) => (
          <li key={q.queue_id}>
            <QueueRow q={q} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function QueueRow({ q }: { q: QueueInfo }) {
  const level =
    q.wait_s <= 90
      ? { color: "#3DDC84", label: "fast" }
      : q.wait_s <= 180
      ? { color: "#FFB547", label: "busy" }
      : { color: "#FF5252", label: "avoid" };
  const mins = Math.round(q.wait_s / 60);
  const prettyName = q.queue_id.replace(/-/g, " ");
  const waitText = mins < 1 ? `${q.wait_s} seconds` : `${mins} minutes`;
  return (
    <div
      className="tile flex items-center gap-3"
      style={{ borderLeft: `3px solid ${level.color}` }}
      aria-label={`${prettyName}, ${level.label} — ${waitText} wait`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[15px] capitalize">{prettyName}</span>
          <span
            className="mono text-[9px] uppercase tracking-wider px-1.5 py-0.5"
            style={{ background: level.color, color: "#0A0D14" }}
            aria-label={`status ${level.label}`}
          >
            {level.label}
          </span>
        </div>
        <div className="mono text-[11px] text-ink-fade mt-0.5">
          <span className="sr-only">Zone </span>
          zone {q.zone} · {q.items.join(", ")}
          {q.staff ? ` · ${q.staff} staff` : ""}
        </div>
      </div>
      <div className="text-right">
        <div
          className="mono text-xl text-ink"
          style={{ color: level.color }}
          aria-hidden="true"
        >
          {mins < 1 ? `${q.wait_s}s` : `${mins}m`}
        </div>
        <div className="mono text-[9px] uppercase tracking-wider text-ink-fade">
          wait
        </div>
      </div>
    </div>
  );
}
