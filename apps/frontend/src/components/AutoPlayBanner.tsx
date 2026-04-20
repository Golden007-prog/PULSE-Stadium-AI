"use client";

interface Props {
  elapsedMs: number;
  totalMs: number;
  running: boolean;
  onReset: () => void;
  onSkip: () => void;
}

export function AutoPlayBanner({
  elapsedMs,
  totalMs,
  running,
  onReset,
  onSkip,
}: Props) {
  const progress = Math.min(1, elapsedMs / totalMs);
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-surface-low/95 backdrop-blur-sm px-4 py-2.5 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            running ? "bg-accent-cyan pulse-dot" : "bg-ink-fade"
          }`}
        />
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-accent-cyan">
          {running ? "demo playing" : "demo complete"}
        </span>
      </div>
      <div className="flex items-center gap-3 mono text-[11px]">
        <span className="text-ink">T+{fmt(elapsedMs)}</span>
        <span className="text-ink-fade">/</span>
        <span className="text-ink-fade">T+{fmt(totalMs)}</span>
      </div>
      <div className="flex-1 h-1 bg-surface-dim relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent-cyan transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <button
        onClick={onSkip}
        className="mono text-[10px] uppercase tracking-wider text-ink-fade hover:text-accent-cyan"
      >
        skip to end →
      </button>
      <button
        onClick={onReset}
        className="mono text-[10px] uppercase tracking-wider px-2 py-1 bg-surface text-ink hover:bg-surface-high"
      >
        ⟳ reset
      </button>
    </div>
  );
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
