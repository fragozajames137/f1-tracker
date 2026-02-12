import Image from "next/image";

interface FlagProps {
  iso: string;
  size?: number;
  className?: string;
}

export default function Flag({ iso, size = 20, className = "" }: FlagProps) {
  return (
    <Image
      src={`/flags/${iso.toLowerCase()}.svg`}
      alt={`${iso.toUpperCase()} flag`}
      width={Math.round(size * (4 / 3))}
      height={size}
      className={`rounded-sm ${className}`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
