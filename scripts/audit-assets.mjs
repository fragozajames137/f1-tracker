#!/usr/bin/env node
import { readdirSync } from "fs";
import path from "path";

const PROJ = path.resolve(import.meta.dirname, "..");
const JOLPICA = "https://api.jolpi.ca/ergast/f1";

function stripAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const existingDrivers = new Set(
  readdirSync(path.join(PROJ, "public/drivers"))
    .filter(f => f.endsWith(".webp") || f.endsWith(".png"))
    .map(f => f.replace(/\.(webp|png)$/, ""))
);

const existingLogos = new Set(
  readdirSync(path.join(PROJ, "public/logos"))
    .filter(f => f.endsWith(".webp") || f.endsWith(".png") || f.endsWith(".svg"))
    .map(f => f.replace(/\.(webp|png|svg)$/, ""))
);

const logoAliases = {
  "rb-f1-team": "racing-bulls",
  "alphatauri": "racing-bulls",
  "alfa-romeo": "audi",
  "sauber": "audi",
  "kick-sauber": "audi",
};

function hasLogo(constructorId) {
  const mapped = constructorId.replace(/_/g, "-");
  const resolved = logoAliases[mapped] ?? mapped;
  return existingLogos.has(resolved) || existingLogos.has(mapped);
}

const missingDrivers = new Map();
const missingTeams = new Map();
const allDrivers = new Set();
const allTeams = new Set();

for (let year = 2025; year >= 2010; year--) {
  process.stdout.write(`  ${year}...`);

  const dRes = await fetch(`${JOLPICA}/${year}/driverstandings.json`);
  if (dRes.ok) {
    const dData = await dRes.json();
    const lists = dData.MRData?.StandingsTable?.StandingsLists;
    if (lists?.length) {
      for (const s of lists[0].DriverStandings) {
        const key = stripAccents(s.Driver.familyName).toLowerCase().replace(/\s+/g, "-");
        allDrivers.add(key);
        if (!existingDrivers.has(key)) {
          if (!missingDrivers.has(key)) {
            missingDrivers.set(key, { name: `${s.Driver.givenName} ${s.Driver.familyName}`, seasons: [] });
          }
          missingDrivers.get(key).seasons.push(year);
        }
      }
    }
  }

  const cRes = await fetch(`${JOLPICA}/${year}/constructorstandings.json`);
  if (cRes.ok) {
    const cData = await cRes.json();
    const lists = cData.MRData?.StandingsTable?.StandingsLists;
    if (lists?.length) {
      for (const s of lists[0].ConstructorStandings) {
        const id = s.Constructor.constructorId;
        allTeams.add(id);
        if (!hasLogo(id)) {
          if (!missingTeams.has(id)) {
            missingTeams.set(id, { name: s.Constructor.name, seasons: [] });
          }
          missingTeams.get(id).seasons.push(year);
        }
      }
    }
  }

  console.log(" done");
  await sleep(250);
}

console.log("\n=== DRIVERS ===");
console.log(`Total unique drivers (2010-2025): ${allDrivers.size}`);
console.log(`Have headshots: ${allDrivers.size - missingDrivers.size}`);
console.log(`Missing headshots: ${missingDrivers.size}`);
console.log("");

const sortedDrivers = [...missingDrivers.entries()].sort((a, b) => {
  return Math.max(...b[1].seasons) - Math.max(...a[1].seasons);
});
for (const [, d] of sortedDrivers) {
  const range = d.seasons.length === 1
    ? String(d.seasons[0])
    : `${Math.min(...d.seasons)}-${Math.max(...d.seasons)}`;
  console.log(`  ${d.name} (${range})`);
}

console.log("\n=== CONSTRUCTORS ===");
console.log(`Total unique teams (2010-2025): ${allTeams.size}`);
console.log(`Have logos: ${allTeams.size - missingTeams.size}`);
console.log(`Missing logos: ${missingTeams.size}`);
console.log("");

const sortedTeams = [...missingTeams.entries()].sort((a, b) => {
  return Math.max(...b[1].seasons) - Math.max(...a[1].seasons);
});
for (const [id, t] of sortedTeams) {
  const range = t.seasons.length === 1
    ? String(t.seasons[0])
    : `${Math.min(...t.seasons)}-${Math.max(...t.seasons)}`;
  console.log(`  ${t.name} [${id}] (${range})`);
}
