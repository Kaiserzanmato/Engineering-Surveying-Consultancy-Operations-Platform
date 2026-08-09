import { isValidCountryCode } from "./countries";

// Country-adaptive address field labels. Confidently correct for a handful
// of countries whose address conventions are well-established public
// knowledge (explicitly requested: Philippines, US); everything else falls
// back to generic labels rather than guessing at conventions for 190+
// countries this repo has no canonical source to verify against — wrong
// labels would be worse than generic ones. Extend this table over time as
// specific countries' conventions are confirmed, not by guessing.

export type AddressLabels = {
  line2Label: string;
  showSubLocality: boolean;
  subLocalityLabel: string;
  cityLabel: string;
  stateLabel: string;
  stateOptional: boolean;
  postalLabel: string;
  postalOptional: boolean;
};

const DEFAULT_LABELS: AddressLabels = {
  line2Label: "Address line 2",
  showSubLocality: false,
  subLocalityLabel: "",
  cityLabel: "City",
  stateLabel: "State / Province / Region",
  stateOptional: true,
  postalLabel: "Postal code",
  postalOptional: true,
};

const COUNTRY_OVERRIDES: Record<string, Partial<AddressLabels>> = {
  PH: {
    showSubLocality: true,
    subLocalityLabel: "Barangay",
    stateLabel: "Province",
    stateOptional: false,
    postalLabel: "ZIP code",
  },
  US: {
    stateLabel: "State",
    stateOptional: false,
    postalLabel: "ZIP code",
    postalOptional: false,
  },
  CA: {
    stateLabel: "Province",
    stateOptional: false,
    postalLabel: "Postal code",
    postalOptional: false,
  },
  GB: {
    stateLabel: "County",
    postalLabel: "Postcode",
    postalOptional: false,
  },
  AU: {
    stateLabel: "State / Territory",
    stateOptional: false,
    postalLabel: "Postcode",
    postalOptional: false,
  },
};

export function getAddressLabels(countryCode: string | null | undefined): AddressLabels {
  const overrides = countryCode ? COUNTRY_OVERRIDES[countryCode] : undefined;
  return { ...DEFAULT_LABELS, ...overrides };
}

export type StructuredAddress = {
  billingLine1: string | null;
  billingLine2: string | null;
  billingSubLocality: string | null;
  billingCity: string | null;
  billingStateProvince: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
};

/** Reads the AddressFields component's fixed field names out of a FormData. */
export function parseAddressFields(formData: FormData): StructuredAddress {
  const trimOrNull = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;
  const country = trimOrNull(formData.get("billingCountry"));
  if (country && !isValidCountryCode(country)) {
    throw new Error(`Invalid country code: ${country}`);
  }
  return {
    billingLine1: trimOrNull(formData.get("billingLine1")),
    billingLine2: trimOrNull(formData.get("billingLine2")),
    billingSubLocality: trimOrNull(formData.get("billingSubLocality")),
    billingCity: trimOrNull(formData.get("billingCity")),
    billingStateProvince: trimOrNull(formData.get("billingStateProvince")),
    billingPostalCode: trimOrNull(formData.get("billingPostalCode")),
    billingCountry: country,
  };
}
