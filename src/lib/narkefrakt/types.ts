export type NarkefraktSourceId = "source-a" | "source-b";

export const NARKEFRAKT_SOURCES: Record<
  NarkefraktSourceId,
  {
    id: NarkefraktSourceId;
    label: string;
    shortLabel: string;
    resourceCode: number;
  }
> = {
  "source-a": {
    id: "source-a",
    label: "3028",
    shortLabel: "3028",
    resourceCode: 3028,
  },
  "source-b": {
    id: "source-b",
    label: "3029",
    shortLabel: "3029",
    resourceCode: 3029,
  },
};

export interface NarkefraktRow {
  id: string;
  sourceId: NarkefraktSourceId;
  sourceLabel: string;
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

export interface NarkefraktSourceMeta {
  id: NarkefraktSourceId;
  label: string;
  fileName: string;
  sheetName: string;
  rowCount: number;
}

export interface NarkefraktWorkbook {
  sheetName: string;
  rows: NarkefraktRow[];
  rowCount: number;
  totalIntakter: number;
  totalIntakterFormatted: string;
  totalResurs: number;
  totalResursFormatted: string;
  sources: NarkefraktSourceMeta[];
}

export type NarkefraktParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error"
  | "missing_sources"
  | "wrong_resource_code";

export interface NarkefraktParseError {
  type: NarkefraktParseErrorType;
  message: string;
  details?: string[];
}

export type NarkefraktParseResult =
  | { success: true; data: NarkefraktWorkbook }
  | { success: false; error: NarkefraktParseError };

export const NARKEFRAKT_REQUIRED_HEADERS = [
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

export const NARKEFRAKT_DISPLAY_HEADERS = [
  "Källa",
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

export const NARKEFRAKT_OK_ORDERSTATUSES = [
  "Avräknad",
  "Fakturerad",
  "Prisatt",
  "Prissatt",
] as const;
