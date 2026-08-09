// Real Philippine geographic data — NOT hand-authored. `phil-reg-prov-mun-brgy`
// bundles a province/city-municipality/barangay hierarchy (no runtime deps);
// `use-postal-ph` provides postal codes per municipality. Two independently
// -maintained packages, cross-referenced here by normalized municipality name.
//
// Switched from the `psgc` package (tried first) after discovering a real
// data gap: psgc returns ZERO barangays for every actual *city* in Cavite
// (Bacoor, Cavite City, Dasmariñas, Imus, Tagaytay, Trece Martires all
// empty) and some municipalities too (General Trias) — found via a user
// bug report ("Kawit works, Imus doesn't"), not caught by the original
// spot-check (which happened to only test Kawit, a municipality, not a
// city). This package was checked against the same cases before switching:
// Imus City -> 97 real barangays; Kawit -> 23 barangays including "Tabon I"
// and "Tabon II" (the user's own example, still holds).
//
// Considered `select-philippines-address` too but rejected it: pulls in a
// severely outdated `axios` with unfixed high-severity CVEs (SSRF,
// credential leakage, prototype pollution) as a transitive dependency —
// not worth the risk for what's ultimately static reference data.
//
// Source data uses ALL-CAPS names with inconsistent suffixes ("IMUS CITY",
// "TRECE MARTIRES CITY (Capital)", "GEN. MARIANO ALVAREZ") — normalized
// here to Title Case with city/capital suffixes stripped for both display
// and for matching against use-postal-ph's plainer naming.

import philRaw from "phil-reg-prov-mun-brgy";
// Renamed on import: despite the package's exported name, this is a plain
// factory function (returns an object of lookup functions), not a React
// hook — the "use..." name otherwise false-positives eslint's
// react-hooks/rules-of-hooks (which matches by identifier name).
import createPostalPhClient from "use-postal-ph";

type Province = { name: string; reg_code: string; prov_code: string };
type CityMun = { name: string; prov_code: string; mun_code: string };
type Barangay = { name: string; mun_code: string };
type PhilLib = {
  provinces: Province[];
  city_mun: CityMun[];
  barangays: Barangay[];
  getCityMunByProvince: (provinceCode: string) => CityMun[];
  getBarangayByMun: (munCode: string) => Barangay[];
};

const phil = philRaw as unknown as PhilLib;

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "IMUS CITY" -> "Imus", "TRECE MARTIRES CITY (Capital)" -> "Trece Martires", "KAWIT" -> "Kawit" */
function normalizeName(raw: string): string {
  const stripped = raw
    .replace(/\s*\(capital\)\s*$/i, "")
    .replace(/\s+CITY$/i, "")
    .trim();
  return toTitleCase(stripped);
}

function sortNames(names: string[]): string[] {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function getPhProvinces(): string[] {
  return sortNames(phil.provinces.map((p) => normalizeName(p.name)));
}

function findProvinceCode(provinceName: string): string | null {
  const match = phil.provinces.find((p) => normalizeName(p.name) === provinceName);
  return match?.prov_code ?? null;
}

export function getPhMunicipalities(provinceName: string): string[] {
  const code = findProvinceCode(provinceName);
  if (!code) return [];
  return sortNames(phil.getCityMunByProvince(code).map((m) => normalizeName(m.name)));
}

function findMunicipalityCode(provinceName: string, municipalityName: string): string | null {
  const provinceCode = findProvinceCode(provinceName);
  if (!provinceCode) return null;
  const match = phil
    .getCityMunByProvince(provinceCode)
    .find((m) => normalizeName(m.name) === municipalityName);
  return match?.mun_code ?? null;
}

export function getPhBarangays(provinceName: string, municipalityName: string): string[] {
  const munCode = findMunicipalityCode(provinceName, municipalityName);
  if (!munCode) return [];
  return sortNames(phil.getBarangayByMun(munCode).map((b) => b.name));
}

export function getPhPostalCode(municipalityName: string): string | null {
  const postal = createPostalPhClient();
  const { data } = postal.fetchDataLists({ municipality: municipalityName });
  const code = data[0]?.post_code;
  return code != null ? String(code) : null;
}
