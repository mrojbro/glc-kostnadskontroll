export interface BoxmoverRow {
  id: string;
  datum: string;
  ordernr: string;
  betalare: string;
  littera: string;
  fraktsedelsnummer: string;
  klarFakturering: boolean;
  klarFaktureringLabel: string;
  orderstatus: string;
  orderstatusOk: boolean;
  intakter: number;
  intakterFormatted: string;
  intakterOk: boolean;
  tg: number | null;
  tgFormatted: string;
  tb: number | null;
  tbFormatted: string;
  resurs: number;
  resursFormatted: string;
  mottNamn: string;
  mottOrt: string;
  gods: string;
}

export interface BoxmoverWorkbook {
  sheetName: string;
  rows: BoxmoverRow[];
  rowCount: number;
  totalIntakter: number;
  totalIntakterFormatted: string;
  totalResurs: number;
  totalResursFormatted: string;
}

export type BoxmoverParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error"
  | "wrong_resource_code";

export interface BoxmoverParseError {
  type: BoxmoverParseErrorType;
  message: string;
  details?: string[];
}

export type BoxmoverParseResult =
  | { success: true; data: BoxmoverWorkbook }
  | { success: false; error: BoxmoverParseError };

export const BOXMOVER_REQUIRED_HEADERS = [
  "Lastdag",
  "Ordernr",
  "Betalare",
  "Littera",
  "Fraktsedelnummer",
  "KlarFakturering",
  "Orderstatus",
  "Intäkter",
  "TG",
  "TB",
  "Resurs 1",
  "Resurs 1 kostn",
  "Resurs 2",
  "Resurs 2 kostn",
  "Resurs 3",
  "Resurs 3 kostn",
  "Mott namn",
  "Mott Ort",
  "Gods",
] as const;

export const BOXMOVER_DISPLAY_HEADERS = [
  "Datum",
  "Ordernr",
  "Betalare",
  "Littera",
  "FRS",
  "KlarFakt",
  "Orderstatus",
  "Intäkter",
  "TG",
  "TB",
  "Resurs",
  "Mott namn",
  "Mott Ort",
  "Gods",
] as const;

export const BOXMOVER_OK_ORDERSTATUSES = [
  "Avräknad",
  "Fakturerad",
  "Prisatt",
  "Prissatt",
] as const;

export const BOXMOVER_RESOURCE_CODE = 3058;
