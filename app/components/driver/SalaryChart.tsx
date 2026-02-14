import { DriverContract } from "@/app/types";
import { formatSalary } from "@/app/lib/format";

interface SalaryChartProps {
  contract: DriverContract;
  teamColor: string;
}

export default function SalaryChart({ contract, teamColor }: SalaryChartProps) {
  if (!contract.estimatedSalary && !contract.salaryHistory) return null;

  const maxSalary = contract.salaryHistory?.length
    ? Math.max(...contract.salaryHistory.map((s) => s.salary))
    : 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
        Salary & Earnings
      </h3>

      {/* Current salary + career earnings */}
      <div className="flex items-baseline justify-between mb-4">
        {contract.estimatedSalary && (
          <div>
            <p className="text-2xl font-bold text-white">{contract.estimatedSalary}</p>
            <p className="text-xs text-white/40">Est. annual salary</p>
          </div>
        )}
        {contract.careerEarnings && (
          <div className="text-right">
            <p className="text-lg font-semibold text-white/80">
              {formatSalary(contract.careerEarnings)}
            </p>
            <p className="text-xs text-white/40">Career earnings</p>
          </div>
        )}
      </div>

      {/* Year-by-year salary bar chart */}
      {contract.salaryHistory && contract.salaryHistory.length > 0 && (
        <div className="space-y-1.5">
          {contract.salaryHistory.map((s) => (
            <div key={s.year} className="group flex items-center gap-2 text-xs">
              <span
                className={`w-8 font-mono tabular-nums ${s.year === 2026 ? "text-white font-semibold" : "text-white/50"}`}
              >
                {String(s.year).slice(2)}
              </span>
              <div className="relative flex-1 h-4 rounded-sm overflow-hidden bg-white/5">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{
                    width: `${(s.salary / maxSalary) * 100}%`,
                    backgroundColor: s.isEstimate ? `${teamColor}60` : teamColor,
                    borderRight: s.isEstimate ? `2px dashed ${teamColor}` : "none",
                  }}
                />
              </div>
              <span
                className={`w-14 text-right font-mono tabular-nums ${s.isEstimate ? "text-white/30 italic" : "text-white/60"}`}
              >
                {formatSalary(s.salary)}
              </span>
            </div>
          ))}
        </div>
      )}

      {contract.notes && (
        <p className="mt-3 text-xs text-white/30 leading-relaxed">{contract.notes}</p>
      )}
    </div>
  );
}
