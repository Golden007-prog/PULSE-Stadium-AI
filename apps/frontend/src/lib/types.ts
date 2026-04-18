export type ZoneType =
  | "gate"
  | "seating"
  | "concourse"
  | "concession"
  | "restroom";

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  capacity: number;
  current_density: number;
  polygon: Array<{ lat: number; lng: number }>;
  tags?: string[];
  last_update_note?: string;
}

export interface Intervention {
  id: string;
  initiating_agent: string;
  action: string;
  target: string;
  reason: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at?: number | null;
}

export interface AgentTrace {
  trace_id: string;
  root_agent: string;
  invocation_chain: string[];
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  tag?: string;
  timestamp?: number | null;
}

export interface Venue {
  name: string;
  city: string;
  capacity: number;
  center_lat: number;
  center_lng: number;
}

export interface OrchestratorState {
  running: boolean;
  ticks: number;
  invocations: number;
  total_invocations: number;
  total_usd: number;
  budget_paused: boolean;
  last_summary: string | null;
  attendance_counted: number;
  fan_queries_pending: number;
  anomalies_seen: number;
  alerts_seen: number;
}
