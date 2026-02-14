import penaltyData from "@/app/data/penalty-points.json";
import gridData from "@/app/data/grid-2026.json";
import type {
  PenaltyData,
  Incident,
  DriverPenaltySummary,
  ConsistencyGroup,
  IncidentType,
} from "@/app/types/penalties";
import type { GridData } from "@/app/types";

const data = penaltyData as PenaltyData;
const grid = gridData as GridData;

export const BAN_THRESHOLD = 12;

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  "causing-collision": "Causing a Collision",
  "forcing-off-track": "Forcing Another Driver Off Track",
  "impeding": "Impeding Another Driver",
  "track-limits": "Track Limit Violations",
  "unsafe-release": "Unsafe Release",
  "speeding-pit-lane": "Speeding in Pit Lane",
  "false-start": "False Start",
  "dangerous-driving": "Dangerous Driving",
  "safety-car-infringement": "Safety Car Infringement",
  "red-flag-infringement": "Red Flag Infringement",
  "pit-entry-infringement": "Pit Entry Infringement",
  "technical-violation": "Technical Violation",
  "change-of-direction": "Change of Direction Under Braking",
};

/** Check if an incident's penalty points are still active (within 12-month rolling window).
 *  FIA rule: points remain on a driver's licence for 12 months from the date issued.
 *  E.g. points issued 2025-03-22 expire at the end of 2026-03-21. */
export function isPointActive(incidentDate: string, referenceDate?: string): boolean {
  const ref = referenceDate ? new Date(referenceDate + "T00:00:00") : new Date();
  const incident = new Date(incidentDate + "T00:00:00");
  if (ref < incident) return false; // future incident
  const expiry = new Date(incident);
  expiry.setFullYear(expiry.getFullYear() + 1);
  return ref < expiry;
}

/** Get the expiry date for a given incident date (incident date + 12 months) */
export function getExpiryDate(incidentDate: string): string {
  const d = new Date(incidentDate + "T00:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Human-readable summary of a penalty decision */
export function formatPenaltySummary(decision: Incident["decision"]): string {
  const parts: string[] = [];

  if (decision.disqualified) parts.push("Disqualified");
  if (decision.driveThrough) parts.push("Drive-through penalty");
  if (decision.timePenalty) parts.push(`${decision.timePenalty}s time penalty`);
  if (decision.gridPenalty) parts.push(`${decision.gridPenalty}-place grid penalty`);
  if (decision.reprimand) parts.push("Reprimand");
  if (decision.fine) parts.push(decision.fine);
  if (decision.penaltyPoints > 0) {
    parts.push(`${decision.penaltyPoints} penalty point${decision.penaltyPoints > 1 ? "s" : ""}`);
  }
  if (decision.other) parts.push(decision.other);

  return parts.length > 0 ? parts.join(" + ") : "No penalty";
}

/** Get all incidents, sorted newest-first */
export function getIncidents(): Incident[] {
  return [...data.incidents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** Build penalty summary for every 2026 grid driver */
export function getDriverSummaries(referenceDate?: string): DriverPenaltySummary[] {
  const ref = referenceDate ?? new Date().toISOString().slice(0, 10);

  // Build driver lookup from grid
  const driverMap = new Map<
    string,
    { name: string; teamId: string; teamName: string; teamColor: string; nationality: string }
  >();

  for (const team of grid.teams) {
    for (const seat of [team.seat1, team.seat2]) {
      driverMap.set(seat.id, {
        name: seat.name,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        nationality: seat.nationality,
      });
    }
  }

  // Group incidents by driverId
  const incidentsByDriver = new Map<string, Incident[]>();
  for (const incident of data.incidents) {
    const list = incidentsByDriver.get(incident.driverId) ?? [];
    list.push(incident);
    incidentsByDriver.set(incident.driverId, list);
  }

  const summaries: DriverPenaltySummary[] = [];

  for (const [driverId, info] of driverMap) {
    const incidents = incidentsByDriver.get(driverId) ?? [];
    const activeIncidents = incidents.filter(
      (inc) => inc.decision.penaltyPoints > 0 && isPointActive(inc.date, ref),
    );
    const activePoints = activeIncidents.reduce(
      (sum, inc) => sum + inc.decision.penaltyPoints,
      0,
    );

    // Find next expiry (earliest active incident date)
    let nextExpiry: DriverPenaltySummary["nextExpiry"] = null;
    if (activeIncidents.length > 0) {
      const earliest = activeIncidents.reduce((min, inc) =>
        new Date(inc.date) < new Date(min.date) ? inc : min,
      );
      const expiryDate = new Date(earliest.date);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      nextExpiry = {
        date: expiryDate.toISOString().slice(0, 10),
        points: earliest.decision.penaltyPoints,
      };
    }

    const status: DriverPenaltySummary["status"] =
      activePoints >= 11
        ? "danger"
        : activePoints >= 8
          ? "warning"
          : activePoints >= 4
            ? "watch"
            : "clear";

    summaries.push({
      driverId,
      driverName: info.name,
      teamId: info.teamId,
      teamName: info.teamName,
      teamColor: info.teamColor,
      nationality: info.nationality,
      activePoints,
      activeIncidents: activeIncidents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      totalIncidents: incidents.length,
      nextExpiry,
      status,
    });
  }

  // Sort by activePoints desc, then by name
  summaries.sort((a, b) => b.activePoints - a.activePoints || a.driverName.localeCompare(b.driverName));

  return summaries;
}

/** Group incidents by type and compute consistency stats */
export function getConsistencyGroups(): ConsistencyGroup[] {
  const byType = new Map<IncidentType, Incident[]>();

  for (const incident of data.incidents) {
    if (incident.decision.penaltyPoints === 0) continue; // only incidents with penalty points
    const list = byType.get(incident.incidentType) ?? [];
    list.push(incident);
    byType.set(incident.incidentType, list);
  }

  const groups: ConsistencyGroup[] = [];

  for (const [type, incidents] of byType) {
    if (incidents.length < 2) continue; // need 2+ for comparison

    const points = incidents.map((i) => i.decision.penaltyPoints);
    const avg = points.reduce((s, p) => s + p, 0) / points.length;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const variance =
      points.reduce((s, p) => s + (p - avg) ** 2, 0) / points.length;

    groups.push({
      incidentType: type,
      label: INCIDENT_TYPE_LABELS[type],
      incidents: incidents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      count: incidents.length,
      avgPoints: Math.round(avg * 10) / 10,
      minPoints: min,
      maxPoints: max,
      variance: Math.round(variance * 100) / 100,
    });
  }

  // Sort by variance desc (most inconsistent first)
  groups.sort((a, b) => b.variance - a.variance || b.count - a.count);

  return groups;
}
