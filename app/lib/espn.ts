/**
 * Resolves ESPN headshot URLs for Jolpica drivers in a given F1 season.
 *
 * ESPN's season athletes endpoint returns $ref links that must be fetched
 * individually. Results are cached via Next.js data cache (past seasons = 1 week,
 * current season = 1 day). If ESPN lacks data for a season or a fetch fails,
 * we gracefully return an empty/partial map — callers fall back to other images.
 */

const ESPN_CORE =
  "https://sports.core.api.espn.com/v2/sports/racing/leagues/f1";
const CURRENT_YEAR = 2026;
const HEADSHOT_BASE =
  "https://a.espncdn.com/i/headshots/rpm/players/full";

interface EspnAthleteRef {
  $ref: string;
}

interface EspnAthlete {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface JolpicaDriverInfo {
  driverId: string;
  givenName: string;
  familyName: string;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|iii?|iv)$/i, "")
    .trim();
}

async function fetchEspnAthletes(year: number): Promise<EspnAthlete[]> {
  const revalidate = year < CURRENT_YEAR ? 604800 : 86400;

  const listRes = await fetch(
    `${ESPN_CORE}/seasons/${year}/athletes?limit=100`,
    { next: { revalidate } },
  );
  if (!listRes.ok) return [];

  const list = await listRes.json();
  const refs: string[] =
    (list.items as EspnAthleteRef[] | undefined)?.map((i) =>
      i.$ref.replace("http://", "https://"),
    ) ?? [];

  const results = await Promise.allSettled(
    refs.map(async (ref) => {
      const res = await fetch(ref, { next: { revalidate } });
      if (!res.ok) return null;
      return (await res.json()) as EspnAthlete;
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<EspnAthlete | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((a): a is EspnAthlete => a !== null);
}

/**
 * Build a map of Jolpica `driverId` → ESPN headshot URL by matching driver
 * names between the two data sources.
 *
 * Matching strategy:
 * 1. Exact match on normalized full name (best)
 * 2. Family-name-only match when unambiguous (fallback)
 */
export async function resolveEspnHeadshots(
  year: number,
  jolpicaDrivers: JolpicaDriverInfo[],
): Promise<Record<string, string>> {
  if (jolpicaDrivers.length === 0) return {};

  let espnAthletes: EspnAthlete[];
  try {
    espnAthletes = await fetchEspnAthletes(year);
  } catch {
    return {};
  }
  if (espnAthletes.length === 0) return {};

  // Index ESPN athletes by normalized full name and by last name
  const byFullName = new Map<string, EspnAthlete>();
  const byLastName = new Map<string, EspnAthlete[]>();

  for (const a of espnAthletes) {
    byFullName.set(normalizeName(`${a.firstName} ${a.lastName}`), a);
    const lastKey = normalizeName(a.lastName);
    const list = byLastName.get(lastKey) ?? [];
    list.push(a);
    byLastName.set(lastKey, list);
  }

  const map: Record<string, string> = {};

  for (const d of jolpicaDrivers) {
    const fullKey = normalizeName(`${d.givenName} ${d.familyName}`);
    let match = byFullName.get(fullKey);

    if (!match) {
      const lastKey = normalizeName(d.familyName);
      const candidates = byLastName.get(lastKey);
      if (candidates?.length === 1) {
        match = candidates[0];
      }
    }

    if (match) {
      map[d.driverId] = `${HEADSHOT_BASE}/${match.id}.png`;
    }
  }

  return map;
}
