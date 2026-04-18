"use client";
import type { FanProfile } from "@/lib/types";

/**
 * Static SVG wayfinding map — a stylised plan of Chinnaswamy Stadium.
 * Real WebXR AR is a phase-6 upgrade (gated on Chrome/Android + HTTPS).
 */
export function WayfindScreen({ fan }: { fan: FanProfile }) {
  return (
    <div className="p-4 space-y-3">
      <div className="tile">
        <div className="tile-header">route · {fan.seat} → Gate 4 Bar</div>
        <div className="text-ink-mute text-[12px]">
          90-second queue · Kohli on strike · make it back for the over.
        </div>
      </div>

      <div className="bg-surface-low aspect-square relative overflow-hidden">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <rect x="0" y="0" width="400" height="400" fill="#0B0E15" />
          {/* outer track */}
          <circle cx="200" cy="200" r="165" fill="none" stroke="#12161F" strokeWidth="40" />
          {/* pitch */}
          <ellipse cx="200" cy="200" rx="48" ry="62" fill="#1a3a22" />
          <line x1="200" y1="150" x2="200" y2="250" stroke="#3DDC84" strokeWidth="1" opacity="0.6" />

          {/* zones */}
          <Zone id="G-2" x={186} y={30} w={30} h={16} color="#3DDC84" label="G2" />
          <Zone id="G-1" x={22} y={192} w={22} h={22} color="#3DDC84" label="G1" />
          <Zone id="G-3" x={356} y={192} w={22} h={22} color="#3DDC84" label="G3" />
          <Zone id="G-4" x={186} y={354} w={30} h={16} color="#3DDC84" label="G4" />

          <Zone id="S-A" x={120} y={50} w={160} h={50} color="#12161F" label="Stand A" />
          <Zone id="S-B" x={300} y={120} w={50} h={160} color="#12161F" label="Stand B" />
          <Zone id="S-C" x={120} y={300} w={160} h={50} color="#12161F" label="Stand C" />
          <Zone id="S-D" x={50} y={120} w={50} h={160} color="#12161F" label="Stand D" />

          {/* seat B-204 (East stand B) */}
          <circle cx="330" cy="205" r="8" fill="none" stroke="#00E5FF" strokeWidth="2">
            <animate attributeName="r" values="8;14;8" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="330" cy="205" r="4" fill="#00E5FF" />
          <text x="346" y="209" fontSize="10" fill="#00E5FF" fontFamily="monospace">
            {fan.seat}
          </text>

          {/* Gate 4 Bar target (concession west, via south concourse) */}
          <circle cx="90" cy="205" r="8" fill="#FFB547" />
          <text x="62" y="190" fontSize="10" fill="#FFB547" fontFamily="monospace" textAnchor="end">
            G4 BAR
          </text>

          {/* route: from B-204 down into concourse, across south to F-W */}
          <path
            d="M 330 205 Q 330 280 270 305 Q 200 320 130 305 Q 92 285 90 205"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3"
            strokeDasharray="6 4"
            strokeLinecap="round"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
          </path>

          <text x="200" y="392" fontSize="8" fill="#849396" fontFamily="monospace" textAnchor="middle" letterSpacing="3">
            M. CHINNASWAMY STADIUM · BENGALURU
          </text>
        </svg>

        <div className="absolute top-3 left-3 mono text-[9px] uppercase tracking-[0.18em] text-ink-fade">
          <div>WebXR AR · phase 6</div>
          <div className="text-accent-cyan mt-0.5">
            SVG fallback active
          </div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-header">turn-by-turn</div>
        <ol className="space-y-2 mt-1">
          {[
            ["start", `Leave your seat ${fan.seat}, head down 4 rows.`],
            ["turn", "Take Concourse B-south (C-12), keep right."],
            ["cross", "Cross through Concourse South past Stand C entry."],
            ["arrive", "Gate 4 Bar ahead — 90s queue."],
          ].map(([tag, txt]) => (
            <li key={tag} className="flex gap-3 items-start text-[13px]">
              <span className="mono text-[10px] uppercase tracking-wider text-accent-cyan pt-0.5">
                {tag}
              </span>
              <span className="text-ink-mute">{txt}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Zone({
  id,
  x,
  y,
  w,
  h,
  color,
  label,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label: string;
}) {
  return (
    <g key={id}>
      <rect x={x} y={y} width={w} height={h} fill={color} opacity="0.35" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="0.8" opacity="0.9" />
      <text x={x + w / 2} y={y + h / 2 + 3.5} fontSize="8" fill="#849396" fontFamily="monospace" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
