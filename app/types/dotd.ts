export interface DOTDCandidate {
  driverId: string;
  driverName: string;
  percentage: number;
}

export interface DOTDRace {
  round: number;
  raceName: string;
  date: string;
  winnerId: string;
  winnerName: string;
  topFive: DOTDCandidate[];
}

export interface DOTDSeason {
  season: number;
  lastUpdated: string;
  races: DOTDRace[];
}

export interface DOTDDriverStats {
  driverId: string;
  driverName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  nationality: string;
  wins: number;
  topFives: number;
  avgPercentage: number;
  races: { round: number; raceName: string; percentage: number; won: boolean }[];
}

export interface DOTDHighlights {
  biggestLandslide: { driverName: string; raceName: string; percentage: number };
  closestVote: { winnerName: string; runnerUpName: string; raceName: string; margin: number };
  mostTopFives: { driverName: string; count: number; wins: number };
  totalVotersEstimate: null;
}
