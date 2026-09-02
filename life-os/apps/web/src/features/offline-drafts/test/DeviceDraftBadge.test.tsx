import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeviceDraftBadge } from "../components/DeviceDraftBadge";

describe("DeviceDraftBadge component (LOS-1312)", () => {
  it("renders with default 'Device draft' text and role='status'", () => {
    render(<DeviceDraftBadge />);

    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(screen.getByText("Device draft")).toBeInTheDocument();
  });

  it("renders custom label override", () => {
    render(<DeviceDraftBadge label="Draft saved locally" />);

    expect(screen.getByText("Draft saved locally")).toBeInTheDocument();
  });

  it("renders formatted timestamp when provided", () => {
    const iso = new Date(2026, 8, 2, 14, 30).toISOString();
    render(<DeviceDraftBadge lastSavedAt={iso} showTimestamp={true} />);

    expect(screen.getByText(/Saved locally/i)).toBeInTheDocument();
  });

  it("hides timestamp subtext when showTimestamp is false", () => {
    const iso = new Date(2026, 8, 2, 14, 30).toISOString();
    render(<DeviceDraftBadge lastSavedAt={iso} showTimestamp={false} />);

    expect(screen.queryByText(/Saved locally/i)).not.toBeInTheDocument();
  });
});
