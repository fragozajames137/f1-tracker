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

export function nationalityToFlag(nationality: string): string {
  const iso = NATIONALITY_TO_ISO[nationality];
  if (!iso) return "";
  return String.fromCodePoint(
    ...iso.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
