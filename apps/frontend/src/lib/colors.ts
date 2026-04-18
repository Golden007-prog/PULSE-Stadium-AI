export const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#00E5FF",
  flow: "#3DDC84",
  queue: "#FFB547",
  concierge: "#9B6CFF",
  care: "#FF8A3E",
  safety: "#FF5252",
  experience: "#E9C36B",
  revenue: "#43E188",
};

export function agentColor(id: string): string {
  return AGENT_COLORS[id] ?? "#BAC9CC";
}

/** Green → Amber → Red ramp for density (people / m²). */
export function densityColor(d: number): string {
  if (d < 1.0) return "#2EB578";
  if (d < 2.0) return "#3DDC84";
  if (d < 3.0) return "#9DE83E";
  if (d < 3.8) return "#FFB547";
  if (d < 4.8) return "#FF8A3E";
  return "#FF5252";
}

/** Returns a descriptive label for a density band. */
export function densityLabel(d: number): string {
  if (d < 1.0) return "calm";
  if (d < 2.0) return "nominal";
  if (d < 3.0) return "busy";
  if (d < 3.8) return "tight";
  if (d < 4.8) return "warning";
  return "crush risk";
}
