import { describe, it, expect } from "vitest";
import { getAddressLabels, parseAddressFields } from "./address";
import { isValidCountryCode, COUNTRIES } from "./countries";

describe("getAddressLabels", () => {
  it("returns generic defaults for no country / an unlisted country", () => {
    const labels = getAddressLabels(null);
    expect(labels.showSubLocality).toBe(false);
    expect(labels.stateLabel).toBe("State / Province / Region");
    expect(labels.postalLabel).toBe("Postal code");

    const unlisted = getAddressLabels("FR");
    expect(unlisted.showSubLocality).toBe(false);
    expect(unlisted.stateLabel).toBe("State / Province / Region");
  });

  it("shows barangay and province/ZIP terminology for the Philippines", () => {
    const labels = getAddressLabels("PH");
    expect(labels.showSubLocality).toBe(true);
    expect(labels.subLocalityLabel).toBe("Barangay");
    expect(labels.stateLabel).toBe("Province");
    expect(labels.postalLabel).toBe("ZIP code");
  });

  it("uses state/ZIP terminology for the US, no barangay field", () => {
    const labels = getAddressLabels("US");
    expect(labels.showSubLocality).toBe(false);
    expect(labels.stateLabel).toBe("State");
    expect(labels.postalLabel).toBe("ZIP code");
  });
});

describe("countries list", () => {
  it("includes the Philippines, US, and a reasonably complete set of countries", () => {
    expect(isValidCountryCode("PH")).toBe(true);
    expect(isValidCountryCode("US")).toBe(true);
    expect(COUNTRIES.length).toBeGreaterThan(150);
  });

  it("rejects an invalid/made-up country code", () => {
    expect(isValidCountryCode("XX")).toBe(false);
    expect(isValidCountryCode("")).toBe(false);
  });

  it("has no duplicate codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("parseAddressFields", () => {
  function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.append(k, v);
    return f;
  }

  it("trims values and converts blanks to null", () => {
    const parsed = parseAddressFields(
      fd({ billingLine1: "  123 Main St  ", billingCity: "", billingCountry: "US" }),
    );
    expect(parsed.billingLine1).toBe("123 Main St");
    expect(parsed.billingCity).toBeNull();
    expect(parsed.billingCountry).toBe("US");
  });

  it("allows an empty/unselected country", () => {
    const parsed = parseAddressFields(fd({}));
    expect(parsed.billingCountry).toBeNull();
  });

  it("rejects an invalid country code rather than silently storing it", () => {
    expect(() => parseAddressFields(fd({ billingCountry: "ZZ" }))).toThrow();
  });
});
