import type {
  TelemetrySession,
  TelemetryLap,
  TelemetryStint,
  TelemetrySpeedTrace,
} from "@/app/types/telemetry";

// ── Types ───────────────────────────────────────────────────────────────

export interface DriverMetrics {
  driverNumber: number;
  abbreviation: string;
  teamColor: string;
  finishPosition: number | null;
  gridPosition: number | null;
  positionsGained: number | null;
  fastestLap: number | null;
  bestSector1: number | null;
  bestSector2: number | null;
  bestSector3: number | null;
  averagePace: number | null;
  consistency: number | null; // stddev of clean lap times
  topSpeed: number | null;
  pitStopCount: number;
  stints: TelemetryStint[];
}

export interface LapOverlayPoint {
  lap: number;
  driverA: number | null;
  driverB: number | null;
  driverAPit?: boolean;
  driverBPit?: boolean;
}

export interface SectorDelta {
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

export interface RadarPoint {
  metric: string;
  driverA: number;
  driverB: number;
  fullMark: number;
}

export interface GapDeltaPoint {
  progress: number;
  delta: number;
  deltaPositive: number;
  deltaNegative: number;
}

export interface DrivingDNABreakdown {
  driverNumber: number;
  abbreviation: string;
  teamColor: string;
  fullThrottle: number;
  partialThrottle: number;
  braking: number;
  coasting: number;
  drsUsage: number | null;
}

export interface TraceOverlayPoint {
  progress: number;
  speedA: number;
  speedB: number;
  throttleA: number;
  throttleB: number;
  brakeA: number;
  brakeB: number;
  drsA: number | null;
  drsB: number | null;
}

export interface SectorTableRow {
  sector: "S1" | "S2" | "S3";
  bestA: number | null;
  bestB: number | null;
  delta: number | null;
  avgTimeA: number | null;
  avgTimeB: number | null;
}

export interface ComparisonResult {
  driverA: DriverMetrics;
  driverB: DriverMetrics;
  lapOverlayData: LapOverlayPoint[];
  sectorDelta: SectorDelta;
  radarData: RadarPoint[];
  gapDeltaData: GapDeltaPoint[];
  drivingDNA: [DrivingDNABreakdown, DrivingDNABreakdown];
  traceOverlayData: TraceOverlayPoint[];
  sectorTableData: SectorTableRow[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function cleanLapTimes(laps: TelemetryLap[]): TelemetryLap[] {
  const valid = laps.filter(
    (l) => l.lapTime !== null && !l.isPitOutLap && !l.isPitInLap,
  );
  if (valid.length === 0) return [];

  const sorted = valid
    .map((l) => l.lapTime as number)
    .sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const cutoff = median * 1.5;

  return valid.filter((l) => (l.lapTime as number) <= cutoff);
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ── Metric Extraction ───────────────────────────────────────────────────

export function computeDriverMetrics(
  session: TelemetrySession,
  driverNumber: number,
): DriverMetrics {
  const driver = session.drivers.find((d) => d.number === driverNumber);
  const allLaps = session.lapData.filter(
    (l) => l.driverNumber === driverNumber,
  );
  const cleanLaps = cleanLapTimes(allLaps);
  const cleanTimes = cleanLaps
    .map((l) => l.lapTime)
    .filter((t): t is number => t !== null);

  // Best sectors from ALL laps with valid sector data
  const sectors1 = allLaps
    .map((l) => l.sector1)
    .filter((s): s is number => s !== null);
  const sectors2 = allLaps
    .map((l) => l.sector2)
    .filter((s): s is number => s !== null);
  const sectors3 = allLaps
    .map((l) => l.sector3)
    .filter((s): s is number => s !== null);

  // Top speed from telemetry data
  const traces = session.telemetryData.filter(
    (t) => t.driverNumber === driverNumber,
  );
  const allSpeeds = traces.flatMap((t) => t.speed);
  const topSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : null;

  // Pit stop count
  const pitStopCount = allLaps.filter((l) => l.isPitInLap).length;

  // Stints
  const stints = session.stintData.filter(
    (s) => s.driverNumber === driverNumber,
  );

  const finishPosition = driver?.position ?? null;
  const gridPosition = driver?.gridPosition ?? null;

  return {
    driverNumber,
    abbreviation: driver?.abbreviation ?? `#${driverNumber}`,
    teamColor: driver?.teamColor ?? "#666",
    finishPosition,
    gridPosition,
    positionsGained:
      gridPosition !== null && finishPosition !== null
        ? gridPosition - finishPosition
        : null,
    fastestLap: cleanTimes.length > 0 ? Math.min(...cleanTimes) : null,
    bestSector1: sectors1.length > 0 ? Math.min(...sectors1) : null,
    bestSector2: sectors2.length > 0 ? Math.min(...sectors2) : null,
    bestSector3: sectors3.length > 0 ? Math.min(...sectors3) : null,
    averagePace:
      cleanTimes.length > 0
        ? cleanTimes.reduce((s, v) => s + v, 0) / cleanTimes.length
        : null,
    consistency: cleanTimes.length >= 2 ? stdDev(cleanTimes) : null,
    topSpeed,
    pitStopCount,
    stints,
  };
}

// ── New Computation Functions ────────────────────────────────────────────

export function computeGapDelta(
  traceA: TelemetrySpeedTrace,
  traceB: TelemetrySpeedTrace,
): GapDeltaPoint[] {
  const len = Math.min(
    traceA.distance.length,
    traceB.distance.length,
    traceA.speed.length,
    traceB.speed.length,
  );
  if (len < 2) return [];

  const totalDistA = traceA.distance[len - 1] - traceA.distance[0];
  const points: GapDeltaPoint[] = [];
  let cumDelta = 0;

  for (let i = 0; i < len - 1; i++) {
    const segDistA = traceA.distance[i + 1] - traceA.distance[i];
    const segDistB = traceB.distance[i + 1] - traceB.distance[i];
    if (segDistA <= 0 && segDistB <= 0) continue;

    // Average speed in m/s for each driver over this segment
    const avgSpeedA = ((traceA.speed[i] + traceA.speed[i + 1]) / 2) / 3.6;
    const avgSpeedB = ((traceB.speed[i] + traceB.speed[i + 1]) / 2) / 3.6;

    if (avgSpeedA > 0 && avgSpeedB > 0) {
      const dtA = segDistA / avgSpeedA;
      const dtB = segDistB / avgSpeedB;
      cumDelta += dtB - dtA; // positive = A ahead
    }

    const progress = totalDistA > 0
      ? ((traceA.distance[i] - traceA.distance[0]) / totalDistA) * 100
      : (i / (len - 1)) * 100;

    points.push({
      progress: Math.round(progress * 100) / 100,
      delta: Math.round(cumDelta * 1000) / 1000,
      deltaPositive: cumDelta > 0 ? Math.round(cumDelta * 1000) / 1000 : 0,
      deltaNegative: cumDelta < 0 ? Math.round(cumDelta * 1000) / 1000 : 0,
    });
  }

  return points;
}

export function computeDrivingDNA(
  trace: TelemetrySpeedTrace,
  driverInfo: { driverNumber: number; abbreviation: string; teamColor: string },
): DrivingDNABreakdown {
  const len = Math.min(
    trace.distance.length,
    trace.speed.length,
    trace.throttle.length,
    trace.brake.length,
  );

  let totalDist = 0;
  let fullThrottleDist = 0;
  let partialDist = 0;
  let brakingDist = 0;
  let coastingDist = 0;
  let drsDist = 0;

  const hasDrs = trace.drs && trace.drs.length >= len;

  for (let i = 0; i < len - 1; i++) {
    const segDist = trace.distance[i + 1] - trace.distance[i];
    if (segDist <= 0) continue;
    totalDist += segDist;

    if (trace.brake[i]) {
      brakingDist += segDist;
    } else if (trace.throttle[i] >= 90) {
      fullThrottleDist += segDist;
    } else if (trace.throttle[i] > 0) {
      partialDist += segDist;
    } else {
      coastingDist += segDist;
    }

    if (hasDrs && trace.drs![i]) {
      drsDist += segDist;
    }
  }

  const pct = (v: number) =>
    totalDist > 0 ? Math.round((v / totalDist) * 1000) / 10 : 0;

  return {
    driverNumber: driverInfo.driverNumber,
    abbreviation: driverInfo.abbreviation,
    teamColor: driverInfo.teamColor,
    fullThrottle: pct(fullThrottleDist),
    partialThrottle: pct(partialDist),
    braking: pct(brakingDist),
    coasting: pct(coastingDist),
    drsUsage: hasDrs ? pct(drsDist) : null,
  };
}

export function computeTraceOverlay(
  traceA: TelemetrySpeedTrace,
  traceB: TelemetrySpeedTrace,
): TraceOverlayPoint[] {
  const len = Math.min(
    traceA.distance.length,
    traceB.distance.length,
    traceA.speed.length,
    traceB.speed.length,
    traceA.throttle.length,
    traceB.throttle.length,
    traceA.brake.length,
    traceB.brake.length,
  );
  if (len < 2) return [];

  const totalDist = traceA.distance[len - 1] - traceA.distance[0];
  const hasDrsA = traceA.drs && traceA.drs.length >= len;
  const hasDrsB = traceB.drs && traceB.drs.length >= len;

  const points: TraceOverlayPoint[] = [];
  for (let i = 0; i < len; i++) {
    const progress = totalDist > 0
      ? ((traceA.distance[i] - traceA.distance[0]) / totalDist) * 100
      : (i / (len - 1)) * 100;

    points.push({
      progress: Math.round(progress * 100) / 100,
      speedA: traceA.speed[i],
      speedB: traceB.speed[i],
      throttleA: traceA.throttle[i],
      throttleB: traceB.throttle[i],
      brakeA: traceA.brake[i] ? 1 : 0,
      brakeB: traceB.brake[i] ? 1 : 0,
      drsA: hasDrsA ? (traceA.drs![i] ? 1 : 0) : null,
      drsB: hasDrsB ? (traceB.drs![i] ? 1 : 0) : null,
    });
  }

  return points;
}

export function computeSectorTable(
  session: TelemetrySession,
  metricsA: DriverMetrics,
  metricsB: DriverMetrics,
): SectorTableRow[] {
  const cleanA = cleanLapTimes(
    session.lapData.filter((l) => l.driverNumber === metricsA.driverNumber),
  );
  const cleanB = cleanLapTimes(
    session.lapData.filter((l) => l.driverNumber === metricsB.driverNumber),
  );

  const avg = (values: (number | null)[]): number | null => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0
      ? Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 1000) / 1000
      : null;
  };

  const sectorKeys = ["sector1", "sector2", "sector3"] as const;
  const sectorLabels: ("S1" | "S2" | "S3")[] = ["S1", "S2", "S3"];
  const bestSectorsA = [metricsA.bestSector1, metricsA.bestSector2, metricsA.bestSector3];
  const bestSectorsB = [metricsB.bestSector1, metricsB.bestSector2, metricsB.bestSector3];

  return sectorLabels.map((label, idx) => {
    const bestA = bestSectorsA[idx];
    const bestB = bestSectorsB[idx];
    const delta =
      bestA !== null && bestB !== null ? bestB - bestA : null; // positive = A faster
    const avgA = avg(cleanA.map((l) => l[sectorKeys[idx]]));
    const avgB = avg(cleanB.map((l) => l[sectorKeys[idx]]));

    return {
      sector: label,
      bestA,
      bestB,
      delta,
      avgTimeA: avgA,
      avgTimeB: avgB,
    };
  });
}

// ── Full Comparison ─────────────────────────────────────────────────────

function normalize(
  value: number | null,
  min: number,
  max: number,
  invert: boolean = false,
): number {
  if (value === null || max === min) return 0;
  const raw = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, raw));
  return invert ? 100 - clamped : clamped;
}

export function computeComparison(
  session: TelemetrySession,
  driverANumber: number,
  driverBNumber: number,
): ComparisonResult {
  const driverA = computeDriverMetrics(session, driverANumber);
  const driverB = computeDriverMetrics(session, driverBNumber);

  // ── Lap overlay data ──
  const allLapsA = session.lapData.filter(
    (l) => l.driverNumber === driverANumber,
  );
  const allLapsB = session.lapData.filter(
    (l) => l.driverNumber === driverBNumber,
  );
  const pitLapsA = new Set(
    allLapsA.filter((l) => l.isPitInLap).map((l) => l.lapNumber),
  );
  const pitLapsB = new Set(
    allLapsB.filter((l) => l.isPitInLap).map((l) => l.lapNumber),
  );

  const allLapNumbers = [
    ...new Set([
      ...allLapsA.map((l) => l.lapNumber),
      ...allLapsB.map((l) => l.lapNumber),
    ]),
  ].sort((a, b) => a - b);

  // Clean lap sets for chart (exclude pit in/out and outliers)
  const cleanA = cleanLapTimes(allLapsA);
  const cleanB = cleanLapTimes(allLapsB);
  const cleanMapA = new Map(
    cleanA.map((l) => [l.lapNumber, l.lapTime as number]),
  );
  const cleanMapB = new Map(
    cleanB.map((l) => [l.lapNumber, l.lapTime as number]),
  );

  const lapOverlayData: LapOverlayPoint[] = allLapNumbers.map((lap) => ({
    lap,
    driverA: cleanMapA.get(lap) ?? null,
    driverB: cleanMapB.get(lap) ?? null,
    driverAPit: pitLapsA.has(lap) || undefined,
    driverBPit: pitLapsB.has(lap) || undefined,
  }));

  // ── Sector delta (positive = A faster) ──
  const sectorDelta: SectorDelta = {
    s1:
      driverA.bestSector1 !== null && driverB.bestSector1 !== null
        ? driverB.bestSector1 - driverA.bestSector1
        : null,
    s2:
      driverA.bestSector2 !== null && driverB.bestSector2 !== null
        ? driverB.bestSector2 - driverA.bestSector2
        : null,
    s3:
      driverA.bestSector3 !== null && driverB.bestSector3 !== null
        ? driverB.bestSector3 - driverA.bestSector3
        : null,
  };

  // ── Radar data (5 axes, normalized 0–100) ──
  // Collect range bounds from all drivers for fair normalization
  const allMetrics = session.drivers.map((d) =>
    computeDriverMetrics(session, d.number),
  );
  const allPaces = allMetrics
    .map((m) => m.averagePace)
    .filter((v): v is number => v !== null);
  const allConsistencies = allMetrics
    .map((m) => m.consistency)
    .filter((v): v is number => v !== null);
  const allSpeeds = allMetrics
    .map((m) => m.topSpeed)
    .filter((v): v is number => v !== null);
  const allPositionsGained = allMetrics
    .map((m) => m.positionsGained)
    .filter((v): v is number => v !== null);
  const allStintCounts = allMetrics.map((m) => m.stints.length);
  const allTotalStintLaps = allMetrics.map((m) =>
    m.stints.reduce((sum, s) => sum + (s.lapEnd - s.lapStart + 1), 0),
  );
  // Tire management: avg stint length (higher = better management)
  const avgStintLength = (m: DriverMetrics) =>
    m.stints.length > 0
      ? m.stints.reduce((sum, s) => sum + (s.lapEnd - s.lapStart + 1), 0) /
        m.stints.length
      : 0;

  const allAvgStints = allMetrics.map(avgStintLength);

  const paceMin = Math.min(...allPaces);
  const paceMax = Math.max(...allPaces);
  const consMin = Math.min(...allConsistencies);
  const consMax = Math.max(...allConsistencies);
  const speedMin = Math.min(...allSpeeds);
  const speedMax = Math.max(...allSpeeds);
  const posMin = Math.min(...allPositionsGained);
  const posMax = Math.max(...allPositionsGained);
  const stintMin = Math.min(...allAvgStints);
  const stintMax = Math.max(...allAvgStints);

  const radarData: RadarPoint[] = [
    {
      metric: "Pace",
      driverA: normalize(driverA.averagePace, paceMin, paceMax, true), // lower = better
      driverB: normalize(driverB.averagePace, paceMin, paceMax, true),
      fullMark: 100,
    },
    {
      metric: "Consistency",
      driverA: normalize(driverA.consistency, consMin, consMax, true), // lower stddev = better
      driverB: normalize(driverB.consistency, consMin, consMax, true),
      fullMark: 100,
    },
    {
      metric: "Top Speed",
      driverA: normalize(driverA.topSpeed, speedMin, speedMax),
      driverB: normalize(driverB.topSpeed, speedMin, speedMax),
      fullMark: 100,
    },
    {
      metric: "Qualifying",
      driverA: normalize(driverA.positionsGained, posMin, posMax),
      driverB: normalize(driverB.positionsGained, posMin, posMax),
      fullMark: 100,
    },
    {
      metric: "Tire Mgmt",
      driverA: normalize(avgStintLength(driverA), stintMin, stintMax),
      driverB: normalize(avgStintLength(driverB), stintMin, stintMax),
      fullMark: 100,
    },
  ];

  // ── New telemetry-based computations ──
  const traceA = session.telemetryData.find(
    (t) => t.driverNumber === driverANumber,
  );
  const traceB = session.telemetryData.find(
    (t) => t.driverNumber === driverBNumber,
  );

  const gapDeltaData =
    traceA && traceB ? computeGapDelta(traceA, traceB) : [];

  const drivingDNA: [DrivingDNABreakdown, DrivingDNABreakdown] = [
    traceA
      ? computeDrivingDNA(traceA, driverA)
      : { ...driverA, fullThrottle: 0, partialThrottle: 0, braking: 0, coasting: 0, drsUsage: null },
    traceB
      ? computeDrivingDNA(traceB, driverB)
      : { ...driverB, fullThrottle: 0, partialThrottle: 0, braking: 0, coasting: 0, drsUsage: null },
  ];

  const traceOverlayData =
    traceA && traceB ? computeTraceOverlay(traceA, traceB) : [];

  const sectorTableData = computeSectorTable(session, driverA, driverB);

  return {
    driverA,
    driverB,
    lapOverlayData,
    sectorDelta,
    radarData,
    gapDeltaData,
    drivingDNA,
    traceOverlayData,
    sectorTableData,
  };
}
