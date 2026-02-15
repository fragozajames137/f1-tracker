"use client";

import { useState, useMemo } from "react";
import type { Incident, IncidentType } from "@/app/types/penalties";
import type { DriverPenaltySummary } from "@/app/types/penalties";
import { INCIDENT_TYPE_LABELS, formatPenaltySummary, isPointActive } from "@/app/lib/penalties";
import { usePreferencesStore } from "@/app/stores/preferences";

type SortKey = "date" | "driver" | "team" | "race" | "incidentType" | "penaltyPoints";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block text-[10px] ${active ? "text-white" : "text-white/20"}`}>
      {active ? (dir === "asc" ? "\u25B2" : "\u25BC") : "\u25BC"}
    </span>
  );
}

export default function IncidentsView({
  incidents,
  summaries,
}: {
  incidents: Incident[];
  summaries: DriverPenaltySummary[];
}) {
  const [search, setSearch] = useState("");
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterType, setFilterType] = useState<IncidentType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);

  // Unique values for dropdowns
  const drivers = useMemo(
    () =>
      [...new Set(incidents.map((i) => i.driverId))].sort().map((id) => ({
        id,
        name: summaries.find((s) => s.driverId === id)?.driverName ?? id,
      })),
    [incidents, summaries],
  );

  const teams = useMemo(
    () =>
      [...new Set(incidents.map((i) => i.teamId))].sort().map((id) => ({
        id,
        name: summaries.find((s) => s.teamId === id)?.teamName ?? id,
      })),
    [incidents, summaries],
  );

  const incidentTypes = useMemo(
    () => [...new Set(incidents.map((i) => i.incidentType))].sort(),
    [incidents],
  );

  const teamColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of summaries) map.set(s.teamId, s.teamColor);
    return map;
  }, [summaries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = [...incidents];

    if (q) {
      list = list.filter(
        (i) =>
          i.incidentDescription.toLowerCase().includes(q) ||
          i.raceName.toLowerCase().includes(q) ||
          (summaries.find((s) => s.driverId === i.driverId)?.driverName ?? "")
            .toLowerCase()
            .includes(q),
      );
    }
    if (filterDriver !== "all") list = list.filter((i) => i.driverId === filterDriver);
    if (filterTeam !== "all") list = list.filter((i) => i.teamId === filterTeam);
    if (filterType !== "all") list = list.filter((i) => i.incidentType === filterType);

    list.sort((a, b) => {
      let result = 0;
      const driverNameA = summaries.find((s) => s.driverId === a.driverId)?.driverName ?? a.driverId;
      const driverNameB = summaries.find((s) => s.driverId === b.driverId)?.driverName ?? b.driverId;
      switch (sortKey) {
        case "date":
          result = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "driver":
          result = driverNameA.localeCompare(driverNameB);
          break;
        case "team":
          result = a.teamId.localeCompare(b.teamId);
          break;
        case "race":
          result = a.raceName.localeCompare(b.raceName);
          break;
        case "incidentType":
          result = a.incidentType.localeCompare(b.incidentType);
          break;
        case "penaltyPoints":
          result = a.decision.penaltyPoints - b.decision.penaltyPoints;
          break;
      }
      return sortDir === "asc" ? result : -result;
    });

    return list;
  }, [incidents, summaries, search, filterDriver, filterTeam, filterType, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "penaltyPoints" ? "desc" : "asc");
    }
  };

  const now = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 sm:w-64"
        />
        <select
          value={filterDriver}
          onChange={(e) => setFilterDriver(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all">All Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as IncidentType | "all")}
          className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none sm:col-span-1"
        >
          <option value="all">All Types</option>
          {incidentTypes.map((t) => (
            <option key={t} value={t}>
              {INCIDENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-white/30">
        {filtered.length} incident{filtered.length !== 1 ? "s" : ""}
        {search || filterDriver !== "all" || filterTeam !== "all" || filterType !== "all"
          ? " (filtered)"
          : ""}
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {(
                [
                  { key: "date", label: "Date" },
                  { key: "driver", label: "Driver" },
                  { key: "team", label: "Team", hideClass: "hidden sm:table-cell" },
                  { key: "race", label: "Race", hideClass: "hidden md:table-cell" },
                  { key: "incidentType", label: "Type" },
                  { key: "penaltyPoints", label: "Pts", className: "text-center" },
                ] as { key: SortKey; label: string; className?: string; hideClass?: string }[]
              ).map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/50 hover:text-white/70 ${col.className ?? ""} ${col.hideClass ?? ""}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
              <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/50 md:table-cell">
                Penalty
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((inc) => {
              const active = isPointActive(inc.date, now);
              const teamColor = teamColorMap.get(inc.teamId) ?? "#666";
              const driverName =
                summaries.find((s) => s.driverId === inc.driverId)?.driverName ?? inc.driverId;

              const isFav = favoriteDriverIds.includes(inc.driverId);
              return (
                <tr
                  key={inc.id}
                  className={`${!active ? "opacity-40" : ""} ${isFav && active ? "bg-white/[0.04]" : ""}`}
                  style={{ borderLeftWidth: 2, borderLeftColor: teamColor }}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/50 text-xs">
                    {new Date(inc.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-white">
                    {driverName}
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: teamColor }}
                      />
                      <span className="text-white/50 text-xs">
                        {summaries.find((s) => s.teamId === inc.teamId)?.teamName ?? inc.teamId}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 text-white/60 text-xs md:table-cell">
                    R{inc.round} {inc.raceName}
                  </td>
                  <td className="px-3 py-2.5 text-white/50 text-xs">
                    {INCIDENT_TYPE_LABELS[inc.incidentType]}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {inc.decision.penaltyPoints > 0 ? (
                      <span className="font-mono font-bold text-white">
                        {inc.decision.penaltyPoints}
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2.5 text-xs text-white/40 max-w-[200px] truncate md:table-cell">
                    {formatPenaltySummary(inc.decision)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
