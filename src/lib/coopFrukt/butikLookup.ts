import butikRegister from "./data/butikRegister.json";

export interface ButikRegisterEntry {
  consignee: string;
  butiksnr: number;
  butiksnamn: string;
  ekipage: string;
  tur: string;
}

/** Normalize store names for case-insensitive matching. */
export function normalizeButikKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Lookup by invoice Butiksnamn (Kundnamn) → register Consignee.
 * Also indexes register Butiksnamn as a fallback alias.
 */
const lookupByName: Map<string, ButikRegisterEntry> = (() => {
  const map = new Map<string, ButikRegisterEntry>();
  for (const entry of butikRegister as ButikRegisterEntry[]) {
    const consigneeKey = normalizeButikKey(entry.consignee);
    if (consigneeKey && !map.has(consigneeKey)) {
      map.set(consigneeKey, entry);
    }
    const butikKey = normalizeButikKey(entry.butiksnamn);
    if (butikKey && !map.has(butikKey)) {
      map.set(butikKey, entry);
    }
  }
  return map;
})();

export function lookupButikByName(
  butiksnamn: string
): ButikRegisterEntry | undefined {
  if (!butiksnamn.trim()) return undefined;
  return lookupByName.get(normalizeButikKey(butiksnamn));
}
