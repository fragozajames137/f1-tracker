import { memo } from "react";
import Image from "next/image";

const TIRE_IMAGE: Record<string, string> = {
  SOFT: "/tires/soft.svg",
  MEDIUM: "/tires/medium.svg",
  HARD: "/tires/hard.svg",
  INTERMEDIATE: "/tires/intermediate.svg",
  WET: "/tires/wet.svg",
};

interface TireIconProps {
  compound: string;
  size?: number;
}

export default memo(function TireIcon({ compound, size = 22 }: TireIconProps) {
  const src = TIRE_IMAGE[compound.toUpperCase()];
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={`${compound} tire`}
      width={size}
      height={size}
      className="shrink-0"
    />
  );
});
