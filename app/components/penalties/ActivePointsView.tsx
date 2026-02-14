"use client";

import { useState, useMemo } from "react";
import type { DriverPenaltySummary, Incident } from "@/app/types/penalties";
import { BAN_THRESHOLD, formatPenaltySummary, isPointActive, getExpiryDate } from "@/app/lib/penalties";
import { nationalityToFlag } from "@/app/lib/flags";

type SortKey = "driver" | "team" | "activePoints" | "totalIncidents" | "nextExpiry";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block text-[10px] ${active ? "text-white" : "text-white/20"}`}>
      {active ? (dir === "asc" ? "\u25B2" : "\u25BC") : "\u25BC"}
    </span>
  );
}

function StatusBadge({ status }: { status: DriverPenaltySummary["status"] }) {
  const config = {
    clear: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Clear" },
    watch: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Watch" },
    warning: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Warning" },
    danger: { bg: "bg-red-500/15", text: "text-red-400", label: "Danger" },
  };
  const c = config[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function ProgressBar({ points, color }: { points: number; color: string }) {
  const pct = Math.min((points / BAN_THRESHOLD) * 100, 100);
  const isDanger = points >= 8;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: isDanger ? "#ef4444" : color,
          }}
        />
      </div>
      <span className="w-6 text-right text-xs font-mono tabular-nums text-white/60">
        {points}
      </span>
    </div>
  );
}

function ExpandedIncidents({ incidents }: { incidents: Incident[] }) {
  const now = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-2 border-t border-white/5 pt-3 mt-2">
      {incidents.map((inc) => {
        const expiryStr = getExpiryDate(inc.date);
        const expiry = new Date(expiryStr + "T00:00:00");
        const active = isPointActive(inc.date, now);
        const daysUntil = Math.ceil(
          (expiry.getTime() - new Date(now + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24),
        );
        return (
          <div
            key={inc.id}
            className={`flex items-start gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-xs ${
              !active ? "opacity-40" : ""
            }`}
          >
            <div className="flex-1">
              <p className="text-white/70">{inc.incidentDescription}</p>
              <p className="text-white/30 mt-0.5">
                R{inc.round} {inc.raceName} &middot; {inc.session} &middot;{" "}
                {new Date(inc.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-white/80">
                +{inc.decision.penaltyPoints} pt{inc.decision.penaltyPoints > 1 ? "s" : ""}
              </p>
              <p className={`mt-0.5 ${active ? (daysUntil <= 60 ? "text-orange-400" : "text-white/30") : "text-red-400/60"}`}>
                {active ? `Expires in ${daysUntil}d` : "Expired"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ActivePointsView({
  summaries,
}: {
  summaries: DriverPenaltySummary[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("activePoints");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const driversNearBan = useMemo(
    () => summaries.filter((s) => s.activePoints >= 8),
    [summaries],
  );

  const sorted = useMemo(() => {
    const list = [...summaries];
    list.sort((a, b) => {
      let result = 0;
      switch (sortKey) {
        case "driver":
          result = a.driverName.localeCompare(b.driverName);
          break;
        case "team":
          result = a.teamName.localeCompare(b.teamName);
          break;
        case "activePoints":
          result = a.activePoints - b.activePoints;
          break;
        case "totalIncidents":
          result = a.totalIncidents - b.totalIncidents;
          break;
        case "nextExpiry":
          result =
            (a.nextExpiry?.date ?? "9999").localeCompare(b.nextExpiry?.date ?? "9999");
          break;
      }
      return sortDir === "asc" ? result : -result;
    });
    return list;
  }, [summaries, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "driver" || key === "team" ? "asc" : "desc");
    }
  };

  const cols: { key: SortKey; label: string; className?: string }[] = [
    { key: "driver", label: "Driver" },
    { key: "team", label: "Team" },
    { key: "activePoints", label: "Active Points" },
    { key: "totalIncidents", label: "Incidents", className: "text-center" },
    { key: "nextExpiry", label: "Next Expiry" },
  ];

  return (
    <div className="space-y-6">
      {/* Ban Alert Banner */}
      {driversNearBan.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2">
            Race Ban Alert — {BAN_THRESHOLD} Points = Automatic 1-Race Ban
          </h3>
          <div className="space-y-1.5">
            {driversNearBan.map((d) => (
              <div key={d.driverId} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-white">{d.driverName}</span>
                <span className="font-mono text-red-400">
                  {d.activePoints}/{BAN_THRESHOLD}
                </span>
                <span className="text-white/30">
                  — {BAN_THRESHOLD - d.activePoints} point{BAN_THRESHOLD - d.activePoints !== 1 ? "s" : ""} from ban
                </span>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Points Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/50 hover:text-white/70 ${col.className ?? ""}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-white/50">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((d) => {
              const flag = nationalityToFlag(d.nationality);
              const isExpanded = expandedDriver === d.driverId;
              return (
                <tr
                  key={d.driverId}
                  className={`transition-colors ${
                    d.activeIncidents.length > 0
                      ? "cursor-pointer hover:bg-white/[0.03]"
                      : ""
                  } ${isExpanded ? "bg-white/[0.02]" : ""}`}
                  onClick={() =>
                    d.activeIncidents.length > 0 &&
                    setExpandedDriver(isExpanded ? null : d.driverId)
                  }
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {d.activeIncidents.length > 0 && (
                        <span className="text-[10px] text-white/20 w-3">
                          {isExpanded ? "\u25BC" : "\u25B6"}
                        </span>
                      )}
                      {!d.activeIncidents.length && <span className="w-3" />}
                      {flag && <span className="text-sm">{flag}</span>}
                      <span className="font-medium text-white">{d.driverName}</span>
                    </div>
                    {isExpanded && (
                      <div className="ml-5 mt-1">
                        <ExpandedIncidents incidents={d.activeIncidents} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: d.teamColor }}
                      />
                      <span className="text-white/60">{d.teamName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 min-w-[140px]">
                    <ProgressBar points={d.activePoints} color={d.teamColor} />
                  </td>
                  <td className="px-3 py-3 text-center text-white/50">
                    {d.totalIncidents}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {d.nextExpiry ? (
                      <span className="text-white/40">
                        {new Date(d.nextExpiry.date + "T00:00:00").toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        <span className="ml-1.5 text-emerald-400/60">
                          −{d.nextExpiry.points}pt{d.nextExpiry.points > 1 ? "s" : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <StatusBadge status={d.status} />
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
