import type { Race } from "@/app/types";

// Session durations in minutes (standard F1 lengths)
const SESSION_DURATION: Record<string, number> = {
  FP1: 60,
  FP2: 60,
  FP3: 60,
  Qualifying: 60,
  "Sprint Qualifying": 60,
  Sprint: 60,
  Race: 120,
};

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

function buildEvent(
  race: Race,
  sessionLabel: string,
  dateStr: string,
  timeStr: string,
): string {
  const start = new Date(`${dateStr}T${timeStr}`);
  const durationMin = SESSION_DURATION[sessionLabel] ?? 60;
  const end = new Date(start.getTime() + durationMin * 60_000);

  const location = `${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`;
  const uid = `f1-${race.season}-R${race.round.padStart(2, "0")}-${sessionLabel.toLowerCase().replace(/\s+/g, "-")}@poletopaddock.com`;

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:F1: ${escapeICS(race.raceName)} — ${sessionLabel}`,
    `LOCATION:${escapeICS(location)}`,
    `DESCRIPTION:Round ${race.round} of the ${race.season} Formula 1 World Championship`,
    "END:VEVENT",
  ].join("\r\n");
}

export function generateICS(races: Race[]): string {
  const events: string[] = [];

  for (const race of races) {
    if (race.FirstPractice) {
      events.push(buildEvent(race, "FP1", race.FirstPractice.date, race.FirstPractice.time));
    }
    if (race.SecondPractice) {
      events.push(buildEvent(race, "FP2", race.SecondPractice.date, race.SecondPractice.time));
    }
    if (race.SprintQualifying) {
      events.push(buildEvent(race, "Sprint Qualifying", race.SprintQualifying.date, race.SprintQualifying.time));
    }
    if (race.ThirdPractice) {
      events.push(buildEvent(race, "FP3", race.ThirdPractice.date, race.ThirdPractice.time));
    }
    if (race.Sprint) {
      events.push(buildEvent(race, "Sprint", race.Sprint.date, race.Sprint.time));
    }
    if (race.Qualifying) {
      events.push(buildEvent(race, "Qualifying", race.Qualifying.date, race.Qualifying.time));
    }
    events.push(buildEvent(race, "Race", race.date, race.time));
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pole to Paddock//F1 Schedule//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:F1 ${races[0]?.season ?? ""} Season`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
