function normalizeMottagareName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/gi, "");
}

/** Match Linas anywhere in the name, ignoring case and surrounding text like AB. */
export function containsLinasMottagare(value: string): boolean {
  return normalizeMottagareName(value).includes("linas");
}

export function isPartnerMottagare(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Tillägg") return false;
  if (/glc|dagab|hlp/i.test(trimmed)) return true;
  return containsLinasMottagare(trimmed);
}
