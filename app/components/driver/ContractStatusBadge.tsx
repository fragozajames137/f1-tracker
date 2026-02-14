import { Driver } from "@/app/types";
import { STATUS_CONFIG } from "@/app/lib/drivers";

interface ContractStatusBadgeProps {
  driver: Driver;
}

export default function ContractStatusBadge({ driver }: ContractStatusBadgeProps) {
  const status = STATUS_CONFIG[driver.contractStatus];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
        Contract Status
      </h3>
      <span
        className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${status.className}`}
      >
        {status.detailLabel}
      </span>
      {driver.contractEnd && (
        <p className="mt-2 text-sm text-white/50">
          Contract expires end of{" "}
          <span className="text-white/80 font-medium">{driver.contractEnd}</span>
        </p>
      )}
      {!driver.contractEnd && driver.contractStatus === "open" && (
        <p className="mt-2 text-sm text-white/50 italic">No driver announced</p>
      )}
    </div>
  );
}
