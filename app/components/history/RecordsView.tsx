"use client";

import { useState, useMemo } from "react";
import driversByCountryData from "@/app/data/f1-drivers-by-country.json";
import raceTitlesData from "@/app/data/gp-race-titles.json";
import type { CountryDriverStats, GpRaceTitle } from "@/app/types/f1-reference";
import { countryToIso } from "@/app/lib/flags";
import Flag from "@/app/components/Flag";

const driversByCountry = driversByCountryData as CountryDriverStats[];
const raceTitles = raceTitlesData as GpRaceTitle[];

type SubTab = "drivers" | "grandprix";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block text-[10px] ${active ? "text-white" : "text-white/20"}`}>
      {active ? (dir === "asc" ? "\u25B2" : "\u25BC") : "\u25BC"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Drivers by Country Table
// ---------------------------------------------------------------------------

type DriverSortKey = "country" | "totalDrivers" | "champions" | "championships" | "raceWins";

function DriversTable() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<DriverSortKey>("totalDrivers");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: DriverSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "country" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = q
      ? driversByCountry.filter((d) => d.country.toLowerCase().includes(q))
      : [...driversByCountry];

    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

    return list;
  }, [search, sortKey, sortDir]);

  const cols: { key: DriverSortKey; label: string; className?: string }[] = [
    { key: "country", label: "Country" },
    { key: "totalDrivers", label: "Drivers", className: "text-right" },
    { key: "champions", label: "Champions", className: "text-right" },
    { key: "championships", label: "Titles", className: "text-right" },
    { key: "raceWins", label: "Wins", className: "text-right" },
  ];

  return (
    <div>
      <input
        type="text"
        placeholder="Search country..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none sm:w-64"
      />
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-white/50 select-none hover:text-white/80 ${col.className ?? "text-left"}`}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
              <th className="px-3 py-2 text-left text-xs font-medium text-white/50">
                2026 Drivers
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.country}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
              >
                <td className="whitespace-nowrap px-3 py-2 text-white/80">
                  <span className="flex items-center gap-2">
                    {countryToIso(row.country) && (
                      <Flag iso={countryToIso(row.country)!} size={16} className="shrink-0" />
                    )}
                    {row.country}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/60">{row.totalDrivers}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white/60">{row.champions}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white/60">{row.championships}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white/60">{row.raceWins}</td>
                <td className="px-3 py-2 text-white/40 text-xs">
                  {row.currentDrivers?.join(", ") ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-white/30">
        {filtered.length} countries
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grand Prix History Table
// ---------------------------------------------------------------------------

type GpSortKey = "raceTitle" | "country" | "totalRaces" | "circuitsUsed";

function GrandPrixTable() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<GpSortKey>("totalRaces");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [calendar2026Only, setCalendar2026Only] = useState(false);

  const handleSort = (key: GpSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "raceTitle" || key === "country" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = [...raceTitles];

    if (calendar2026Only) {
      list = list.filter((r) => r.onCalendar2026);
    }

    if (q) {
      list = list.filter(
        (r) =>
          r.raceTitle.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

    return list;
  }, [search, sortKey, sortDir, calendar2026Only]);

  const cols: { key: GpSortKey; label: string; className?: string }[] = [
    { key: "raceTitle", label: "Race Title" },
    { key: "country", label: "Country" },
    { key: "totalRaces", label: "Races", className: "text-right" },
    { key: "circuitsUsed", label: "Circuits", className: "text-right" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          type="text"
          placeholder="Search race or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none sm:w-64"
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50">
          <input
            type="checkbox"
            checked={calendar2026Only}
            onChange={(e) => setCalendar2026Only(e.target.checked)}
            className="accent-red-500"
          />
          2026 calendar only
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-white/50 select-none hover:text-white/80 ${col.className ?? "text-left"}`}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
              <th className="px-3 py-2 text-left text-xs font-medium text-white/50">
                Years Held
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-white/50">
                2026
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const displayCountry = row.countries
                ? row.countries.join(", ")
                : row.country;
              return (
                <tr
                  key={row.raceTitle}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-white/80">
                    {row.raceTitle}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-white/60">
                    <span className="flex items-center gap-2">
                      {countryToIso(row.country) && (
                        <Flag iso={countryToIso(row.country)!} size={16} className="shrink-0" />
                      )}
                      {displayCountry}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/60">
                    {row.totalRaces}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/60">
                    {row.circuitsUsed}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs text-white/40">
                    {row.yearsHeld || "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.onCalendar2026 ? (
                      <span className="text-green-400">&#10003;</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-white/30">
        {filtered.length} race titles
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Records View
// ---------------------------------------------------------------------------

export default function RecordsView() {
  const [subTab, setSubTab] = useState<SubTab>("drivers");

  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-lg border border-white/10">
        <button
          onClick={() => setSubTab("drivers")}
          className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
            subTab === "drivers"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Drivers by Country
        </button>
        <button
          onClick={() => setSubTab("grandprix")}
          className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
            subTab === "grandprix"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Grand Prix History
        </button>
      </div>

      {subTab === "drivers" && <DriversTable />}
      {subTab === "grandprix" && <GrandPrixTable />}
    </div>
  );
}
