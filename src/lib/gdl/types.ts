export const GDL_INPUT1_REQUIRED_HEADERS = [
  "Fakturanummer",
  "Avsändarreferens",
  "Fraktsedel",
  "Leveransdatum",
  "Avsändare",
  "Mottagare",
  "Tillort",
  "Pris utan DMT",
  "DMT",
  "Summa",
  "Kolli",
  "Vikt",
  "Pall",
] as const;

export const GDL_INPUT2_REQUIRED_HEADERS = [
  "Ordernr",
  "Resurs 1",
  "Resurs 1 kostn",
  "Resurs 2",
  "Resurs 2 kostn",
  "Resurs 3",
  "Resurs 3 kostn",
] as const;

/** Resource codes that feed the T5 cost column. */
export const GDL_T5_RESOURCE_CODES = [3024, 3032] as const;

export interface GdlRow {
  id: string;
  fakturanummer: string;
  ordernr: string;
  frs: string;
  leveransdatum: string;
  avsandare: string;
  mottagare: string;
  postort: string;
  prisUtanDmt: number | null;
  prisUtanDmtFormatted: string;
  dmt: number | null;
  dmtFormatted: string;
  summa: number | null;
  summaFormatted: string;
  t5: number | null;
  t5Formatted: string;
  /** T5 − Summa. Null when T5 or Summa is missing. */
  differens: number | null;
  differensFormatted: string;
  kolli: number | null;
  kolliFormatted: string;
  vikt: number | null;
  viktFormatted: string;
  pall: number | null;
  pallFormatted: string;
}

export interface GdlWorkbook {
  sheetName: string;
  fileName: string;
  rows: GdlRow[];
  rowCount: number;
  input2FileName?: string;
  t5MatchCount?: number;
}

export interface GdlInput2Row {
  ordernr: string;
  resurs1: string;
  resurs1Kostn: number | null;
  resurs2: string;
  resurs2Kostn: number | null;
  resurs3: string;
  resurs3Kostn: number | null;
}

export interface GdlInput2Workbook {
  sheetName: string;
  fileName: string;
  rows: GdlInput2Row[];
  rowCount: number;
}

export type GdlParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface GdlParseError {
  type: GdlParseErrorType;
  message: string;
  details?: string[];
}

export type GdlParseResult =
  | { success: true; data: GdlWorkbook }
  | { success: false; error: GdlParseError };

export type GdlInput2ParseResult =
  | { success: true; data: GdlInput2Workbook }
  | { success: false; error: GdlParseError };
