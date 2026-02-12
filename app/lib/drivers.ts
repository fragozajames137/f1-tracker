import type { ContractStatus } from "@/app/types";

export const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; detailLabel: string; className: string }
> = {
  locked: {
    label: "Locked",
    detailLabel: "Locked In",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  expiring: {
    label: "Expiring",
    detailLabel: "Contract Expiring",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  open: {
    label: "Open",
    detailLabel: "Open Seat",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function getInitials(name: string): string {
  if (name === "TBD") return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
