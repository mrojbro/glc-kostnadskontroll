export interface CoopFruktRow {
  id: string;
  avgangsdatum: string;
  vecka: string;
  frs: string;
  ekipage: string;
  terminal: string;
  butiksnamn: string;
  postort: string;
  vikt: number | null;
  viktFormatted: string;
  pris: number | null;
  prisFormatted: string;
  summa: number;
  summaFormatted: string;
  /** True when Vikt × Pris matches Summa (within 0,01). */
  summaMatches: boolean;
}

export interface CoopFruktWorkbook {
  sheetName: string;
  rows: CoopFruktRow[];
  rowCount: number;
  totalSumma: number;
  totalSummaFormatted: string;
}

export type CoopFruktParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface CoopFruktParseError {
  type: CoopFruktParseErrorType;
  message: string;
  details?: string[];
}

export type CoopFruktParseResult =
  | { success: true; data: CoopFruktWorkbook }
  | { success: false; error: CoopFruktParseError };

export const COOP_FRUKT_SHEET_NAME = "Grunddata";

/** Excel header → display field */
export const COOP_FRUKT_REQUIRED_HEADERS = [
  "Lev. Datum",
  "Vecka",
  "Fraktsedelsnummer",
  "Kundnamn",
  "Motort",
  "Kg",
  "Kr/Kg",
  "Total Kr",
] as const;

export const COOP_FRUKT_DISPLAY_HEADERS = [
  "Avgångsdatum",
  "Vecka",
  "FRS",
  "Ekipage",
  "Terminal",
  "Butiksnamn",
  "Postort",
  "Vikt",
  "Pris",
  "Summa",
] as const;
