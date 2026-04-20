import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Onboarding } from "@/components/Onboarding";

describe("Onboarding", () => {
  it("renders the hero and default field values", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);

    // Title + CTA
    expect(screen.getByText(/PULSE/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enter the stadium/i })
    ).toBeInTheDocument();

    // Pre-filled defaults for the demo fan
    expect(screen.getByDisplayValue("Raj")).toBeInTheDocument();
    expect(screen.getByDisplayValue("B-204")).toBeInTheDocument();
  });

  it("constructs a fan_id from name + seat on submit", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);

    const submit = screen.getByRole("button", { name: /enter the stadium/i });
    fireEvent.click(submit);

    expect(onDone).toHaveBeenCalledTimes(1);
    const profile = onDone.mock.calls[0][0];
    expect(profile.display_name).toBe("Raj");
    expect(profile.seat).toBe("B-204");
    expect(profile.fan_id).toBe("raj-b-204");
    expect(profile.language).toBe("en-IN");
  });

  it("disables submit when name or seat is cleared", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);

    const nameInput = screen.getByDisplayValue("Raj");
    fireEvent.change(nameInput, { target: { value: "" } });

    const submit = screen.getByRole("button", { name: /enter the stadium/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(onDone).not.toHaveBeenCalled();
  });
});
