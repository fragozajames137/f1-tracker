import type {
  OpenF1RaceControl,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Interval,
  TrackLimitViolation,
  DriverTrackLimits,
} from "@/app/types/openf1";

const TRACK_LIMITS_RE = /TRACK LIMITS/i;
const CAR_NUMBER_RE = /CAR\s+(\d+)/i;

export function parseTrackLimitViolations(
  messages: OpenF1RaceControl[],
): TrackLimitViolation[] {
  return messages
    .filter((msg) => TRACK_LIMITS_RE.test(msg.message))
    .map((msg) => {
      let driverNumber = msg.driver_number ?? 0;
      if (!driverNumber) {
        const match = msg.message.match(CAR_NUMBER_RE);
        if (match) driverNumber = parseInt(match[1], 10);
      }
      return {
        driver_number: driverNumber,
        lap_number: msg.lap_number ?? null,
        date: msg.date,
        message: msg.message,
      };
    })
    .filter((v) => v.driver_number > 0);
}

export function computeDriverTrackLimits(
  violations: TrackLimitViolation[],
  drivers: OpenF1Driver[],
  positions: OpenF1Position[],
  intervals: OpenF1Interval[],
): DriverTrackLimits[] {
  // Group violations by driver
  const byDriver = new Map<number, TrackLimitViolation[]>();
  for (const v of violations) {
    const list = byDriver.get(v.driver_number) ?? [];
    list.push(v);
    byDriver.set(v.driver_number, list);
  }

  // Build latest position map
  const latestPosition = new Map<number, number>();
  for (const p of positions) {
    latestPosition.set(p.driver_number, p.position);
  }

  // Build latest gap_to_leader map
  const latestGap = new Map<number, number>();
  for (const i of intervals) {
    if (i.gap_to_leader !== null) {
      latestGap.set(i.driver_number, i.gap_to_leader);
    }
  }

  const results: DriverTrackLimits[] = [];

  for (const [driverNumber, driverViolations] of byDriver) {
    const driver = drivers.find((d) => d.driver_number === driverNumber);
    const count = driverViolations.length;
    const hasPenalty = count >= 5;

    let predictedPositionDelta: number | null = null;
    let predictedNewPosition: number | null = null;

    if (hasPenalty) {
      const currentGap = latestGap.get(driverNumber);
      const currentPos = latestPosition.get(driverNumber);
      if (currentGap !== undefined && currentPos !== undefined) {
        const penaltyGap = currentGap + 5;
        // Count how many drivers would be ahead after 5s penalty
        let newPos = 1;
        for (const [dn, gap] of latestGap) {
          if (dn !== driverNumber && gap < penaltyGap) {
            newPos++;
          }
        }
        predictedNewPosition = newPos;
        predictedPositionDelta = newPos - currentPos;
      }
    }

    results.push({
      driver_number: driverNumber,
      name_acronym: driver?.name_acronym ?? `#${driverNumber}`,
      team_colour: driver?.team_colour ?? "666666",
      violations: driverViolations,
      count,
      hasPenalty,
      predictedPositionDelta,
      predictedNewPosition,
    });
  }

  return results.sort((a, b) => b.count - a.count);
}
