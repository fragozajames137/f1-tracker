"use client";

import { useState } from "react";
import Image from "next/image";
import { driverSrc, logoSrc } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";

// Jolpica nationality string → ISO 3166-1 alpha-2 code
const JOLPICA_NATIONALITY_TO_ISO: Record<string, string> = {
  American: "us", Argentine: "ar", Australian: "au", Austrian: "at",
  Belgian: "be", Brazilian: "br", British: "gb", Canadian: "ca",
  Chilean: "cl", Chinese: "cn", Colombian: "co", Danish: "dk",
  Dutch: "nl", "East German": "de", Estonian: "ee", Finnish: "fi",
  French: "fr", German: "de", "Hong Kong": "hk", Hungarian: "hu",
  Indian: "in", Indonesian: "id", Irish: "ie", Italian: "it",
  Japanese: "jp", Korean: "kr", Liechtensteiner: "li", Malaysian: "my",
  Mexican: "mx", Monegasque: "mc", "New Zealander": "nz", Polish: "pl",
  Portuguese: "pt", Rhodesian: "zw", Russian: "ru", "Saudi Arabian": "sa",
  "South African": "za", Spanish: "es", Swedish: "se", Swiss: "ch",
  Thai: "th", Turkish: "tr", Uruguayan: "uy", Venezuelan: "ve",
};

// Jolpica constructorId → local logo filename
const CONSTRUCTOR_LOGO_MAP: Record<string, string> = {
  "red-bull": "red-bull", "mclaren": "mclaren", "ferrari": "ferrari",
  "mercedes": "mercedes", "aston-martin": "aston-martin", "alpine": "alpine",
  "williams": "williams", "racing-bulls": "racing-bulls", "audi": "audi",
  "haas": "haas", "cadillac": "cadillac",
  "rb": "rb", "alphatauri": "alphatauri",
  "alfa": "alfa-romeo", "alfa-romeo": "alfa-romeo",
  "sauber": "sauber", "kick-sauber": "sauber",
  "renault": "renault",
  "racing-point": "racing-point", "toro-rosso": "toro-rosso",
  "force-india": "force-india", "lotus-f1": "lotus-f1",
  "manor": "manor", "marussia": "marussia", "caterham": "caterham",
  "hrt": "hrt", "lotus-racing": "lotus-racing", "virgin": "virgin",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driverKey(familyName: string): string {
  return stripAccents(familyName).toLowerCase().replace(/\s+/g, "-");
}

export function NationalityFlag({ nationality }: { nationality: string }) {
  const code = JOLPICA_NATIONALITY_TO_ISO[nationality];
  if (!code) return null;
  return (
    <Image
      src={`/flags/${code}.svg`}
      alt={nationality}
      width={16}
      height={12}
      className="h-3 w-4 shrink-0 rounded-[2px] object-cover"
    />
  );
}

export function DriverImg({ familyName, name, nationality }: { familyName: string; name: string; nationality?: string }) {
  const [attempt, setAttempt] = useState(0); // 0=optimized, 1=webp, 2=png, 3=flag, 4=text
  const key = driverKey(familyName);
  const blur = getBlurPlaceholder(`drivers/${key}`);
  if (attempt === 3) {
    const code = nationality ? JOLPICA_NATIONALITY_TO_ISO[nationality] : undefined;
    if (code) {
      return (
        <Image
          src={`/flags/${code}.svg`}
          alt={nationality!}
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
          onError={() => setAttempt(4)}
        />
      );
    }
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40">
        {name.charAt(0)}
      </span>
    );
  }
  if (attempt >= 4) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40">
        {name.charAt(0)}
      </span>
    );
  }
  const srcMap = [driverSrc(key, 48), `/drivers/${key}.webp`, `/drivers/${key}.png`];
  return (
    <Image
      src={srcMap[attempt]}
      alt={name}
      width={24}
      height={24}
      className="h-6 w-6 shrink-0 rounded-full object-cover"
      placeholder={attempt === 0 && blur ? "blur" : undefined}
      blurDataURL={attempt === 0 ? blur : undefined}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

export function TeamLogo({ constructorId, name, size = 20 }: { constructorId: string; name: string; size?: number }) {
  const [attempt, setAttempt] = useState(0); // 0=optimized, 1=webp, 2=png, 3=svg, 4=give up
  const mapped = constructorId.replace(/_/g, "-");
  const fileKey = CONSTRUCTOR_LOGO_MAP[mapped] ?? mapped;
  const blur = getBlurPlaceholder(`logos/${fileKey}`);
  if (attempt >= 4) return null;
  const srcMap = [
    logoSrc(fileKey, size >= 20 ? 48 : 24),
    `/logos/${fileKey}.webp`,
    `/logos/${fileKey}.png`,
    `/logos/${fileKey}.svg`,
  ];
  const cls = size >= 20 ? "h-5 w-auto shrink-0 object-contain" : "h-4 w-auto shrink-0 object-contain";
  return (
    <Image
      src={srcMap[attempt]}
      alt={name}
      width={size}
      height={size}
      className={cls}
      placeholder={attempt === 0 && blur ? "blur" : undefined}
      blurDataURL={attempt === 0 ? blur : undefined}
      onError={() => setAttempt(a => a + 1)}
    />
  );
}
