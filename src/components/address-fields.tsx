"use client";

import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { getAddressLabels } from "@/lib/address";

export type AddressDefaultValues = {
  line1?: string | null;
  line2?: string | null;
  subLocality?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

/**
 * Structured, country-adaptive billing address fields. Field names are
 * fixed (billingLine1, billingLine2, billingSubLocality, billingCity,
 * billingStateProvince, billingPostalCode, billingCountry) — read these
 * exact names in the receiving Server Action.
 */
export function AddressFields({ defaultValues = {} }: { defaultValues?: AddressDefaultValues }) {
  const [country, setCountry] = useState(defaultValues.country ?? "");
  const labels = getAddressLabels(country || null);

  return (
    <>
      <label className="col-span-2 flex flex-col gap-1">
        Country
        <select
          name="billingCountry"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded border border-black/20 px-2 py-1"
        >
          <option value="">— select —</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Address line 1
        <input
          name="billingLine1"
          defaultValue={defaultValues.line1 ?? ""}
          className="rounded border border-black/20 px-2 py-1"
        />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        {labels.line2Label}
        <input
          name="billingLine2"
          defaultValue={defaultValues.line2 ?? ""}
          className="rounded border border-black/20 px-2 py-1"
        />
      </label>
      {labels.showSubLocality && (
        <label className="flex flex-col gap-1">
          {labels.subLocalityLabel}
          <input
            name="billingSubLocality"
            defaultValue={defaultValues.subLocality ?? ""}
            className="rounded border border-black/20 px-2 py-1"
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        {labels.cityLabel}
        <input
          name="billingCity"
          defaultValue={defaultValues.city ?? ""}
          className="rounded border border-black/20 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        {labels.stateLabel}
        {labels.stateOptional ? "" : " *"}
        <input
          name="billingStateProvince"
          defaultValue={defaultValues.stateProvince ?? ""}
          className="rounded border border-black/20 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        {labels.postalLabel}
        {labels.postalOptional ? "" : " *"}
        <input
          name="billingPostalCode"
          defaultValue={defaultValues.postalCode ?? ""}
          className="rounded border border-black/20 px-2 py-1"
        />
      </label>
    </>
  );
}
