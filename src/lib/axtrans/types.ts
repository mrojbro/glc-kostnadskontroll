export const AXTRANS_INPUT1_REQUIRED_HEADERS = [
  "Orderdatum",
  "Projektnummer",
  "Fraktsedel",
  "Avsändarort",
  "Mottagare",
  "Tillort",
  "Pris utan DMT",
  "Kolli",
  "Vikt",
] as const;

export const AXTRANS_INPUT2_REQUIRED_HEADERS = [
  "Ordernr",
  "Mott Namn",
  "Betalare",
  "Resurs 1",
  "Resurs 1 kostn",
  "Resurs 2",
  "Resurs 2 kostn",
  "Resurs 3",
  "Resurs 3 kostn",
] as const;

/** Input 2: T5 is taken from the Resurs slot that contains this code. */
export const AXTRANS_T5_RESOURCE_CODE = 3068;

export interface AxtransRow {
  id: string;
  datum: string;
  ordernr: string;
  frs: string;
  /** Filled via Input 2 from Betalare. */
  kund: string;
  lastort: string;
  mottagare: string;
  lossort: string;
  pris: number | null;
  prisFormatted: string;
  kolli: number | null;
  kolliFormatted: string;
  vikt: number | null;
  viktFormatted: string;
  t5: number | null;
  t5Formatted: string;
  /** T5 − Pris. Null when T5 or Pris is missing. */
  differens: number | null;
  differensFormatted: string;
}

export interface AxtransWorkbook {
  sheetName: string;
  fileName: string;
  rows: AxtransRow[];
  rowCount: number;
  input2FileName?: string;
  t5MatchCount?: number;
}

export interface AxtransInput2Row {
  ordernr: string;
  mottNamn: string;
  betalare: string;
  resurs1: string;
  resurs1Kostn: number | null;
  resurs2: string;
  resurs2Kostn: number | null;
  resurs3: string;
  resurs3Kostn: number | null;
}

export interface AxtransInput2Workbook {
  sheetName: string;
  fileName: string;
  rows: AxtransInput2Row[];
  rowCount: number;
}

export type AxtransParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface AxtransParseError {
  type: AxtransParseErrorType;
  message: string;
  details?: string[];
}

export type AxtransParseResult =
  | { success: true; data: AxtransWorkbook }
  | { success: false; error: AxtransParseError };

export type AxtransInput2ParseResult =
  | { success: true; data: AxtransInput2Workbook }
  | { success: false; error: AxtransParseError };
