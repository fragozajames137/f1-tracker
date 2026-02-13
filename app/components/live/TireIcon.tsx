import { memo } from "react";

const TIRE_CONFIG: Record<string, { letter: string; ring: string }> = {
  SOFT: { letter: "S", ring: "#ef4444" },
  MEDIUM: { letter: "M", ring: "#eab308" },
  HARD: { letter: "H", ring: "#ffffff" },
  INTERMEDIATE: { letter: "I", ring: "#22c55e" },
  WET: { letter: "W", ring: "#3b82f6" },
};

interface TireIconProps {
  compound: string;
  size?: number;
}

export default memo(function TireIcon({ compound, size = 22 }: TireIconProps) {
  const config = TIRE_CONFIG[compound.toUpperCase()];
  if (!config) return null;

  const r = size / 2;
  const outerR = r - 1;
  const ringWidth = size * 0.14;
  const innerR = outerR - ringWidth;
  const letterSize = size * 0.45;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${compound} tire`}
      className="shrink-0"
    >
      {/* Colored ring */}
      <circle cx={r} cy={r} r={outerR} fill={config.ring} />
      {/* Dark inner circle */}
      <circle cx={r} cy={r} r={innerR} fill="#1a1a1a" />
      {/* Letter */}
      <text
        x={r}
        y={r}
        dy="0.36em"
        textAnchor="middle"
        fill="white"
        fontSize={letterSize}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {config.letter}
      </text>
    </svg>
  );
});
