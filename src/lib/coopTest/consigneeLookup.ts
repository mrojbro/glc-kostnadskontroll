import consigneeRegister from "./data/consigneeRegister.json";

export interface ConsigneeRegisterEntry {
  consignee: string;
  consigneeAddress: string;
  littera: string;
  lastningsId: string;
  lastningsnamn: string;
  lastningsadress: string;
  lastningspostnr: string;
  lastningspostort: string;
}

/** Normalize Consignee codes for lookup (trim, strip trailing .0). */
export function normalizeConsigneeKey(value: string): string {
  let text = value.trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+\.0+$/.test(text)) {
    text = text.replace(/\.0+$/, "");
  }
  return text;
}

const lookupByConsignee: Map<string, ConsigneeRegisterEntry> = (() => {
  const map = new Map<string, ConsigneeRegisterEntry>();
  for (const entry of consigneeRegister as ConsigneeRegisterEntry[]) {
    const key = normalizeConsigneeKey(entry.consignee);
    if (key && !map.has(key)) {
      map.set(key, entry);
    }
  }
  return map;
})();

export function lookupConsignee(
  consignee: string
): ConsigneeRegisterEntry | undefined {
  if (!consignee.trim()) return undefined;
  return lookupByConsignee.get(normalizeConsigneeKey(consignee));
}
