export interface DaviesRow {
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

export interface DaviesWorkbook {
  sheetName: string;
  rows: DaviesRow[];
  rowCount: number;
  totalIntakter: number;
  totalIntakterFormatted: string;
}

export type DaviesParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface DaviesParseError {
  type: DaviesParseErrorType;
  message: string;
  details?: string[];
}

export type DaviesParseResult =
  | { success: true; data: DaviesWorkbook }
  | { success: false; error: DaviesParseError };

export const DAVIES_REQUIRED_HEADERS = [
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

export const DAVIES_DISPLAY_HEADERS = [
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

export const DAVIES_OK_ORDERSTATUSES = [
  "Avräknad",
  "Fakturerad",
  "Prisatt",
  "Prissatt",
] as const;
