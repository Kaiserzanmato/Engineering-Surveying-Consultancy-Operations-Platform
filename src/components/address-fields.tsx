"use client";

import { useState, useEffect, useMemo } from "react";
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

type PhAddressModule = typeof import("@/lib/ph-address");

/**
 * Structured, country-adaptive billing address fields. Field names are
 * fixed (billingLine1, billingLine2, billingSubLocality, billingCity,
 * billingStateProvince, billingPostalCode, billingCountry) — read these
 * exact names in the receiving Server Action.
 *
 * For the Philippines specifically, this renders real cascading Province
 * -> City/Municipality -> Barangay dropdowns (backed by real PSA data,
 * see src/lib/ph-address.ts) with postal code auto-fill, rather than free
 * text — lazy-loaded only when "Philippines" is selected, since the
 * underlying dataset is large (~4.5MB, 42k+ barangays) and most users of
 * this app won't need it. Every other country keeps free-text fields with
 * generic (or, for a handful of countries, locally-correct) labels — see
 * src/lib/address.ts for why a full cascading system isn't attempted for
 * every country.
 */
export function AddressFields({ defaultValues = {} }: { defaultValues?: AddressDefaultValues }) {
  const [country, setCountry] = useState(defaultValues.country ?? "");
  const labels = getAddressLabels(country || null);
  const isPH = country === "PH";

  const [phModule, setPhModule] = useState<PhAddressModule | null>(null);
  const phLoading = isPH && !phModule;
  const [province, setProvince] = useState(defaultValues.stateProvince ?? "");
  const [municipality, setMunicipality] = useState(defaultValues.city ?? "");
  const [barangay, setBarangay] = useState(defaultValues.subLocality ?? "");
  const [postalCode, setPostalCode] = useState(defaultValues.postalCode ?? "");
  // The cascading dataset doesn't list every LGU (e.g. Dasmariñas City is
  // absent, see src/lib/ph-address.ts) — this lets a user type it in
  // instead of getting stuck with no matching dropdown option.
  const [manualCityEntry, setManualCityEntry] = useState(false);

  useEffect(() => {
    if (!isPH || phModule) return;
    let cancelled = false;
    import("@/lib/ph-address").then((mod) => {
      if (!cancelled) setPhModule(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [isPH, phModule]);

  const provinceOptions = useMemo(() => (phModule ? phModule.getPhProvinces() : []), [phModule]);
  const municipalityOptions = useMemo(
    () => (phModule && province ? phModule.getPhMunicipalities(province) : []),
    [phModule, province],
  );
  const barangayOptions = useMemo(
    () => (phModule && province && municipality ? phModule.getPhBarangays(province, municipality) : []),
    [phModule, province, municipality],
  );

  function handleMunicipalityChange(name: string) {
    setMunicipality(name);
    setBarangay("");
    if (phModule && name) {
      const code = phModule.getPhPostalCode(name);
      if (code) setPostalCode(code);
    }
  }

  return (
    <>
      <label className="col-span-2 flex flex-col gap-1">
        Country
        <select
          name="billingCountry"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setProvince("");
            setMunicipality("");
            setBarangay("");
          }}
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

      {isPH ? (
        <>
          {phLoading && (
            <p className="col-span-2 text-sm text-black/50">Loading Philippine address data…</p>
          )}
          <label className="flex flex-col gap-1">
            Province
            <select
              name="billingStateProvince"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setMunicipality("");
                setBarangay("");
              }}
              disabled={!phModule}
              className="rounded border border-black/20 px-2 py-1"
            >
              <option value="">— select province —</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          {manualCityEntry ? (
            <>
              <label className="flex flex-col gap-1">
                City / Municipality
                <input
                  name="billingCity"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="rounded border border-black/20 px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                {labels.subLocalityLabel}
                <input
                  name="billingSubLocality"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="rounded border border-black/20 px-2 py-1"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                City / Municipality
                <select
                  name="billingCity"
                  value={municipality}
                  onChange={(e) => handleMunicipalityChange(e.target.value)}
                  disabled={!province}
                  className="rounded border border-black/20 px-2 py-1"
                >
                  <option value="">— select city/municipality —</option>
                  {municipalityOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                {labels.subLocalityLabel}
                <select
                  name="billingSubLocality"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  disabled={!municipality}
                  className="rounded border border-black/20 px-2 py-1"
                >
                  <option value="">— select barangay —</option>
                  {barangayOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setManualCityEntry((prev) => !prev);
              setMunicipality("");
              setBarangay("");
            }}
            className="col-span-2 self-start text-left text-sm text-blue-700 underline"
          >
            {manualCityEntry
              ? "Choose from list instead"
              : "Can't find your city or barangay? Enter it manually"}
          </button>
          <label className="flex flex-col gap-1">
            {labels.postalLabel} (auto-filled when available, editable)
            <input
              name="billingPostalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
        </>
      ) : (
        <>
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
      )}
    </>
  );
}
