"use client";

interface CompareStatBarProps {
  label: string;
  valueA: number;
  valueB: number;
  colorA: string;
  colorB: string;
  format?: (v: number) => string;
  lowerIsBetter?: boolean;
}

export default function CompareStatBar({
  label,
  valueA,
  valueB,
  colorA,
  colorB,
  format = (v) => String(v),
  lowerIsBetter = false,
}: CompareStatBarProps) {
  const max = Math.max(valueA, valueB);
  const barA = max > 0 ? (valueA / max) * 100 : 0;
  const barB = max > 0 ? (valueB / max) * 100 : 0;

  const aWins = lowerIsBetter
    ? valueA < valueB
    : valueA > valueB;
  const bWins = lowerIsBetter
    ? valueB < valueA
    : valueB > valueA;
  const tie = valueA === valueB;

  return (
    <div className="flex items-center gap-2">
      {/* Driver A side */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <span
          className="font-mono text-[11px] font-medium shrink-0 sm:text-sm"
          style={{ color: colorA, opacity: aWins || tie ? 1 : 0.4 }}
        >
          {format(valueA)}
        </span>
        <div className="h-5 w-full max-w-[120px] sm:max-w-[180px]">
          <div
            className="ml-auto h-full rounded-l-sm transition-all"
            style={{
              width: `${barA}%`,
              backgroundColor: colorA,
              opacity: aWins || tie ? 0.7 : 0.2,
            }}
          />
        </div>
      </div>

      {/* Label */}
      <span className="w-20 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:w-28 sm:text-xs">
        {label}
      </span>

      {/* Driver B side */}
      <div className="flex flex-1 items-center gap-2">
        <div className="h-5 w-full max-w-[120px] sm:max-w-[180px]">
          <div
            className="h-full rounded-r-sm transition-all"
            style={{
              width: `${barB}%`,
              backgroundColor: colorB,
              opacity: bWins || tie ? 0.7 : 0.2,
            }}
          />
        </div>
        <span
          className="font-mono text-[11px] font-medium shrink-0 sm:text-sm"
          style={{ color: colorB, opacity: bWins || tie ? 1 : 0.4 }}
        >
          {format(valueB)}
        </span>
      </div>
    </div>
  );
}
