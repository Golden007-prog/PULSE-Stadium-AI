import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TabBar } from "@/components/TabBar";

describe("TabBar", () => {
  it("renders all five tabs with labels", () => {
    render(<TabBar active="concierge" onChange={() => undefined} />);
    for (const label of ["Ask", "Queues", "Route", "Nudges", "Match"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("invokes onChange with the tab id when tapped", () => {
    const onChange = vi.fn();
    render(<TabBar active="concierge" onChange={onChange} />);
    fireEvent.click(screen.getByText("Queues"));
    expect(onChange).toHaveBeenCalledWith("queues");
    fireEvent.click(screen.getByText("Match"));
    expect(onChange).toHaveBeenCalledWith("match");
  });

  it("visually marks the active tab via a cyan top border", () => {
    const { rerender } = render(
      <TabBar active="concierge" onChange={() => undefined} />
    );
    // The active tab wraps its icon+label in a <button> with a cyan top border
    const askTab = screen.getByText("Ask").closest("button");
    expect(askTab).not.toBeNull();
    expect(askTab?.getAttribute("style") ?? "").toContain("2px solid #00E5FF");

    // Switch active tab; Ask no longer has the cyan border
    rerender(<TabBar active="match" onChange={() => undefined} />);
    const askTabInactive = screen.getByText("Ask").closest("button");
    expect(askTabInactive?.getAttribute("style") ?? "").toContain(
      "2px solid transparent"
    );
  });
});
