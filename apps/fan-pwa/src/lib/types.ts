export interface MatchState {
  match_id: string;
  home_team: string;
  away_team: string;
  innings: number;
  over: number;
  on_strike: string;
  non_striker?: string;
  score: string;
  required_rr?: number;
  end_of_over_in_s?: number;
  target?: number;
  required?: string;
}

export interface QueueInfo {
  queue_id: string;
  zone: string;
  wait_s: number;
  staff?: number;
  items: string[];
}

export interface Nudge {
  id: string;
  kind: "delight" | "safety" | "queue";
  title: string;
  body: string;
  created_at: number;
}

export interface ChatTurn {
  role: "fan" | "concierge";
  text: string;
  ts: number;
  traceId?: string;
  chain?: string[];
  cost?: number;
}

export interface FanProfile {
  fan_id: string;
  display_name: string;
  seat: string;
  language: string;
}
