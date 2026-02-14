import { GridData } from "@/app/types";
import TeamRow from "./TeamRow";

interface SeatMapProps {
  data: GridData;
}

export default function SeatMap({ data }: SeatMapProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {data.teams.map((team) => (
        <TeamRow key={team.id} team={team} />
      ))}
    </div>
  );
}
