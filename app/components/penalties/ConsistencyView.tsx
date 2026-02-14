"use client";

import type { ConsistencyGroup } from "@/app/types/penalties";
import type { DriverPenaltySummary } from "@/app/types/penalties";
import { INCIDENT_TYPE_LABELS } from "@/app/lib/penalties";

function VarianceBadge({ variance }: { variance: number }) {
  const isConsistent = variance <= 0.1;
  const isMixed = variance <= 0.3;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isConsistent
          ? "bg-emerald-500/15 text-emerald-400"
          : isMixed
            ? "bg-yellow-500/15 text-yellow-400"
            : "bg-red-500/15 text-red-400"
      }`}
    >
      {isConsistent ? "Consistent" : isMixed ? "Mixed" : "Inconsistent"}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

export default function ConsistencyView({
  groups,
  summaries,
}: {
  groups: ConsistencyGroup[];
  summaries: DriverPenaltySummary[];
}) {
  const mostInconsistent = groups[0]; // already sorted by variance desc

  return (
    <div className="space-y-6">
      {/* Summary Callout */}
      {mostInconsistent && mostInconsistent.variance > 0.1 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-1">
            Most Inconsistently Penalized
          </h3>
          <p className="text-sm text-white/60">
            <span className="font-medium text-white">
              {INCIDENT_TYPE_LABELS[mostInconsistent.incidentType]}
            </span>{" "}
            — {mostInconsistent.count} incidents with penalty points ranging from{" "}
            {mostInconsistent.minPoints} to {mostInconsistent.maxPoints} (variance:{" "}
            {mostInconsistent.variance})
          </p>
        </div>
      )}

      {/* Incident Type Groups */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div
            key={group.incidentType}
            className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-semibold text-white flex-1">
                {group.label}
              </h3>
              <span className="text-xs text-white/30">
                {group.count} incident{group.count !== 1 ? "s" : ""}
              </span>
              <VarianceBadge variance={group.variance} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatCard label="Min Points" value={group.minPoints} />
              <StatCard label="Avg Points" value={group.avgPoints} />
              <StatCard label="Max Points" value={group.maxPoints} />
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-2 py-1.5 text-left text-white/50">Date</th>
                    <th className="px-2 py-1.5 text-left text-white/50">Driver</th>
                    <th className="px-2 py-1.5 text-left text-white/50">Race</th>
                    <th className="px-2 py-1.5 text-center text-white/50">Points</th>
                    <th className="px-2 py-1.5 text-left text-white/50">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {group.incidents.map((inc) => {
                    const driver = summaries.find(
                      (s) => s.driverId === inc.driverId,
                    );
                    return (
                      <tr key={inc.id}>
                        <td className="whitespace-nowrap px-2 py-1.5 text-white/40">
                          {new Date(inc.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-2 py-1.5 text-white/70">
                          {driver?.driverName ?? inc.driverId}
                        </td>
                        <td className="px-2 py-1.5 text-white/40">
                          {inc.raceName}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono font-bold text-white">
                          {inc.decision.penaltyPoints}
                        </td>
                        <td className="px-2 py-1.5 text-white/40 max-w-[250px] truncate">
                          {inc.incidentDescription}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-white/30 text-center py-8">
          Not enough data to analyze consistency — need at least 2 incidents of the
          same type with penalty points.
        </p>
      )}
    </div>
  );
}
