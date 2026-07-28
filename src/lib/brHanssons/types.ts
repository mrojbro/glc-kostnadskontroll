export type BrHanssonsSourceId = "kl15" | "kl21";

export const BR_HANSSONS_SOURCES: Record<
  BrHanssonsSourceId,
  { id: BrHanssonsSourceId; label: string; shortLabel: string }
> = {
  kl15: {
    id: "kl15",
    label: "15:00-filen",
    shortLabel: "15:00",
  },
  kl21: {
    id: "kl21",
    label: "21:00-filen",
    shortLabel: "21:00",
  },
};

export interface BrHanssonsRow {
  id: string;
  datum: string;
  sedelnummer: string;
  markning: string;
  angoringNamn: string;
  angoringPostort: string;
  vikt: number | null;
  viktFormatted: string;
  pallplats: number | null;
  pallplatsFormatted: string;
  kollinslag: string;
}

export interface BrHanssonsWorkbook {
  sheetName: string;
  sourceId: BrHanssonsSourceId;
  sourceLabel: string;
  fileName: string;
  rows: BrHanssonsRow[];
  rowCount: number;
}

export type BrHanssonsCompareStatus =
  | "changed"
  | "unchanged"
  | "only15"
  | "only21";

export interface BrHanssonsCompareRow {
  id: string;
  matchKey: string;
  status: BrHanssonsCompareStatus;
  /** Identity fields prefer 21:00, fall back to 15:00. */
  datum: string;
  sedelnummer: string;
  markning: string;
  angoringNamn: string;
  angoringPostort: string;
  vikt15: number | null;
  vikt15Formatted: string;
  vikt21: number | null;
  vikt21Formatted: string;
  viktChanged: boolean;
  pallplats15: number | null;
  pallplats15Formatted: string;
  pallplats21: number | null;
  pallplats21Formatted: string;
  pallplatsChanged: boolean;
  kollinslag15: string;
  kollinslag21: string;
  kollinslagChanged: boolean;
}

export interface BrHanssonsCompareResult {
  rows: BrHanssonsCompareRow[];
  rowCount: number;
  changedCount: number;
  only15Count: number;
  only21Count: number;
  unchangedCount: number;
  source15: { fileName: string; sheetName: string; rowCount: number };
  source21: { fileName: string; sheetName: string; rowCount: number };
}

export type BrHanssonsParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error"
  | "missing_sources"
  | "date_mismatch"
  | "filename_mismatch";

export interface BrHanssonsParseError {
  type: BrHanssonsParseErrorType;
  message: string;
  details?: string[];
}

export type BrHanssonsParseResult =
  | { success: true; data: BrHanssonsWorkbook }
  | { success: false; error: BrHanssonsParseError };

export type BrHanssonsCompareParseResult =
  | { success: true; data: BrHanssonsCompareResult }
  | { success: false; error: BrHanssonsParseError };

export const BR_HANSSONS_REQUIRED_HEADERS = [
  "Datum",
  "Sedelnummer",
  "Märkning",
  "Angöring namn - sista",
  "Angöring postort - sista",
  "Vikt",
  "Pallplats",
  "Kollinslag",
] as const;
