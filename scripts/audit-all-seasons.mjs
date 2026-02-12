/**
 * Audit all F1 seasons (1950-2025) via Jolpica API.
 * Outputs unique constructorIds, driver familyNames, and nationalities
 * not already covered by our existing assets/maps.
 *
 * Usage: node scripts/audit-all-seasons.mjs
 */

const BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY = 400; // ms between requests

// --- Existing coverage ---

const EXISTING_FLAGS = new Set([
  "ae","ar","at","au","az","be","bh","br","ca","ch","cn","co","de","dk",
  "ee","es","fi","fr","gb","hu","id","in","it","jp","kr","mc","mx","my",
  "nl","nz","pl","pt","qa","ru","sa","se","sg","th","tr","us","ve","vn","za",
]);

const EXISTING_NATIONALITY_MAP = {
  American: "us", Argentine: "ar", Australian: "au", Austrian: "at",
  Belgian: "be", Brazilian: "br", British: "gb", Canadian: "ca",
  Chinese: "cn", Colombian: "co", Danish: "dk", Dutch: "nl",
  Estonian: "ee", Finnish: "fi", French: "fr", German: "de",
  Hungarian: "hu", Indian: "in", Indonesian: "id", Italian: "it",
  Japanese: "jp", Korean: "kr", Malaysian: "my", Mexican: "mx",
  Monegasque: "mc", "New Zealander": "nz", Polish: "pl",
  Portuguese: "pt", Russian: "ru", "Saudi Arabian": "sa",
  "South African": "za", Spanish: "es", Swedish: "se", Swiss: "ch",
  Thai: "th", Turkish: "tr", Venezuelan: "ve",
};

const EXISTING_CONSTRUCTOR_MAP = new Set([
  "red-bull","mclaren","ferrari","mercedes","aston-martin","alpine",
  "williams","racing-bulls","audi","haas","cadillac","rb","alphatauri",
  "alfa","alfa-romeo","sauber","kick-sauber","renault","racing-point",
  "toro-rosso","force-india","lotus-f1","manor","marussia","caterham",
  "hrt","lotus-racing","virgin",
]);

const EXISTING_DRIVERS = new Set([
  "sirotkin","verstappen","hadjar","norris","piastri","leclerc","hamilton",
  "russell","antonelli","alonso","stroll","gasly","colapinto","albon","sainz",
  "lawson","lindblad","hulkenberg","bortoleto","ocon","bearman","perez",
  "bottas","tsunoda","doohan","magnussen","ricciardo","zhou","sargeant",
  "vettel","schumacher","raikkonen","giovinazzi","kubica","mazepin","kvyat",
  "grosjean","aitken","fittipaldi","vandoorne","ericsson","hartley","de-vries",
  "latifi","massa","palmer","wehrlein","button","di-resta","rosberg","nasr",
  "alguersuari",
]);

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driverKey(familyName) {
  return stripAccents(familyName).toLowerCase().replace(/\s+/g, "-");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  const allConstructors = new Map(); // constructorId -> {name, nationality, seasons}
  const allDrivers = new Map();      // familyName key -> {givenName, familyName, nationality, seasons}
  const allNationalities = new Set();

  for (let year = 1950; year <= 2025; year++) {
    process.stdout.write(`\r  Fetching ${year}...`);

    // Driver standings
    try {
      const dUrl = `${BASE}/${year}/driverstandings/?limit=100`;
      const dData = await fetchJSON(dUrl);
      const lists = dData?.MRData?.StandingsTable?.StandingsLists;
      if (lists && lists.length > 0) {
        for (const s of lists[0].DriverStandings) {
          const d = s.Driver;
          const key = driverKey(d.familyName);
          allNationalities.add(d.nationality);
          if (!allDrivers.has(key)) {
            allDrivers.set(key, {
              givenName: d.givenName,
              familyName: d.familyName,
              nationality: d.nationality,
              seasons: [],
            });
          }
          allDrivers.get(key).seasons.push(year);
          for (const c of s.Constructors) {
            const cid = c.constructorId;
            allNationalities.add(c.nationality);
            if (!allConstructors.has(cid)) {
              allConstructors.set(cid, {
                name: c.name,
                nationality: c.nationality,
                seasons: [],
              });
            }
            if (!allConstructors.get(cid).seasons.includes(year)) {
              allConstructors.get(cid).seasons.push(year);
            }
          }
        }
      }
    } catch (e) {
      console.error(`\n  Error fetching driver standings for ${year}: ${e.message}`);
    }

    await sleep(DELAY);

    // Constructor standings (1958+)
    if (year >= 1958) {
      try {
        const cUrl = `${BASE}/${year}/constructorstandings/?limit=100`;
        const cData = await fetchJSON(cUrl);
        const lists = cData?.MRData?.StandingsTable?.StandingsLists;
        if (lists && lists.length > 0) {
          for (const s of lists[0].ConstructorStandings) {
            const c = s.Constructor;
            const cid = c.constructorId;
            allNationalities.add(c.nationality);
            if (!allConstructors.has(cid)) {
              allConstructors.set(cid, {
                name: c.name,
                nationality: c.nationality,
                seasons: [],
              });
            }
            if (!allConstructors.get(cid).seasons.includes(year)) {
              allConstructors.get(cid).seasons.push(year);
            }
          }
        }
      } catch (e) {
        console.error(`\n  Error fetching constructor standings for ${year}: ${e.message}`);
      }
      await sleep(DELAY);
    }
  }

  console.log("\n");

  // Compute missing items
  const missingConstructors = [];
  for (const [cid, info] of allConstructors) {
    const mapped = cid.replace(/_/g, "-");
    if (!EXISTING_CONSTRUCTOR_MAP.has(mapped)) {
      missingConstructors.push({ constructorId: cid, mapped, ...info });
    }
  }

  const missingDrivers = [];
  for (const [key, info] of allDrivers) {
    if (!EXISTING_DRIVERS.has(key)) {
      missingDrivers.push({ key, ...info });
    }
  }

  const missingNationalities = [];
  for (const nat of allNationalities) {
    if (!EXISTING_NATIONALITY_MAP[nat]) {
      missingNationalities.push(nat);
    }
  }

  const results = {
    totalConstructors: allConstructors.size,
    totalDrivers: allDrivers.size,
    totalNationalities: allNationalities.size,
    missingConstructors: missingConstructors.sort((a, b) => b.seasons.length - a.seasons.length),
    missingDrivers: missingDrivers.sort((a, b) => b.seasons.length - a.seasons.length),
    missingNationalities: missingNationalities.sort(),
    allNationalities: [...allNationalities].sort(),
  };

  console.log(`Total unique constructors: ${results.totalConstructors}`);
  console.log(`Total unique drivers: ${results.totalDrivers}`);
  console.log(`Total unique nationalities: ${results.totalNationalities}`);
  console.log(`\nMissing constructors (no logo): ${results.missingConstructors.length}`);
  console.log(`Missing drivers (no headshot): ${results.missingDrivers.length}`);
  console.log(`Missing nationalities (no mapping): ${results.missingNationalities.length}`);
  console.log(`\nMissing nationalities: ${results.missingNationalities.join(", ")}`);

  // Write results
  const fs = await import("node:fs");
  fs.writeFileSync(
    new URL("./audit-results.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log("\nResults saved to scripts/audit-results.json");
}

main().catch(console.error);
