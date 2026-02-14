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
  PAR: "PY",
  BUL: "BG",
  SGP: "SG",
  UKR: "UA",
  SUI: "CH",
  SWE: "SE",
  IRL: "IE",
  AUT: "AT",
  COL: "CO",
  POL: "PL",
  RSA: "ZA",
  POR: "PT",
  HUN: "HU",
  CZE: "CZ",
  VEN: "VE",
  IDN: "ID",
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
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahrain: "BH",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  Chile: "CL",
  China: "CN",
  Colombia: "CO",
  "Czech Republic": "CZ",
  Denmark: "DK",
  "East Germany": "DE",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  Hungary: "HU",
  India: "IN",
  Indonesia: "ID",
  Ireland: "IE",
  Italy: "IT",
  Japan: "JP",
  Korea: "KR",
  "South Korea": "KR",
  Liechtenstein: "LI",
  Malaysia: "MY",
  Mexico: "MX",
  Monaco: "MC",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Poland: "PL",
  Portugal: "PT",
  Qatar: "QA",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  "South Africa": "ZA",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Thailand: "TH",
  Turkey: "TR",
  UAE: "AE",
  "United Arab Emirates": "AE",
  UK: "GB",
  "United Kingdom": "GB",
  "United States": "US",
  Uruguay: "UY",
  USA: "US",
  Venezuela: "VE",
  Vietnam: "VN",
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
