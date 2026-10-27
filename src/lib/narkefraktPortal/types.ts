export const NARKEFRAKT_PORTAL_INPUT1_REQUIRED_HEADERS = [
  "Planerad starttid",
  "Sedelnummer",
  "Märkning",
  "Angöring postort - första",
  "Angöring postort - sista",
  "Debetradsbenämning",
  "Kundtotal(D)",
] as const;

export const NARKEFRAKT_PORTAL_INPUT2_REQUIRED_HEADERS = [
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
export const NARKEFRAKT_PORTAL_T5_RESOURCE_CODE = 3028;

export interface NarkefraktPortalRow {
  id: string;
  datum: string;
  frs: string;
  ordernr: string;
  /** Kept for Input 1 merge; not shown in overview. */
  lastort: string;
  /** Filled via Input 2 from Betalare — blank after Input 1. */
  betalare: string;
  /** Filled later via Input 2 / manual edit — blank after Input 1. */
  mottagare: string;
  lossort: string;
  pris: number | null;
  prisFormatted: string;
  dmt: number | null;
  dmtFormatted: string;
  summa: number | null;
  summaFormatted: string;
  t5: number | null;
  t5Formatted: string;
  /** T5 − Summa. Null when T5 or Summa is missing. */
  differens: number | null;
  differensFormatted: string;
}

export interface NarkefraktPortalWorkbook {
  sheetName: string;
  fileName: string;
  rows: NarkefraktPortalRow[];
  rowCount: number;
  totalPris: number;
  totalPrisFormatted: string;
  totalDmt: number;
  totalDmtFormatted: string;
  totalSumma: number;
  totalSummaFormatted: string;
  input2FileName?: string;
  t5MatchCount?: number;
}

export interface NarkefraktPortalInput2Row {
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

export interface NarkefraktPortalInput2Workbook {
  sheetName: string;
  fileName: string;
  rows: NarkefraktPortalInput2Row[];
  rowCount: number;
}

export type NarkefraktPortalParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface NarkefraktPortalParseError {
  type: NarkefraktPortalParseErrorType;
  message: string;
  details?: string[];
}

export type NarkefraktPortalParseResult =
  | { success: true; data: NarkefraktPortalWorkbook }
  | { success: false; error: NarkefraktPortalParseError };

export type NarkefraktPortalInput2ParseResult =
  | { success: true; data: NarkefraktPortalInput2Workbook }
  | { success: false; error: NarkefraktPortalParseError };
