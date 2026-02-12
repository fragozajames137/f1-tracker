import { describe, it, expect } from "vitest";
import { STATUS_CONFIG, getInitials } from "../drivers";

describe("STATUS_CONFIG", () => {
  it("has all three contract statuses", () => {
    expect(STATUS_CONFIG).toHaveProperty("locked");
    expect(STATUS_CONFIG).toHaveProperty("expiring");
    expect(STATUS_CONFIG).toHaveProperty("open");
  });

  it("each status has label, detailLabel, and className", () => {
    for (const key of ["locked", "expiring", "open"] as const) {
      const config = STATUS_CONFIG[key];
      expect(config.label).toBeTruthy();
      expect(config.detailLabel).toBeTruthy();
      expect(config.className).toBeTruthy();
    }
  });

  it("locked status has green styling", () => {
    expect(STATUS_CONFIG.locked.className).toContain("green");
  });

  it("expiring status has yellow styling", () => {
    expect(STATUS_CONFIG.expiring.className).toContain("yellow");
  });

  it("open status has red styling", () => {
    expect(STATUS_CONFIG.open.className).toContain("red");
  });
});

describe("getInitials", () => {
  it("extracts initials from a full name", () => {
    expect(getInitials("Max Verstappen")).toBe("MV");
    expect(getInitials("Charles Leclerc")).toBe("CL");
  });

  it("handles single-word names", () => {
    expect(getInitials("Senna")).toBe("S");
  });

  it("returns ? for TBD", () => {
    expect(getInitials("TBD")).toBe("?");
  });

  it("limits to 2 characters for three-word names", () => {
    expect(getInitials("Carlos Sainz Jr")).toBe("CS");
  });

  it("uppercases initials", () => {
    expect(getInitials("lando norris")).toBe("LN");
  });
});
