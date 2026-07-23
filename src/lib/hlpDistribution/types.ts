export interface HlpDistributionRow {
  id: string;
  avgangsdatum: string;
  fraktsedeln: string;
  ordernr: string;
  avsandare: string;
  terminal: string;
  mottagare: string;
  pall: number | null;
  pallFormatted: string;
  flm: number | null;
  flmFormatted: string;
  vikt: number | null;
  viktFormatted: string;
  summa: number;
  summaFormatted: string;
  /** True when this Fraktsedel has a Tillägg row — highlight Fraktsedeln. */
  highlightFraktsedel: boolean;
}

export interface HlpDistributionWorkbook {
  sheetName: string;
  rows: HlpDistributionRow[];
  rowCount: number;
  totalSumma: number;
  totalSummaFormatted: string;
}

export type HlpDistributionParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface HlpDistributionParseError {
  type: HlpDistributionParseErrorType;
  message: string;
  details?: string[];
}

export type HlpDistributionParseResult =
  | { success: true; data: HlpDistributionWorkbook }
  | { success: false; error: HlpDistributionParseError };

/** Primary input headers (aliases handled in parser where needed). */
export const HLP_REQUIRED_HEADERS = [
  "Orderdatum",
  "Fraktsedel",
  "Ordernummer",
  "Kundnamn",
  "Avsändare 1",
  "Mottagare 1",
  "Pallplats",
  "Beräknad Flakmeter",
  "Beräknad vikt",
  "Summa (Resursvaluta)",
] as const;

export const HLP_DISPLAY_HEADERS = [
  "Avgångsdatum",
  "Fraktsedeln",
  "Ordernr",
  "Avsändare",
  "Terminal",
  "Mottagare",
  "Pall",
  "FLM",
  "Vikt",
  "Summa",
] as const;
