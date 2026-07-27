import type { CoopFruktRow } from "./types";

export interface CoopFruktDateEkipageSummary {
  avgangsdatum: string;
  ekipage: string;
  totalVikt: number | null;
  totalSumma: number;
  rowCount: number;
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
      if (row.vikt !== null) {
        existing.totalVikt = (existing.totalVikt ?? 0) + row.vikt;
      }
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
