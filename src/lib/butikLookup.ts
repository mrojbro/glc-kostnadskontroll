import butikRegister from "./data/coopDistributionButikRegister.json";

export interface CoopDistributionButikEntry {
  butiksnr: number;
  butiksnamn: string;
}

/** Normalize store numbers so "125600", 125600 and "0125600" match. */
export function normalizeButiksnr(value: string | number): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const withoutDecimal = raw.replace(/\.0+$/, "");
  const digits = withoutDecimal.replace(/\D/g, "");
  if (!digits) return "";

  return digits.replace(/^0+(?=\d)/, "");
}

const lookupByNumber: Map<string, CoopDistributionButikEntry> = (() => {
  const map = new Map<string, CoopDistributionButikEntry>();
  for (const entry of butikRegister as CoopDistributionButikEntry[]) {
    const key = normalizeButiksnr(entry.butiksnr);
    if (key && !map.has(key)) {
      map.set(key, entry);
    }
  }
  return map;
})();

/** Lookup cleaner Butiksnamn by invoice Butiksnr. */
export function lookupButikByNumber(
  butiksnr: string | number
): CoopDistributionButikEntry | undefined {
  const key = normalizeButiksnr(butiksnr);
  if (!key) return undefined;
  return lookupByNumber.get(key);
}
