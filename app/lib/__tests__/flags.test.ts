import { describe, it, expect } from "vitest";
import { nationalityToIso, countryToIso, nationalityToFlag, countryToFlag } from "../flags";

describe("nationalityToIso", () => {
  it("maps known nationality codes", () => {
    expect(nationalityToIso("NED")).toBe("NL");
    expect(nationalityToIso("GBR")).toBe("GB");
    expect(nationalityToIso("USA")).toBe("US");
    expect(nationalityToIso("JPN")).toBe("JP");
    expect(nationalityToIso("DEN")).toBe("DK");
  });

  it("returns null for unknown codes", () => {
    expect(nationalityToIso("XYZ")).toBeNull();
    expect(nationalityToIso("")).toBeNull();
  });
});

describe("countryToIso", () => {
  it("maps known country names", () => {
    expect(countryToIso("Australia")).toBe("AU");
    expect(countryToIso("UK")).toBe("GB");
    expect(countryToIso("USA")).toBe("US");
    expect(countryToIso("Monaco")).toBe("MC");
  });

  it("maps Las Vegas to US", () => {
    expect(countryToIso("Las Vegas")).toBe("US");
  });

  it("returns null for unknown countries", () => {
    expect(countryToIso("Narnia")).toBeNull();
  });
});

describe("nationalityToFlag", () => {
  it("returns flag emoji for known nationality", () => {
    const flag = nationalityToFlag("NED");
    expect(flag).toBeTruthy();
    expect(flag.length).toBeGreaterThan(0);
  });

  it("returns empty string for unknown nationality", () => {
    expect(nationalityToFlag("XYZ")).toBe("");
  });
});

describe("countryToFlag", () => {
  it("returns flag emoji for known country", () => {
    const flag = countryToFlag("Brazil");
    expect(flag).toBeTruthy();
  });

  it("returns empty string for unknown country", () => {
    expect(countryToFlag("Unknown")).toBe("");
  });
});
