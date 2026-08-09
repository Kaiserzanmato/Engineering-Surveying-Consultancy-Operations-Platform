import { describe, it, expect } from "vitest";
import { getPhProvinces, getPhMunicipalities, getPhBarangays, getPhPostalCode } from "./ph-address";

describe("ph-address (real PSA/PSGC + postal data, not invented)", () => {
  it("includes Cavite among the provinces", () => {
    expect(getPhProvinces()).toContain("Cavite");
  });

  it("lists Kawit, Imus, General Trias, Tanza under Cavite (the user's own example)", () => {
    const municipalities = getPhMunicipalities("Cavite");
    for (const name of ["Kawit", "Imus", "General Trias", "Tanza"]) {
      expect(municipalities).toContain(name);
    }
  });

  it("lists Tabon I and Tabon II among Kawit's barangays (the user's own example)", () => {
    const barangays = getPhBarangays("Cavite", "Kawit");
    expect(barangays).toContain("Tabon I");
    expect(barangays).toContain("Tabon II");
  });

  it("returns an empty list for a municipality that doesn't belong to the given province", () => {
    expect(getPhBarangays("Cavite", "Baguio")).toEqual([]);
  });

  it("auto-fills Kawit's real postal code (4104)", () => {
    expect(getPhPostalCode("Kawit")).toBe("4104");
  });

  it("returns null for an unrecognized municipality rather than throwing", () => {
    expect(getPhPostalCode("Not A Real Place")).toBeNull();
  });
});
