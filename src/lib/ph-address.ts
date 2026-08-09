// Real Philippine geographic data — NOT hand-authored. `psgc` bundles the
// official PSA (Philippine Statistics Authority) Standard Geographic Code
// hierarchy (region -> province -> city/municipality -> barangay);
// `use-postal-ph` provides postal codes per municipality. These are two
// independently-maintained community packages, cross-referenced here by
// municipality name — verified against the user's own example (Cavite ->
// Kawit -> "Tabon I"/"Tabon II" barangays; Kawit's postal code 4104 matches
// public record) before wiring this in.
//
// Loaded via dynamic import only where used (AddressFields lazy-loads this
// module when the user picks "Philippines") — psgc alone is ~4.5MB
// unpacked (42,036 barangays), not something every visitor should download
// regardless of which country they pick.

import { provinces as psgcProvinces, municipalities as psgcMunicipalities } from "psgc";
// Renamed on import: despite the package's exported name, this is a plain
// factory function (returns an object of lookup functions), not a React
// hook — the "use..." name otherwise false-positives eslint's
// react-hooks/rules-of-hooks (which matches by identifier name).
import createPostalPhClient from "use-postal-ph";

export function getPhProvinces(): string[] {
  return psgcProvinces
    .all()
    .map((p) => p.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getPhMunicipalities(provinceName: string): string[] {
  const [province] = psgcProvinces.filter(provinceName).filter((p) => p.name === provinceName);
  if (!province) return [];
  return province.municipalities.map((m) => m.name).sort((a, b) => a.localeCompare(b));
}

export function getPhBarangays(provinceName: string, municipalityName: string): string[] {
  // Matched defensively by name AND province, rather than taking the
  // first name match — a handful of municipality names repeat across
  // different provinces (e.g. "San Fernando"), and the caller already
  // knows which province was selected.
  const matches = psgcMunicipalities.filter(municipalityName);
  const match = matches.find((m) => m.name === municipalityName && m.province === provinceName);
  if (!match || !("barangays" in match)) return [];
  return match.barangays.map((b) => b.name).sort((a, b) => a.localeCompare(b));
}

export function getPhPostalCode(municipalityName: string): string | null {
  const postal = createPostalPhClient();
  const { data } = postal.fetchDataLists({ municipality: municipalityName });
  const code = data[0]?.post_code;
  return code != null ? String(code) : null;
}
