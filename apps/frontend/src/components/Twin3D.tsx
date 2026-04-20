"use client";
import { useMemo } from "react";
import { projectLatLng } from "@/lib/geo";
import { densityColor, densityLabel } from "@/lib/colors";
import type { Zone } from "@/lib/types";

export type TwinVariant = "reality" | "counterfactual";

type Point = { x: number; y: number };

function projectZone(zone: Zone): Point[] {
  return (zone.polygon ?? []).map((pt) => {
    const { x, z } = projectLatLng(pt.lat, pt.lng);
    return { x, y: z };
  });
}

function zoneCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const sx = points.reduce((a, p) => a + p.x, 0);
  const sy = points.reduce((a, p) => a + p.y, 0);
  return { x: sx / points.length, y: sy / points.length };
}

function polygonPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest
    .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ")} Z`;
}

/** SVG-based 2D digital twin of Chinnaswamy stadium with per-zone density shading. */
export default function Twin3D({
  zones,
  variant = "reality",
}: {
  zones: Zone[];
  variant?: TwinVariant;
  autoRotate?: boolean;
}) {
  const isCf = variant === "counterfactual";

  const projected = useMemo(
    () =>
      zones
        .filter((z) => (z.polygon?.length ?? 0) >= 3)
        .map((z) => {
          const pts = projectZone(z);
          return {
            zone: z,
            points: pts,
            centroid: zoneCentroid(pts),
            color: densityColor(z.current_density ?? 0),
            label: densityLabel(z.current_density ?? 0),
          };
        }),
    [zones]
  );

  const bounds = useMemo(() => {
    if (projected.length === 0) {
      return { minX: -220, minY: -220, width: 440, height: 440 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const { points } of projected) {
      for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    const pad = 40;
    return {
      minX: minX - pad,
      minY: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }, [projected]);

  const bg = isCf ? "#0D0A18" : "#0A0D14";
  const pitchFill = isCf ? "#120c1e" : "#0f1d14";
  const pitchRing = isCf ? "#2a1f44" : "#1a3a22";
  const gridStroke = isCf ? "#2a1f44" : "#1A1F2B";
  const zoneStroke = isCf ? "rgba(155,108,255,0.55)" : "rgba(0,229,255,0.55)";
  const labelColor = isCf ? "#C8BAFF" : "#BAC9CC";

  return (
    <div
      className="relative w-full h-full"
      style={{ background: bg }}
      role="img"
      aria-label={
        isCf
          ? "Counterfactual 2D stadium map — no interventions"
          : "Reality 2D stadium map — PULSE active"
      }
    >
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id={`grid-${variant}`}
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke={gridStroke}
              strokeWidth="0.5"
              opacity="0.6"
            />
          </pattern>
        </defs>
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill={`url(#grid-${variant})`}
        />
        <ellipse cx={0} cy={0} rx={52} ry={40} fill={pitchFill} stroke={pitchRing} strokeWidth={1.2} />
        <ellipse cx={0} cy={0} rx={48} ry={36} fill="none" stroke={pitchRing} strokeWidth={0.6} opacity={0.75} />

        {projected.map(({ zone, points, centroid, color, label }) => {
          const density = zone.current_density ?? 0;
          return (
            <g key={zone.id}>
              <path
                d={polygonPath(points)}
                fill={color}
                fillOpacity={Math.min(0.22 + density * 0.12, 0.85)}
                stroke={zoneStroke}
                strokeWidth={0.8}
              />
              <text
                x={centroid.x}
                y={centroid.y}
                fontSize={5.5}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill={labelColor}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {zone.id}
              </text>
              <text
                x={centroid.x}
                y={centroid.y + 7}
                fontSize={3.8}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill={labelColor}
                opacity={0.65}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {density.toFixed(1)} p/m² · {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
