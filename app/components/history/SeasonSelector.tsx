"use client";

interface SeasonSelectorProps {
  seasons: number[];
  selected: number;
  onChange: (year: number) => void;
  disabled?: boolean;
}

export default function SeasonSelector({
  seasons,
  selected,
  onChange,
  disabled,
}: SeasonSelectorProps) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      disabled={disabled}
      aria-label="Select season"
      className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {seasons.map((year) => (
        <option key={year} value={year} className="bg-[#111]">
          {year}
        </option>
      ))}
    </select>
  );
}
