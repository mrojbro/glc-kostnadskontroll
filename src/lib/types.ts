export interface SummaryItem {
  label: string;
  value: number;
  formattedValue: string;
}

export interface InvoiceSummary {
  reference: string;
  freightByRpu: SummaryItem;
  shunting: SummaryItem;
  fuelSurcharge: SummaryItem;
  adjustment: SummaryItem;
}

export interface CostControlRow {
  id: string;
  foNummer: string;
  typ: string;
  datum: string;
  butiksnamn: string;
  butiksnr: string;
  postort: string;
  pall: number | null;
  pallFormatted: string;
  rpu: number | null;
  rpuFormatted: string;
  sek: number;
  sekFormatted: string;
}

export type RowStatus = "ok" | "check";

export type RowStatusMap = Record<string, RowStatus>;

export function formatRowStatus(status: RowStatus | undefined): string {
  if (status === "ok") return "OK";
  if (status === "check") return "Kontroll";
  return "";
}

export interface ParsedWorkbook {
  summary: InvoiceSummary;
  rows: CostControlRow[];
  totalSek: number;
  totalSekFormatted: string;
  rowCount: number;
}

export type ParseErrorType =
  | "missing_sheets"
  | "missing_columns"
  | "parse_error";

export interface ParseError {
  type: ParseErrorType;
  message: string;
  details?: string[];
}

export type ParseResult =
  | { success: true; data: ParsedWorkbook }
  | { success: false; error: ParseError };

export const REQUIRED_SHEETS = {
  summary: "Invoice basis summary",
  invoice: "Invoice basis",
} as const;

export const REQUIRED_INVOICE_HEADERS = [
  "Freight order / Service order",
  "Date",
  "Stage Destination location name",
  "Stage Destination location ID",
  "Stage location city",
  "Means of transport",
  "Quantity",
  "Calculated amount",
  "Charge description",
] as const;

export const COLUMN_MAP = {
  "Freight order / Service order": "foNummer",
  Date: "datum",
  "Stage Destination location name": "butiksnamn",
  "Stage Destination location ID": "butiksnr",
  "Stage location city": "postort",
  "Means of transport": "typ",
  Quantity: "rpu",
  "Calculated amount": "sek",
} as const;

export const DISPLAY_HEADERS = [
  "FO-Nummer",
  "Typ",
  "Datum",
  "Butiksnr",
  "Butiksnamn",
  "Postort",
  "Pall",
  "RPU",
  "SEK",
] as const;

/** RPU units per pallet */
export const RPU_PER_PALL = 1.7;

export const CHARGE_DESCRIPTION_EXCLUSIONS = [
  "shunting",
  "adjustment",
  "fuel surcharge %",
  "fuel charge %",
] as const;

/** Exclude rows where Stage Destination location ID contains any of these (case-insensitive). */
export const LOCATION_ID_EXCLUSIONS = ["cdcangered"] as const;
