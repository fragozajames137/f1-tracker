import { JolpicaResponse, Race } from "@/app/types";

const JOLPICA_URL = "https://api.jolpi.ca/ergast/f1/2026.json";

export async function fetchRaceSchedule(): Promise<Race[]> {
  const res = await fetch(JOLPICA_URL, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch race schedule: ${res.status}`);
  }

  const data: JolpicaResponse = await res.json();
  return data.MRData.RaceTable.Races;
}
