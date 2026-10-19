import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatTime,
  parseNumericValue,
} from "@/lib/formatters";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  isEmptyRow,
} from "@/lib/validation";
import { lookupConsignee } from "./consigneeLookup";
import {
  COOP_TEST_INPUT_REQUIRED_HEADERS,
  COOP_TEST_SUMMARY_GROUPS,
  type CoopTestGroupSummary,
  type CoopTestParseResult,
  type CoopTestRow,
  type CoopTestSummaryGroupCode,
} from "./types";

/**
 * Parse Coop Test input Excel and map to the fixed output column layout.
 */
export async function parseCoopTestFile(
  file: File
): Promise<CoopTestParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        error: {
          type: "missing_sheet",
          message: "Excel-filen innehåller inga arbetsblad.",
        },
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<
      (string | number | boolean | Date | null)[]
    >(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    });
    const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
      header: 1,
      defval: null,
      raw: false,
      blankrows: false,
    });

    return mapMatrixToWorkbook(
      rawRows,
      formattedRows,
      firstSheetName,
      file.name
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Okänt fel vid läsning av filen.";
    return {
      success: false,
      error: {
        type: "parse_error",
        message: `Kunde inte läsa Excel-filen: ${message}`,
      },
    };
  }
}

/**
 * Parse tab-separated (or semicolon) clipboard paste from Excel.
 */
export function parseCoopTestPaste(text: string): CoopTestParseResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return {
      success: false,
      error: {
        type: "parse_error",
        message: "Inget att klistra in — kopiera rader från Excel först.",
      },
    };
  }

  const lines = trimmed.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return {
      success: false,
      error: {
        type: "parse_error",
        message: "Inget att klistra in — kopiera rader från Excel först.",
      },
    };
  }

  const delimiter = detectDelimiter(lines[0] ?? "");
  const matrix = lines.map((line) => splitPasteLine(line, delimiter));

  return mapMatrixToWorkbook(matrix, matrix, "Inklistrad data", "inklistrad");
}

function detectDelimiter(headerLine: string): "\t" | ";" | "," {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  if (tabs >= semis && tabs >= commas && tabs > 0) return "\t";
  if (semis >= commas && semis > 0) return ";";
  if (commas > 0) return ",";
  return "\t";
}

function splitPasteLine(line: string, delimiter: "\t" | ";" | ","): string[] {
  if (delimiter === "\t") {
    return line.split("\t").map((cell) => cell.trim());
  }

  // Simple CSV/semicolon split (no nested quotes needed for typical Excel paste)
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function mapMatrixToWorkbook(
  rawRows: (string | number | boolean | Date | null)[][],
  formattedRows: (string | number | boolean | Date | null)[][],
  sheetName: string,
  fileName: string
): CoopTestParseResult {
  if (rawRows.length === 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Datan saknar rubrikrad.`,
        details: [...COOP_TEST_INPUT_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rawRows[0] ?? []);

  if (
    findColumnIndex(
      headerMap,
      "Latest Requested Date (Unloading Location)"
    ) === undefined
  ) {
    for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rawRows[i] ?? []);
      if (
        findColumnIndex(
          candidate,
          "Latest Requested Date (Unloading Location)"
        ) !== undefined
      ) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = COOP_TEST_INPUT_REQUIRED_HEADERS.filter(
    (header) => findColumnIndex(headerMap, header) === undefined
  );

  if (missing.length > 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Obligatoriska kolumner saknas i "${fileName}".`,
        details: missing.map((h) => `"${h}"`),
      },
    };
  }

  const col = {
    latestRequestedDate: findColumnIndex(
      headerMap,
      "Latest Requested Date (Unloading Location)"
    )!,
    executionDocument: findColumnIndex(headerMap, "Execution Document")!,
    quantity: findColumnIndex(headerMap, "Quantity")!,
    loadCarrier: findColumnIndex(headerMap, "Load Carrier")!,
    latestRequestedTime: findColumnIndex(
      headerMap,
      "Latest Requested Time (Unloading Location)"
    )!,
    grossWeight: findColumnIndex(headerMap, "Gross Weight")!,
    transportationGroup: findColumnIndex(headerMap, "Transportation Group")!,
    transportationGroupDescription: findColumnIndex(
      headerMap,
      "Transportation Group (Description)"
    )!,
    unloadingLocation: findColumnIndex(headerMap, "Consignee")!,
  };

  const result: CoopTestRow[] = [];
  /** groupCode → loadCarrierKey → aggregates (includes TSK). */
  const groupMaps = new Map<
    CoopTestSummaryGroupCode,
    Map<
      string,
      {
        loadCarrier: string;
        rowCount: number;
        quantitySum: number;
        tskRowCount: number;
      }
    >
  >();
  for (const code of COOP_TEST_SUMMARY_GROUPS) {
    groupMaps.set(code, new Map());
  }

  let rowId = 0;
  let tskIgnoredCount = 0;

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const isTsk = rowContainsTsk(row) || rowContainsTsk(formatted);

    const latestRequestedDate = formatDate(
      formatted[col.latestRequestedDate] ?? row[col.latestRequestedDate]
    );
    const originalOrder = formatIdentifier(
      formatted[col.executionDocument] ?? row[col.executionDocument]
    );
    const quantityRaw = formatted[col.quantity] ?? row[col.quantity];
    const quantity = formatIdentifier(quantityRaw);
    const loadCarrier = formatIdentifier(
      formatted[col.loadCarrier] ?? row[col.loadCarrier]
    );
    const latestRequestedTime = formatTime(
      row[col.latestRequestedTime] ?? formatted[col.latestRequestedTime]
    );
    const grossWeightRaw = row[col.grossWeight];
    const grossWeightFormattedCell = formatted[col.grossWeight];
    const grossWeight = formatGrossWeight(
      grossWeightRaw,
      grossWeightFormattedCell
    );
    const transportationGroup = formatIdentifier(
      formatted[col.transportationGroup] ?? row[col.transportationGroup]
    );
    const transportationGroupDescription = formatIdentifier(
      formatted[col.transportationGroupDescription] ??
        row[col.transportationGroupDescription]
    );
    const butiksnr = formatIdentifier(
      formatted[col.unloadingLocation] ?? row[col.unloadingLocation]
    );

    if (
      !latestRequestedDate &&
      !originalOrder &&
      !quantity &&
      !butiksnr &&
      !grossWeight &&
      !transportationGroup &&
      !loadCarrier
    ) {
      continue;
    }

    const quantityValue = parseNumericValue(quantityRaw) ?? 0;
    const summaryGroup = matchSummaryGroup(transportationGroup);
    if (summaryGroup) {
      const carrierMap = groupMaps.get(summaryGroup)!;
      const carrierKey = loadCarrier.trim().toLowerCase() || "—";
      const existing = carrierMap.get(carrierKey);
      if (existing) {
        existing.rowCount += 1;
        existing.quantitySum += quantityValue;
        if (isTsk) existing.tskRowCount += 1;
      } else {
        carrierMap.set(carrierKey, {
          loadCarrier: loadCarrier || "—",
          rowCount: 1,
          quantitySum: quantityValue,
          tskRowCount: isTsk ? 1 : 0,
        });
      }
    }

    if (isTsk) {
      tskIgnoredCount += 1;
      continue;
    }

    const register = lookupConsignee(butiksnr);

    rowId += 1;
    result.push({
      id: `coop-test-${rowId}`,
      latestRequestedDate,
      freightUnit: "",
      handlingUnit: "",
      originalOrder,
      quantity,
      loadCarrier,
      latestRequestedTime,
      grossWeight,
      transportationGroup,
      transportationGroupDescription,
      butiksnr,
      consigneeAddress: register?.consigneeAddress ?? "",
      resurs: "",
      littera: register?.littera ?? "",
      lossinfo: "",
      lastningsId: register?.lastningsId ?? "",
      lastningsnamn: register?.lastningsnamn ?? "",
      lastningsadress: register?.lastningsadress ?? "",
      lastningspostnr: register?.lastningspostnr ?? "",
      lastningspostort: register?.lastningspostort ?? "",
    });
  }

  const summary = buildGroupSummaries(groupMaps);

  return {
    success: true,
    data: {
      sheetName,
      fileName,
      rows: result,
      rowCount: result.length,
      summary,
      tskIgnoredCount,
    },
  };
}

function matchSummaryGroup(
  transportationGroup: string
): CoopTestSummaryGroupCode | null {
  const normalized = transportationGroup.trim().toUpperCase();
  for (const code of COOP_TEST_SUMMARY_GROUPS) {
    if (normalized === code || normalized.includes(code)) return code;
  }
  return null;
}

function buildGroupSummaries(
  groupMaps: Map<
    CoopTestSummaryGroupCode,
    Map<
      string,
      {
        loadCarrier: string;
        rowCount: number;
        quantitySum: number;
        tskRowCount: number;
      }
    >
  >
): CoopTestGroupSummary[] {
  return COOP_TEST_SUMMARY_GROUPS.map((code) => {
    const carrierMap = groupMaps.get(code) ?? new Map();
    const loadCarriers = Array.from(carrierMap.values())
      .map((entry) => ({
        loadCarrier: entry.loadCarrier,
        quantitySum: entry.quantitySum,
        quantitySumFormatted: formatSummaryNumber(entry.quantitySum, 0),
        rowCount: entry.rowCount,
        tskRowCount: entry.tskRowCount,
      }))
      .sort((a, b) =>
        a.loadCarrier.localeCompare(b.loadCarrier, "sv", {
          numeric: true,
          sensitivity: "base",
        })
      );

    const quantitySum = loadCarriers.reduce(
      (sum, entry) => sum + entry.quantitySum,
      0
    );
    const rowCount = loadCarriers.reduce(
      (sum, entry) => sum + entry.rowCount,
      0
    );
    const tskRowCount = loadCarriers.reduce(
      (sum, entry) => sum + entry.tskRowCount,
      0
    );

    return {
      transportationGroup: code,
      loadCarriers,
      quantitySum,
      quantitySumFormatted: formatSummaryNumber(quantitySum, 0),
      rowCount,
      tskRowCount,
    };
  });
}

function formatSummaryNumber(value: number, fractionDigits: number): string {
  return value
    .toFixed(fractionDigits)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

/** Skip input rows where any cell contains TSK. */
function rowContainsTsk(
  row: (string | number | boolean | Date | null)[]
): boolean {
  for (const cell of row) {
    if (cell === null || cell === undefined) continue;
    if (String(cell).toUpperCase().includes("TSK")) return true;
  }
  return false;
}

/** Always two decimals with comma: 368.307 → 368,31 · 150 → 150,00. */
function formatGrossWeight(raw: unknown, formatted: unknown): string {
  const parsed =
    parseNumericValue(raw) ??
    parseNumericValue(formatted) ??
    parseNumericValue(String(formatted ?? raw ?? "").replace(/\./g, ","));

  if (parsed === null) return "";

  const fixed = parsed.toFixed(2);
  return fixed.replace(".", ",");
}
