export const WIDENS_INPUT1_REQUIRED_HEADERS = [
  "Transportdag",
  "Referens",
  "Fraktsedelnummer",
  "Från (namn)",
  "Mottagare (namn)",
  "Mottagare (ort)",
  "Vikt",
  "Kolli",
  "Skrymmeantal",
  "Godsinformation",
  "Artikelslag",
  "Radbelopp",
] as const;

export const WIDENS_INPUT2_REQUIRED_HEADERS = [
  "Ordernr",
  "Resurs 1",
  "Resurs 1 kostn",
  "Resurs 2",
  "Resurs 2 kostn",
  "Resurs 3",
  "Resurs 3 kostn",
] as const;

/** Resource codes that feed the T5 cost column. */
export const WIDENS_T5_RESOURCE_CODES = [3012, 3044] as const;

export interface WidensRow {
  id: string;
  transportdag: string;
  ordernr: string;
  frs: string;
  fran: string;
  till: string;
  postort: string;
  vikt: number | null;
  viktFormatted: string;
  kolli: number | null;
  kolliFormatted: string;
  ppl: number | null;
  pplFormatted: string;
  godsinfo: string;
  frakt: number | null;
  fraktFormatted: string;
  dmt: number | null;
  dmtFormatted: string;
  /** Frakt + DMT. Null when both Frakt and DMT are missing. */
  summa: number | null;
  summaFormatted: string;
  t5: number | null;
  t5Formatted: string;
  /** T5 − Summa. Null when T5 or Summa is missing. */
  differens: number | null;
  differensFormatted: string;
}

export interface WidensWorkbook {
  sheetName: string;
  fileName: string;
  rows: WidensRow[];
  rowCount: number;
  totalFrakt: number;
  totalFraktFormatted: string;
  totalDmt: number;
  totalDmtFormatted: string;
  totalSumma: number;
  totalSummaFormatted: string;
  input2FileName?: string;
  t5MatchCount?: number;
}

export interface WidensInput2Row {
  ordernr: string;
  resurs1: string;
  resurs1Kostn: number | null;
  resurs2: string;
  resurs2Kostn: number | null;
  resurs3: string;
  resurs3Kostn: number | null;
}

export interface WidensInput2Workbook {
  sheetName: string;
  fileName: string;
  rows: WidensInput2Row[];
  rowCount: number;
}

export type WidensParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface WidensParseError {
  type: WidensParseErrorType;
  message: string;
  details?: string[];
}

export type WidensParseResult =
  | { success: true; data: WidensWorkbook }
  | { success: false; error: WidensParseError };

export type WidensInput2ParseResult =
  | { success: true; data: WidensInput2Workbook }
  | { success: false; error: WidensParseError };
