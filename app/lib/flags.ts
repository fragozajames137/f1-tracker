const NATIONALITY_TO_ISO: Record<string, string> = {
  NED: "NL",
  FRA: "FR",
  GBR: "GB",
  AUS: "AU",
  MON: "MC",
  ITA: "IT",
  ESP: "ES",
  CAN: "CA",
  THA: "TH",
  NZL: "NZ",
  GER: "DE",
  BRA: "BR",
  MEX: "MX",
  FIN: "FI",
  ARG: "AR",
  JPN: "JP",
  DEN: "DK",
  BEL: "BE",
  EST: "EE",
  IND: "IN",
  CHN: "CN",
  USA: "US",
};

export function nationalityToIso(nationality: string): string | null {
  return NATIONALITY_TO_ISO[nationality] ?? null;
}

export function nationalityToFlag(nationality: string): string {
  const iso = NATIONALITY_TO_ISO[nationality];
  if (!iso) return "";
  return isoToFlag(iso);
}

function isoToFlag(iso: string): string {
  return String.fromCodePoint(
    ...iso.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

const COUNTRY_TO_ISO: Record<string, string> = {
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahrain: "BH",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  China: "CN",
  France: "FR",
  Germany: "DE",
  Hungary: "HU",
  India: "IN",
  Italy: "IT",
  Japan: "JP",
  Korea: "KR",
  Malaysia: "MY",
  Mexico: "MX",
  Monaco: "MC",
  Netherlands: "NL",
  Portugal: "PT",
  Qatar: "QA",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Turkey: "TR",
  UAE: "AE",
  UK: "GB",
  USA: "US",
  Vietnam: "VN",
  "South Africa": "ZA",
  "Las Vegas": "US",
};

export function countryToIso(country: string): string | null {
  return COUNTRY_TO_ISO[country] ?? null;
}

export function countryToFlag(country: string): string {
  const iso = COUNTRY_TO_ISO[country];
  if (!iso) return "";
  return isoToFlag(iso);
}
