import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchScreen } from "@/components/MatchScreen";

const MATCH_PAYLOAD = {
  match_id: "RCB_vs_CSK_2026_final",
  home_team: "RCB",
  away_team: "CSK",
  innings: 2,
  over: 18.3,
  on_strike: "Kohli",
  non_striker: "Patidar",
  score: "RCB 152/3",
  target: 209,
  required: "57 from 9",
  required_rr: 9.5,
  end_of_over_in_s: 45,
};

// Preserve the real fetch (if any) and restore after each test.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("MatchScreen", () => {
  it("renders the loading state before data arrives", () => {
    globalThis.fetch = vi.fn(
      () => new Promise(() => undefined)
    ) as unknown as typeof fetch;
    render(<MatchScreen />);
    expect(screen.getByText(/loading match/i)).toBeInTheDocument();
  });

  it("renders team names, score, and batsman once SWR resolves", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => MATCH_PAYLOAD,
    })) as unknown as typeof fetch;

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText("RCB")).toBeInTheDocument();
    });
    expect(screen.getByText("CSK")).toBeInTheDocument();
    expect(screen.getByText("RCB 152/3")).toBeInTheDocument();
    expect(screen.getByText("Kohli")).toBeInTheDocument();
    expect(screen.getByText("57 from 9")).toBeInTheDocument();
  });

  it("shows the frozen-snapshot disclosure", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => MATCH_PAYLOAD,
    })) as unknown as typeof fetch;

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText(/2024 IPL final snapshot/i)).toBeInTheDocument();
    });
  });

  it("formats required run-rate to two decimal places", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => MATCH_PAYLOAD,
    })) as unknown as typeof fetch;

    render(<MatchScreen />);
    await waitFor(() => {
      expect(screen.getByText("9.50")).toBeInTheDocument();
    });
  });
});
