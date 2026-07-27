import type { CoopFruktRow } from "./types";

export interface CoopFruktDateEkipageSummary {
  avgangsdatum: string;
  ekipage: string;
  totalVikt: number | null;
  totalSumma: number;
  rowCount: number;
}

export interface CoopFruktEkipage3ButikSummary {
  avgangsdatum: string;
  butiksnamn: string;
  totalVikt: number | null;
  totalSumma: number;
  rowCount: number;
}

function isEkipage3(ekipage: string): boolean {
  return ekipage.trim().toLowerCase() === "ekipage 3";
}

function addVikt(current: number | null, vikt: number | null): number | null {
  if (vikt === null) return current;
  return (current ?? 0) + vikt;
}

export function buildDateEkipageSummaries(
  rows: CoopFruktRow[]
): CoopFruktDateEkipageSummary[] {
  const groups = new Map<string, CoopFruktDateEkipageSummary>();

  for (const row of rows) {
    const avgangsdatum = row.avgangsdatum.trim() || "—";
    const ekipage = row.ekipage.trim() || "—";
    const key = `${avgangsdatum}\0${ekipage}`;
    const existing = groups.get(key);

    if (existing) {
      existing.rowCount += 1;
      existing.totalSumma += row.summa;
      existing.totalVikt = addVikt(existing.totalVikt, row.vikt);
      continue;
    }

    groups.set(key, {
      avgangsdatum,
      ekipage,
      totalVikt: row.vikt,
      totalSumma: row.summa,
      rowCount: 1,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const byDatum = a.avgangsdatum.localeCompare(b.avgangsdatum, "sv");
    if (byDatum !== 0) return byDatum;
    return a.ekipage.localeCompare(b.ekipage, "sv", { sensitivity: "base" });
  });
}

/** Ekipage 3 only: Vikt + Summa per day and butiksnamn. */
export function buildEkipage3ByButikSummaries(
  rows: CoopFruktRow[]
): CoopFruktEkipage3ButikSummary[] {
  const groups = new Map<string, CoopFruktEkipage3ButikSummary>();

  for (const row of rows) {
    if (!isEkipage3(row.ekipage)) continue;

    const avgangsdatum = row.avgangsdatum.trim() || "—";
    const butiksnamn = row.butiksnamn.trim() || "—";
    const key = `${avgangsdatum}\0${butiksnamn}`;
    const existing = groups.get(key);

    if (existing) {
      existing.rowCount += 1;
      existing.totalSumma += row.summa;
      existing.totalVikt = addVikt(existing.totalVikt, row.vikt);
      continue;
    }

    groups.set(key, {
      avgangsdatum,
      butiksnamn,
      totalVikt: row.vikt,
      totalSumma: row.summa,
      rowCount: 1,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const byDatum = a.avgangsdatum.localeCompare(b.avgangsdatum, "sv");
    if (byDatum !== 0) return byDatum;
    return a.butiksnamn.localeCompare(b.butiksnamn, "sv", {
      sensitivity: "base",
    });
  });
}
