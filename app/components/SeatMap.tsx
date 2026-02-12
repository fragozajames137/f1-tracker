"use client";

import { useState } from "react";
import { Driver, Team, GridData } from "@/app/types";
import TeamRow from "./TeamRow";
import DetailPanel from "./DetailPanel";

interface SeatMapProps {
  data: GridData;
}

export default function SeatMap({ data }: SeatMapProps) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleSelect = (driver: Driver, team: Team) => {
    setSelectedDriver(driver);
    setSelectedTeam(team);
  };

  const handleClose = () => {
    setSelectedDriver(null);
    setSelectedTeam(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.teams.map((team) => (
          <TeamRow key={team.id} team={team} onSelectDriver={handleSelect} />
        ))}
      </div>

      <DetailPanel driver={selectedDriver} team={selectedTeam} onClose={handleClose} />
    </>
  );
}
