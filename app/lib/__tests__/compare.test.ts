import { describe, it, expect } from "vitest";
import {
  cleanLapTimes,
  stdDev,
  computeDriverMetrics,
  computeComparison,
} from "../compare";
import type { TelemetryLap, TelemetrySession } from "@/app/types/telemetry";

function mockLap(overrides: Partial<TelemetryLap> = {}): TelemetryLap {
  return {
    driverNumber: 1,
    lapNumber: 1,
    lapTime: 90.0,
    sector1: 28.0,
    sector2: 32.0,
    sector3: 30.0,
    speedI1: null,
    speedI2: null,
    speedFL: null,
    speedST: null,
    compound: "MEDIUM",
    tyreLife: 5,
    freshTyre: null,
    stint: null,
    position: null,
    trackStatus: null,
    isPersonalBest: null,
    isAccurate: null,
    deleted: null,
    deletedReason: null,
    isPitOutLap: false,
    isPitInLap: false,
    ...overrides,
  };
}

describe("cleanLapTimes", () => {
  it("filters out pit in/out laps", () => {
    const laps = [
      mockLap({ lapNumber: 1, isPitOutLap: true }),
      mockLap({ lapNumber: 2 }),
      mockLap({ lapNumber: 3, isPitInLap: true }),
    ];
    const clean = cleanLapTimes(laps);
    expect(clean).toHaveLength(1);
    expect(clean[0].lapNumber).toBe(2);
  });

  it("filters out null lap times", () => {
    const laps = [
      mockLap({ lapNumber: 1, lapTime: null }),
      mockLap({ lapNumber: 2, lapTime: 90.0 }),
    ];
    const clean = cleanLapTimes(laps);
    expect(clean).toHaveLength(1);
  });

  it("filters outliers beyond 1.5x median", () => {
    const laps = [
      mockLap({ lapNumber: 1, lapTime: 90.0 }),
      mockLap({ lapNumber: 2, lapTime: 91.0 }),
      mockLap({ lapNumber: 3, lapTime: 89.5 }),
      mockLap({ lapNumber: 4, lapTime: 200.0 }), // outlier
    ];
    const clean = cleanLapTimes(laps);
    expect(clean).toHaveLength(3);
    expect(clean.find((l) => l.lapTime === 200.0)).toBeUndefined();
  });

  it("returns empty array for empty input", () => {
    expect(cleanLapTimes([])).toEqual([]);
  });
});

describe("stdDev", () => {
  it("returns 0 for a single value", () => {
    expect(stdDev([42])).toBe(0);
  });

  it("returns 0 for identical values", () => {
    expect(stdDev([10, 10, 10])).toBe(0);
  });

  it("computes correct standard deviation", () => {
    const result = stdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.138, 2);
  });

  it("returns 0 for empty input", () => {
    expect(stdDev([])).toBe(0);
  });
});

describe("computeDriverMetrics", () => {
  const session: TelemetrySession = {
    year: 2025,
    round: 1,
    eventName: "Test GP",
    sessionType: "Race",
    circuitName: "Test Circuit",
    country: "Testland",
    drivers: [
      {
        number: 1,
        abbreviation: "VER",
        fullName: "Max Verstappen",
        teamName: "Red Bull",
        teamColor: "#3671C6",
        position: 1,
        classifiedPosition: "1",
        gridPosition: 1,
        status: "Finished",
        points: 25,
        time: null,
        q1: null,
        q2: null,
        q3: null,
      },
    ],
    lapData: [
      mockLap({ driverNumber: 1, lapNumber: 1, lapTime: 90.0 }),
      mockLap({ driverNumber: 1, lapNumber: 2, lapTime: 89.5 }),
      mockLap({ driverNumber: 1, lapNumber: 3, lapTime: 91.0 }),
    ],
    telemetryData: [
      {
        driverNumber: 1,
        lapNumber: 2,
        distance: [0, 500, 1000],
        speed: [200, 300, 280],
        throttle: [100, 100, 80],
        brake: [false, false, true],
      },
    ],
    stintData: [
      { driverNumber: 1, stintNumber: 1, compound: "MEDIUM", freshTyre: null, lapStart: 1, lapEnd: 3 },
    ],
  };

  it("extracts basic metrics", () => {
    const metrics = computeDriverMetrics(session, 1);
    expect(metrics.abbreviation).toBe("VER");
    expect(metrics.finishPosition).toBe(1);
    expect(metrics.gridPosition).toBe(1);
    expect(metrics.positionsGained).toBe(0);
  });

  it("computes fastest lap from clean laps", () => {
    const metrics = computeDriverMetrics(session, 1);
    expect(metrics.fastestLap).toBe(89.5);
  });

  it("computes best sectors", () => {
    const metrics = computeDriverMetrics(session, 1);
    expect(metrics.bestSector1).toBe(28.0);
    expect(metrics.bestSector2).toBe(32.0);
    expect(metrics.bestSector3).toBe(30.0);
  });

  it("computes top speed from telemetry", () => {
    const metrics = computeDriverMetrics(session, 1);
    expect(metrics.topSpeed).toBe(300);
  });

  it("counts stints", () => {
    const metrics = computeDriverMetrics(session, 1);
    expect(metrics.stints).toHaveLength(1);
  });
});

describe("computeComparison", () => {
  const session: TelemetrySession = {
    year: 2025,
    round: 1,
    eventName: "Test GP",
    sessionType: "Race",
    circuitName: "Test Circuit",
    country: "Testland",
    drivers: [
      {
        number: 1,
        abbreviation: "VER",
        fullName: "Max Verstappen",
        teamName: "Red Bull",
        teamColor: "#3671C6",
        position: 1,
        classifiedPosition: "1",
        gridPosition: 2,
        status: "Finished",
        points: 25,
        time: null,
        q1: null,
        q2: null,
        q3: null,
      },
      {
        number: 4,
        abbreviation: "NOR",
        fullName: "Lando Norris",
        teamName: "McLaren",
        teamColor: "#FF8000",
        position: 2,
        classifiedPosition: "2",
        gridPosition: 1,
        status: "Finished",
        points: 18,
        time: null,
        q1: null,
        q2: null,
        q3: null,
      },
    ],
    lapData: [
      mockLap({ driverNumber: 1, lapNumber: 1, lapTime: 90.0, sector1: 28.0, sector2: 32.0, sector3: 30.0 }),
      mockLap({ driverNumber: 1, lapNumber: 2, lapTime: 89.5, sector1: 27.5, sector2: 31.8, sector3: 30.2 }),
      mockLap({ driverNumber: 4, lapNumber: 1, lapTime: 90.5, sector1: 28.5, sector2: 32.0, sector3: 30.0 }),
      mockLap({ driverNumber: 4, lapNumber: 2, lapTime: 90.0, sector1: 28.0, sector2: 31.5, sector3: 30.5 }),
    ],
    telemetryData: [
      {
        driverNumber: 1,
        lapNumber: 2,
        distance: [0, 1000, 2000, 3000],
        speed: [200, 300, 280, 250],
        throttle: [100, 100, 80, 60],
        brake: [false, false, true, false],
      },
      {
        driverNumber: 4,
        lapNumber: 2,
        distance: [0, 1000, 2000, 3000],
        speed: [195, 310, 275, 245],
        throttle: [100, 100, 75, 55],
        brake: [false, false, true, true],
      },
    ],
    stintData: [
      { driverNumber: 1, stintNumber: 1, compound: "MEDIUM", freshTyre: null, lapStart: 1, lapEnd: 2 },
      { driverNumber: 4, stintNumber: 1, compound: "SOFT", freshTyre: null, lapStart: 1, lapEnd: 2 },
    ],
  };

  it("returns a full ComparisonResult", () => {
    const result = computeComparison(session, 1, 4);

    expect(result.driverA.abbreviation).toBe("VER");
    expect(result.driverB.abbreviation).toBe("NOR");
  });

  it("computes radar data with 5 axes", () => {
    const result = computeComparison(session, 1, 4);
    expect(result.radarData).toHaveLength(5);
    const axes = result.radarData.map((r) => r.metric);
    expect(axes).toEqual(["Pace", "Consistency", "Top Speed", "Qualifying", "Tire Mgmt"]);
  });

  it("computes sector deltas (positive = A faster)", () => {
    const result = computeComparison(session, 1, 4);
    // A best S1 = 27.5, B best S1 = 28.0 → delta = 0.5
    expect(result.sectorDelta.s1).toBeCloseTo(0.5, 1);
  });

  it("builds lap overlay data", () => {
    const result = computeComparison(session, 1, 4);
    expect(result.lapOverlayData.length).toBeGreaterThan(0);
  });

  it("builds trace overlay data from telemetry", () => {
    const result = computeComparison(session, 1, 4);
    expect(result.traceOverlayData.length).toBeGreaterThan(0);
  });

  it("computes driving DNA for both drivers", () => {
    const result = computeComparison(session, 1, 4);
    expect(result.drivingDNA).toHaveLength(2);
    expect(result.drivingDNA[0].abbreviation).toBe("VER");
    expect(result.drivingDNA[1].abbreviation).toBe("NOR");
  });
});
