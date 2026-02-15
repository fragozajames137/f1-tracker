"use client";

import { useMemo } from "react";
import { GridData } from "@/app/types";
import { usePreferencesStore } from "@/app/stores/preferences";
import TeamRow from "./TeamRow";

interface SeatMapProps {
  data: GridData;
}

export default function SeatMap({ data }: SeatMapProps) {
  const favoriteTeamId = usePreferencesStore((s) => s.favoriteTeamId);

  const sortedTeams = useMemo(() => {
    if (!favoriteTeamId) return data.teams;
    const fav = data.teams.find((t) => t.id === favoriteTeamId);
    if (!fav) return data.teams;
    return [fav, ...data.teams.filter((t) => t.id !== favoriteTeamId)];
  }, [data.teams, favoriteTeamId]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {sortedTeams.map((team) => (
        <TeamRow key={team.id} team={team} isFavorite={team.id === favoriteTeamId} />
      ))}
    </div>
  );
}
