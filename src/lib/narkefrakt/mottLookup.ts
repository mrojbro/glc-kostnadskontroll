/**
 * Allowed Mott Namn + Mott Ort pairs for 3028.
 * Broader contains-match on name; ort must match Karlstad.
 * Canonical Mott Namn: Lillängshamnen / Servera Karlstad.
 */

export const NARKEFRAKT_ALLOWED_MOTT = [
  {
    label: "Lillängshamnen",
    ortLabel: "Karlstad",
    nameParts: ["lillangshamnen"] as const,
    ortParts: ["karlstad"] as const,
  },
  {
    label: "Servera Karlstad",
    ortLabel: "Karlstad",
    nameParts: ["martin", "servera"] as const,
    ortParts: ["karlstad"] as const,
  },
] as const;

/**
 * 3029: Littera → Mott Namn (first match wins).
 */
export const NARKEFRAKT_3029_LITTERA_MOTT = [
  {
    litteraParts: ["orebro"] as const,
    mottNamn: "Närkefrakt",
  },
  {
    litteraParts: ["skaraborg"] as const,
    mottNamn: "Närkefrakt",
  },
  {
    litteraParts: ["varmland"] as const,
    mottNamn: "GDL Karlstad",
  },
] as const;

/** Lowercase, strip accents/punctuation, collapse whitespace for fuzzy contains. */
export function normalizeMottSearchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MatchedMott = {
  mottNamn: string;
  mottOrt: string;
};

/**
 * Match Mott namn + Mott ort as a pair (3028).
 * Returns canonical names, or null if the pair is not allowed.
 */
export function matchAllowedMottPair(
  mottNamn: string,
  mottOrt: string
): MatchedMott | null {
  const nameKey = normalizeMottSearchKey(mottNamn);
  const ortKey = normalizeMottSearchKey(mottOrt);
  if (!nameKey || !ortKey) return null;

  for (const mott of NARKEFRAKT_ALLOWED_MOTT) {
    const nameOk = mott.nameParts.every((part) => nameKey.includes(part));
    const ortOk = mott.ortParts.every((part) => ortKey.includes(part));
    if (nameOk && ortOk) {
      return { mottNamn: mott.label, mottOrt: mott.ortLabel };
    }
  }

  return null;
}

/**
 * 3029: map Littera region → Mott Namn.
 * Returns null if Littera does not match a known region.
 */
export function match3029MottFromLittera(littera: string): string | null {
  const key = normalizeMottSearchKey(littera);
  if (!key) return null;

  for (const rule of NARKEFRAKT_3029_LITTERA_MOTT) {
    if (rule.litteraParts.some((part) => key.includes(part))) {
      return rule.mottNamn;
    }
  }

  return null;
}
