import circuitsData from "@/app/data/gp-circuits.json";
import contractsData from "@/app/data/gp-contracts-2026.json";
import hostNationsData from "@/app/data/gp-host-nations.json";
import type { GpCircuit, GpContract, GpHostNation } from "@/app/types/f1-reference";

const circuits = circuitsData as GpCircuit[];
const contracts = contractsData as GpContract[];
const hostNations = hostNationsData as GpHostNation[];

// Index by lowercase circuit name for fast lookup
const circuitIndex = new Map<string, GpCircuit>(
  circuits.map((c) => [c.circuit.toLowerCase(), c]),
);

// Index contracts by lowercase grand prix name
const contractIndex = new Map<string, GpContract>(
  contracts.map((c) => [c.grandPrix.toLowerCase(), c]),
);

// Index host nations by lowercase country name
const hostNationIndex = new Map<string, GpHostNation>(
  hostNations.map((n) => [n.country.toLowerCase(), n]),
);

export function getCircuitByName(circuitName: string): GpCircuit | null {
  return circuitIndex.get(circuitName.toLowerCase()) ?? null;
}

export function getContractByRaceName(raceName: string): GpContract | null {
  return contractIndex.get(raceName.toLowerCase()) ?? null;
}

export function getHostNation(country: string): GpHostNation | null {
  return hostNationIndex.get(country.toLowerCase()) ?? null;
}
