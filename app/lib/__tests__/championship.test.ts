import { describe, it, expect } from "vitest";
import {
  matchDriverToStanding,
  computeProjectedDriverStandings,
} from "../championship";
import type { OpenF1Driver, OpenF1Position } from "@/app/types/openf1";
import type { DriverStanding } from "@/app/types/history";

function mockOpenF1Driver(overrides: Partial<OpenF1Driver> = {}): OpenF1Driver {
  return {
    driver_number: 1,
    broadcast_name: "M VERSTAPPEN",
    full_name: "Max VERSTAPPEN",
    name_acronym: "VER",
    team_name: "Red Bull Racing",
    team_colour: "3671C6",
    first_name: "Max",
    last_name: "Verstappen",
    country_code: "NED",
    session_key: 1000,
    ...overrides,
  };
}

function mockDriverStanding(overrides: Partial<DriverStanding> = {}): DriverStanding {
  return {
    position: "1",
    positionText: "1",
    points: "100",
    wins: "3",
    Driver: {
      driverId: "verstappen",
      code: "VER",
      url: "http://example.com",
      givenName: "Max",
      familyName: "Verstappen",
      dateOfBirth: "1997-09-30",
      nationality: "Dutch",
    },
    Constructors: [
      {
        constructorId: "red_bull",
        url: "http://example.com",
        name: "Red Bull",
        nationality: "Austrian",
      },
    ],
    ...overrides,
  };
}

describe("matchDriverToStanding", () => {
  it("matches by driver code", () => {
    const driver = mockOpenF1Driver({ name_acronym: "VER" });
    const standings = [mockDriverStanding()];
    expect(matchDriverToStanding(driver, standings)).toBe(standings[0]);
  });

  it("falls back to matching by family name", () => {
    const driver = mockOpenF1Driver({ name_acronym: "MAX", last_name: "Verstappen" });
    const standing = mockDriverStanding({
      Driver: {
        ...mockDriverStanding().Driver,
        code: undefined,
      },
    });
    expect(matchDriverToStanding(driver, [standing])).toBe(standing);
  });

  it("returns null when no match found", () => {
    const driver = mockOpenF1Driver({ name_acronym: "XXX", last_name: "Nobody" });
    const standings = [mockDriverStanding()];
    expect(matchDriverToStanding(driver, standings)).toBeNull();
  });
});

describe("computeProjectedDriverStandings", () => {
  it("projects standings with race points added", () => {
    const drivers = [
      mockOpenF1Driver({ driver_number: 1, name_acronym: "VER" }),
      mockOpenF1Driver({
        driver_number: 4,
        name_acronym: "NOR",
        full_name: "Lando NORRIS",
        last_name: "Norris",
        team_name: "McLaren",
        team_colour: "FF8000",
      }),
    ];

    const positions: OpenF1Position[] = [
      { session_key: 1000, driver_number: 1, position: 1, date: "2026-03-01" },
      { session_key: 1000, driver_number: 4, position: 2, date: "2026-03-01" },
    ];

    const preRaceStandings = [
      mockDriverStanding({ position: "1", points: "100" }),
      mockDriverStanding({
        position: "2",
        points: "80",
        Driver: {
          driverId: "norris",
          code: "NOR",
          url: "http://example.com",
          givenName: "Lando",
          familyName: "Norris",
          dateOfBirth: "1999-11-13",
          nationality: "British",
        },
      }),
    ];

    const projected = computeProjectedDriverStandings(
      drivers,
      positions,
      preRaceStandings,
      false,
    );

    expect(projected).toHaveLength(2);
    // P1 gets 25 points
    expect(projected[0].projectedPoints).toBe(125);
    expect(projected[0].pointsDelta).toBe(25);
    // P2 gets 18 points
    expect(projected[1].projectedPoints).toBe(98);
    expect(projected[1].pointsDelta).toBe(18);
  });

  it("uses sprint points table when isSprint is true", () => {
    const drivers = [mockOpenF1Driver({ driver_number: 1 })];
    const positions: OpenF1Position[] = [
      { session_key: 1000, driver_number: 1, position: 1, date: "2026-03-01" },
    ];
    const standings = [mockDriverStanding({ points: "50" })];

    const projected = computeProjectedDriverStandings(drivers, positions, standings, true);

    // Sprint P1 = 8 points
    expect(projected[0].pointsDelta).toBe(8);
    expect(projected[0].projectedPoints).toBe(58);
  });

  it("assigns 0 points for positions outside the points zone", () => {
    const drivers = [mockOpenF1Driver({ driver_number: 1 })];
    const positions: OpenF1Position[] = [
      { session_key: 1000, driver_number: 1, position: 15, date: "2026-03-01" },
    ];
    const standings = [mockDriverStanding({ points: "50" })];

    const projected = computeProjectedDriverStandings(drivers, positions, standings, false);

    expect(projected[0].pointsDelta).toBe(0);
    expect(projected[0].projectedPoints).toBe(50);
  });
});
