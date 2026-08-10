import { describe, it, expect } from "vitest";
import { getPhProvinces, getPhMunicipalities, getPhBarangays, getPhPostalCode } from "./ph-address";

describe("ph-address (real province/city/barangay + postal data, not invented)", () => {
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

  it("has real barangay data for actual cities, not just municipalities (regression: the psgc package this was originally built on returned zero barangays for every Cavite city)", () => {
    // Dasmariñas is a known gap in this dataset too (absent as a
    // selectable entry entirely, not just missing barangays) — see the
    // AddressFields manual-entry fallback and docs/integrations/
    // DEPENDENCY_REGISTRY.md. Not included here since it's a confirmed
    // data gap, not a code bug this test should catch.
    for (const city of ["Imus", "Bacoor", "Cavite", "Tagaytay", "Trece Martires"]) {
      expect(getPhBarangays("Cavite", city).length).toBeGreaterThan(0);
    }
  });

  it(
    "has no province/city with zero barangays anywhere among listed entries (broad sanity check; does not catch entries missing entirely, like Dasmariñas)",
    () => {
      for (const province of getPhProvinces()) {
        for (const city of getPhMunicipalities(province)) {
          expect(getPhBarangays(province, city).length).toBeGreaterThan(0);
        }
      }
    },
    // Sweeps ~1,600 municipalities — passes in ~1s alone, but the default
    // 5s testTimeout can be exceeded under CPU contention now that several
    // *.integration.test.ts files (each booting a PGlite instance) run in
    // parallel alongside it (observed 2026-08-11 running the full suite
    // together, not a regression in this test's own logic).
    15_000,
  );

  it("auto-fills Kawit's real postal code (4104)", () => {
    expect(getPhPostalCode("Kawit")).toBe("4104");
  });

  it("auto-fills Imus's real postal code (4103)", () => {
    expect(getPhPostalCode("Imus")).toBe("4103");
  });

  it("returns null for an unrecognized municipality rather than throwing", () => {
    expect(getPhPostalCode("Not A Real Place")).toBeNull();
  });
});
