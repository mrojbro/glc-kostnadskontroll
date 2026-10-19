export const COOP_TEST_INPUT_REQUIRED_HEADERS = [
  "Latest Requested Date (Unloading Location)",
  "Execution Document",
  "Quantity",
  "Load Carrier",
  "Latest Requested Time (Unloading Location)",
  "Gross Weight",
  "Transportation Group",
  "Transportation Group (Description)",
  "Consignee",
] as const;

/** Output column headers in export order (left → right). */
export const COOP_TEST_OUTPUT_HEADERS = [
  "Latest Requested Date (Unloading Location)",
  "Freight Unit",
  "Handling Unit",
  "Original Order",
  "Quantity",
  "Load Carrier",
  "Latest Requested Time (Unloading Location)",
  "Gross Weight",
  "Transportation Group",
  "Transportation Group (Description)",
  "Butiksnr",
  "Consignee Address",
  "Resurs",
  "Littera",
  "Lossinfo",
  "Lastnings-ID",
  "Lastningsnamn",
  "Lastningsadress",
  "Lastningspostnr",
  "Lastningspostort",
] as const;

export interface CoopTestRow {
  id: string;
  latestRequestedDate: string;
  freightUnit: string;
  handlingUnit: string;
  originalOrder: string;
  quantity: string;
  loadCarrier: string;
  latestRequestedTime: string;
  grossWeight: string;
  transportationGroup: string;
  transportationGroupDescription: string;
  butiksnr: string;
  consigneeAddress: string;
  resurs: string;
  littera: string;
  lossinfo: string;
  lastningsId: string;
  lastningsnamn: string;
  lastningsadress: string;
  lastningspostnr: string;
  lastningspostort: string;
}

/** Fixed Transportation Group blocks shown in the summary. */
export const COOP_TEST_SUMMARY_GROUPS = [
  "ZDRY",
  "ZFRT",
  "ZFSH",
  "ZFZN",
] as const;

export type CoopTestSummaryGroupCode =
  (typeof COOP_TEST_SUMMARY_GROUPS)[number];

export interface CoopTestLoadCarrierSummary {
  loadCarrier: string;
  quantitySum: number;
  quantitySumFormatted: string;
  rowCount: number;
  tskRowCount: number;
}

export interface CoopTestGroupSummary {
  transportationGroup: CoopTestSummaryGroupCode;
  loadCarriers: CoopTestLoadCarrierSummary[];
  quantitySum: number;
  quantitySumFormatted: string;
  rowCount: number;
  tskRowCount: number;
}

export interface CoopTestWorkbook {
  sheetName: string;
  fileName: string;
  rows: CoopTestRow[];
  rowCount: number;
  /** Four TG blocks; includes ignored TSK rows. */
  summary: CoopTestGroupSummary[];
  tskIgnoredCount: number;
}

export type CoopTestParseErrorType =
  | "missing_sheet"
  | "missing_columns"
  | "parse_error";

export interface CoopTestParseError {
  type: CoopTestParseErrorType;
  message: string;
  details?: string[];
}

export type CoopTestParseResult =
  | { success: true; data: CoopTestWorkbook }
  | { success: false; error: CoopTestParseError };
