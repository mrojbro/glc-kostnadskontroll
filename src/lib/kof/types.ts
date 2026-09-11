export const KOF_INPUT1_REQUIRED_HEADERS = [
  "Avsdatum",
  "Från_ort",
  "Till",
  "Ref",
  "kg",
  "Pall",
  "totalprisutl",
] as const;

export const KOF_INPUT2_REQUIRED_HEADERS = [
  "Ordernr",
  "Resurs 1",
  "Resurs 1 kostn",
  "Resurs 2",
  "Resurs 2 kostn",
  "Resurs 3",
  "Resurs 3 kostn",
] as const;

/** Resource code that feeds the T5 cost column. */
export const KOF_T5_RESOURCE_CODES = [3006] as const;

export interface KofRow {
  id: string;
  datum: string;
  fran: string;
  mottagare: string;
  /** First part of Ref (before /). */
  frs: string;
  /** Second part of Ref (after /). */
  ordernr: string;
  kg: number | null;
  kgFormatted: string;
  pall: number | null;
  pallFormatted: string;
  pris: number | null;
  prisFormatted: string;
  t5: number | null;
  t5Formatted: string;
  /** T5 − Pris. Null when T5 or Pris is missing. */
  differens: number | null;
  differensFormatted: string;
}

export interface KofWorkbook {
  sheetName: string;
  fileName: string;
  rows: KofRow[];
  rowCount: number;
  totalPris: number;
  totalPrisFormatted: string;
  input2FileName?: string;
  t5MatchCount?: number;
}

export interface KofInput2Row {
  ordernr: string;
  resurs1: string;
  resurs1Kostn: number | null;
  resurs2: string;
  resurs2Kostn: number | null;
  resurs3: string;
  resurs3Kostn: number | null;
}

export interface KofInput2Workbook {
  sheetName: string;
  fileName: string;
  rows: KofInput2Row[];
  rowCount: number;
}

export type KofParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface KofParseError {
  type: KofParseErrorType;
  message: string;
  details?: string[];
}

export type KofParseResult =
  | { success: true; data: KofWorkbook }
  | { success: false; error: KofParseError };

export type KofInput2ParseResult =
  | { success: true; data: KofInput2Workbook }
  | { success: false; error: KofParseError };
