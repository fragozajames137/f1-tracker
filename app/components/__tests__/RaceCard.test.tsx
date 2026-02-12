import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RaceCard from "../RaceCard";
import type { Race } from "@/app/types";

// Mock next/image to render a plain img
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

const mockRace: Race = {
  season: "2026",
  round: "1",
  url: "http://example.com",
  raceName: "Australian Grand Prix",
  Circuit: {
    circuitId: "albert_park",
    url: "http://example.com",
    circuitName: "Albert Park Grand Prix Circuit",
    Location: {
      lat: "-37.8497",
      long: "144.968",
      locality: "Melbourne",
      country: "Australia",
    },
  },
  date: "2026-03-15",
  time: "05:00:00Z",
  FirstPractice: { date: "2026-03-13", time: "01:30:00Z" },
  Qualifying: { date: "2026-03-14", time: "06:00:00Z" },
};

describe("RaceCard", () => {
  it("renders race name and circuit info", () => {
    render(<RaceCard race={mockRace} isNext={false} />);

    expect(screen.getByText("Australian Grand Prix")).toBeInTheDocument();
    expect(screen.getByText(/Albert Park/)).toBeInTheDocument();
  });

  it("shows round number", () => {
    render(<RaceCard race={mockRace} isNext={false} />);
    expect(screen.getByText(/^R1$/)).toBeInTheDocument();
  });

  it("expands by default when isNext is true", () => {
    render(<RaceCard race={mockRace} isNext={true} />);

    // Should show session list
    expect(screen.getByText("FP1")).toBeInTheDocument();
    expect(screen.getByText("Qualifying")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
  });

  it("collapses by default when isNext is false", () => {
    render(<RaceCard race={mockRace} isNext={false} />);

    // Session list should not be visible
    expect(screen.queryByText("FP1")).not.toBeInTheDocument();
  });

  it("toggles expanded state on click", async () => {
    const user = userEvent.setup();
    render(<RaceCard race={mockRace} isNext={false} />);

    // Initially collapsed
    expect(screen.queryByText("FP1")).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("FP1")).toBeInTheDocument();

    // Click to collapse
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("FP1")).not.toBeInTheDocument();
  });

  it("shows Next badge when isNext is true", () => {
    render(<RaceCard race={mockRace} isNext={true} />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("shows Sprint badge when sprint session exists", () => {
    const sprintRace = {
      ...mockRace,
      Sprint: { date: "2026-03-14", time: "04:30:00Z" },
    };
    render(<RaceCard race={sprintRace} isNext={false} />);
    expect(screen.getByText("Sprint")).toBeInTheDocument();
  });
});
