// phil-reg-prov-mun-brgy ships no TypeScript types (plain CJS). Declared
// loosely here; src/lib/ph-address.ts casts to the specific shape it
// actually uses rather than trusting this blanket `any`.
declare module "phil-reg-prov-mun-brgy" {
  const lib: unknown;
  export default lib;
}
