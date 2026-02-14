"use client";

import { useState } from "react";
import { Driver, Team, DriverContract } from "@/app/types";
import type { F1HistoricalDriver } from "@/app/types/f1-reference";
import type { DriverNumberUsage } from "@/app/lib/grid-data";
import DriverHeader from "./DriverHeader";
import ContractStatusBadge from "./ContractStatusBadge";
import SalaryChart from "./SalaryChart";
import TransactionsTimeline from "./TransactionsTimeline";
import SocialLinks from "./SocialLinks";
import SeasonSummaryTab from "./SeasonSummaryTab";
import RaceResultsTab from "./RaceResultsTab";
import CareerTab from "./CareerTab";
import NumberHistory from "./NumberHistory";

type TabKey = "overview" | "seasons" | "results" | "career" | "social";

const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "seasons", label: "Seasons" },
  { key: "results", label: "Results" },
  { key: "career", label: "Career" },
  { key: "social", label: "Social" },
];

interface DriverProfileTabsProps {
  driver: Driver;
  team: Team;
  contract: DriverContract | null;
  historicalDriver?: F1HistoricalDriver | null;
  numberHistory?: DriverNumberUsage[];
}

export default function DriverProfileTabs({
  driver,
  team,
  contract,
  historicalDriver,
  numberHistory,
}: DriverProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const accentColor = team.id === "cadillac" ? "#FFFFFF" : team.color;

  // Filter out tabs without data
  const hasSocials = driver.socials && Object.values(driver.socials).some(Boolean);
  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.key === "social") return hasSocials;
    if (t.key === "career") return !!historicalDriver;
    return true;
  });

  return (
    <div>
      {/* Driver Header */}
      <DriverHeader driver={driver} team={team} />

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Driver profile sections"
        className="mt-6 flex gap-1 border-b border-white/10"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
            style={
              activeTab === tab.key
                ? { borderBottomColor: accentColor }
                : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6 space-y-6" role="tabpanel">
        {activeTab === "overview" && (
          <>
            <ContractStatusBadge driver={driver} />
            {contract && <SalaryChart contract={contract} teamColor={accentColor} />}
            {contract?.transactions && (
              <TransactionsTimeline
                transactions={contract.transactions}
                teamColor={accentColor}
              />
            )}
            {numberHistory && numberHistory.length > 0 && (
              <NumberHistory
                usages={numberHistory}
                currentNumber={driver.number}
                teamColor={accentColor}
              />
            )}
          </>
        )}

        {activeTab === "seasons" && (
          <SeasonSummaryTab driverId={driver.id} teamColor={accentColor} />
        )}

        {activeTab === "results" && (
          <RaceResultsTab driverId={driver.id} teamColor={accentColor} />
        )}

        {activeTab === "career" && historicalDriver && (
          <CareerTab historicalDriver={historicalDriver} teamColor={accentColor} />
        )}

        {activeTab === "social" && driver.socials && (
          <SocialLinks socials={driver.socials} />
        )}
      </div>
    </div>
  );
}
