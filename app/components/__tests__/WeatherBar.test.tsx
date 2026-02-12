import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WeatherBar from "../live/WeatherBar";
import type { OpenF1Weather } from "@/app/types/openf1";

const mockWeather: OpenF1Weather = {
  session_key: 1000,
  date: "2026-03-01T14:00:00Z",
  air_temperature: 25.3,
  track_temperature: 42.7,
  humidity: 55,
  pressure: 1013,
  rainfall: 0,
  wind_direction: 180,
  wind_speed: 12.5,
};

describe("WeatherBar", () => {
  it("renders weather data when provided", () => {
    render(<WeatherBar weather={mockWeather} />);

    expect(screen.getByText("42.7°C")).toBeInTheDocument();
    expect(screen.getByText("25.3°C")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("shows wind speed and cardinal direction", () => {
    render(<WeatherBar weather={mockWeather} />);
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders empty state when weather is null", () => {
    const { container } = render(<WeatherBar weather={null} />);
    // Should render a placeholder div, not weather data
    expect(screen.queryByText("Track")).not.toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it("shows rain badge when rainfall > 0", () => {
    const rainyWeather = { ...mockWeather, rainfall: 2 };
    render(<WeatherBar weather={rainyWeather} />);
    expect(screen.getByText("Rain")).toBeInTheDocument();
  });

  it("hides rain badge when rainfall is 0", () => {
    render(<WeatherBar weather={mockWeather} />);
    expect(screen.queryByText("Rain")).not.toBeInTheDocument();
  });
});
