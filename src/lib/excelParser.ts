import * as XLSX from "xlsx";
import { lookupButikByNumber } from "./butikLookup";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
  parseNumericValue,
} from "./formatters";
import {
  CHARGE_DESCRIPTION_EXCLUSIONS,
  LOCATION_ID_EXCLUSIONS,
  REQUIRED_SHEETS,
  RPU_PER_PALL,
  type CostControlRow,
  type InvoiceSummary,
  type ParseError,
  type ParseResult,
  type SummaryItem,
} from "./types";
import {
  buildHeaderIndexMap,
  equalsIgnoreCase,
  findColumnIndex,
  findSheetName,
  isEmptyRow,
  validateRequiredColumns,
  validateSheets,
} from "./validation";

const SUMMARY_FALLBACKS = {
  freightByRpu: "Freight by RPU",
  shunting: "Shunting",
  fuelSurcharge: "Fuel Surcharge %",
  adjustment: "Adjustment",
} as const;

/**
 * Parse an uploaded Excel workbook into summary + filtered invoice rows.
 * All processing happens in the browser.
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const sheetError = validateSheets(workbook.SheetNames);
    if (sheetError) {
      return { success: false, error: sheetError };
    }

    const summarySheetName = findSheetName(
      workbook.SheetNames,
      REQUIRED_SHEETS.summary
    )!;
    const invoiceSheetName = findSheetName(
      workbook.SheetNames,
      REQUIRED_SHEETS.invoice
    )!;

    const summarySheet = workbook.Sheets[summarySheetName];
    const invoiceSheet = workbook.Sheets[invoiceSheetName];

    const summary = parseSummarySheet(summarySheet);
    const invoiceResult = parseInvoiceSheet(invoiceSheet);

    if (!invoiceResult.success) {
      return invoiceResult;
    }

    const totalSek = invoiceResult.rows.reduce((sum, row) => sum + row.sek, 0);

    return {
      success: true,
      data: {
        summary,
        rows: invoiceResult.rows,
        totalSek,
        totalSekFormatted: formatSwedishCurrency(totalSek),
        rowCount: invoiceResult.rows.length,
      },
    };
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

function getCellAsString(sheet: XLSX.WorkSheet, address: string): string {
  const cell = sheet[address];
  if (!cell) return "";
  if (cell.w !== undefined && String(cell.w).trim() !== "") {
    return String(cell.w).trim();
  }
  if (cell.v === null || cell.v === undefined) return "";
  return String(cell.v).trim();
}

function emptySummaryItem(fallbackLabel: string): SummaryItem {
  return {
    label: fallbackLabel,
    value: 0,
    formattedValue: formatSwedishCurrency(0),
  };
}

/**
 * Parse Invoice basis summary by matching Charge description rows
 * and reading Calculated amount — not fixed cell addresses.
 * Reference is still taken from C2.
 */
function parseSummarySheet(sheet: XLSX.WorkSheet): InvoiceSummary {
  const referenceRaw = getCellAsString(sheet, "C2");
  const reference = referenceRaw || "Okänd referens";

  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
    sheet,
    {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    }
  );

  let headerRowIndex = -1;
  let headerMap = new Map<string, number>();

  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const candidate = buildHeaderIndexMap(rows[i] ?? []);
    const hasCharge =
      findColumnIndex(candidate, "Charge description") !== undefined;
    const hasAmount =
      findColumnIndex(candidate, "Calculated amount") !== undefined;
    if (hasCharge && hasAmount) {
      headerRowIndex = i;
      headerMap = candidate;
      break;
    }
  }

  if (headerRowIndex < 0) {
    return {
      reference,
      freightByRpu: emptySummaryItem(SUMMARY_FALLBACKS.freightByRpu),
      shunting: emptySummaryItem(SUMMARY_FALLBACKS.shunting),
      fuelSurcharge: emptySummaryItem(SUMMARY_FALLBACKS.fuelSurcharge),
      adjustment: emptySummaryItem(SUMMARY_FALLBACKS.adjustment),
    };
  }

  const chargeCol = findColumnIndex(headerMap, "Charge description")!;
  const amountCol = findColumnIndex(headerMap, "Calculated amount")!;

  const byCharge = new Map<string, SummaryItem>();

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const chargeRaw = row[chargeCol];
    if (chargeRaw === null || chargeRaw === undefined) continue;

    const chargeLabel = String(chargeRaw).trim();
    if (!chargeLabel) continue;

    // Skip total row
    if (equalsIgnoreCase(chargeLabel, "Total")) continue;

    const amount = parseNumericValue(row[amountCol]) ?? 0;
    byCharge.set(chargeLabel.toLowerCase(), {
      label: chargeLabel,
      value: amount,
      formattedValue: formatSwedishCurrency(amount),
    });
  }

  const pick = (key: string, fallback: string): SummaryItem => {
    const found = byCharge.get(key.toLowerCase());
    return found ?? emptySummaryItem(fallback);
  };

  return {
    reference,
    freightByRpu: pick(
      SUMMARY_FALLBACKS.freightByRpu,
      SUMMARY_FALLBACKS.freightByRpu
    ),
    shunting: pick(SUMMARY_FALLBACKS.shunting, SUMMARY_FALLBACKS.shunting),
    fuelSurcharge: pick(
      SUMMARY_FALLBACKS.fuelSurcharge,
      SUMMARY_FALLBACKS.fuelSurcharge
    ),
    adjustment: pick(
      SUMMARY_FALLBACKS.adjustment,
      SUMMARY_FALLBACKS.adjustment
    ),
  };
}

interface InvoiceParseSuccess {
  success: true;
  rows: CostControlRow[];
}

interface InvoiceParseFailure {
  success: false;
  error: ParseError;
}

function parseInvoiceSheet(
  sheet: XLSX.WorkSheet
): InvoiceParseSuccess | InvoiceParseFailure {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
    sheet,
    {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    }
  );

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message:
          'Arbetsbladet "Invoice basis" saknar rubrikrad och data.',
        details: [
          "Freight order / Service order",
          "Date",
          "Stage Destination location name",
          "Stage Destination location ID",
          "Stage location city",
          "Means of transport",
          "Quantity",
          "Calculated amount",
          "Charge description",
        ],
      },
    };
  }

  // Find header row: first non-empty row that contains known headers
  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  const hasFreightHeader =
    findColumnIndex(headerMap, "Freight order / Service order") !== undefined;

  if (!hasFreightHeader) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (
        findColumnIndex(candidate, "Freight order / Service order") !==
        undefined
      ) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const columnError = validateRequiredColumns(headerMap);
  if (columnError) {
    return { success: false, error: columnError };
  }

  const col = {
    foNummer: findColumnIndex(headerMap, "Freight order / Service order")!,
    datum: findColumnIndex(headerMap, "Date")!,
    butiksnamn: findColumnIndex(
      headerMap,
      "Stage Destination location name"
    )!,
    butiksnr: findColumnIndex(headerMap, "Stage Destination location ID")!,
    postort: findColumnIndex(headerMap, "Stage location city")!,
    typ: findColumnIndex(headerMap, "Means of transport")!,
    rpu: findColumnIndex(headerMap, "Quantity")!,
    sek: findColumnIndex(headerMap, "Calculated amount")!,
    chargeDescription: findColumnIndex(headerMap, "Charge description")!,
  };

  // Build a parallel formatted view for identifier preservation
  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: CostControlRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const foRaw = row[col.foNummer];
    if (equalsIgnoreCase(foRaw, "Subtotal")) continue;

    const chargeRaw = row[col.chargeDescription];
    const chargeNormalized = String(chargeRaw ?? "")
      .trim()
      .toLowerCase();
    if (
      CHARGE_DESCRIPTION_EXCLUSIONS.some(
        (excluded) => excluded === chargeNormalized
      )
    ) {
      continue;
    }

    const locationIdText = String(row[col.butiksnr] ?? "")
      .trim()
      .toLowerCase();
    if (
      LOCATION_ID_EXCLUSIONS.some((excluded) =>
        locationIdText.includes(excluded)
      )
    ) {
      continue;
    }

    const formattedRow = formattedRows[i] ?? [];

    const foNummer = pickIdentifier(formattedRow[col.foNummer], foRaw);
    const butiksnr = pickIdentifier(
      formattedRow[col.butiksnr],
      row[col.butiksnr]
    );

    // Skip rows that have no meaningful invoice data after filters
    if (
      !foNummer &&
      !row[col.datum] &&
      !row[col.butiksnamn] &&
      parseNumericValue(row[col.sek]) === null
    ) {
      continue;
    }

    const sekValue = parseNumericValue(row[col.sek]) ?? 0;
    const rpuValue = parseNumericValue(row[col.rpu]);
    const pallValue =
      rpuValue === null ? null : Number((rpuValue / RPU_PER_PALL).toFixed(2));
    const registerButik = lookupButikByNumber(butiksnr);
    const butiksnamn =
      registerButik?.butiksnamn ?? formatIdentifier(row[col.butiksnamn]);

    rowId += 1;
    result.push({
      id: `row-${rowId}`,
      foNummer,
      typ: formatIdentifier(row[col.typ]),
      datum: formatDate(row[col.datum]),
      butiksnamn,
      butiksnr,
      postort: formatIdentifier(row[col.postort]),
      pall: pallValue,
      pallFormatted: formatSwedishDecimal2(pallValue),
      rpu: rpuValue,
      rpuFormatted: formatSwedishDecimal2(rpuValue),
      sek: sekValue,
      sekFormatted: formatSwedishCurrency(sekValue),
    });
  }

  return { success: true, rows: result };
}

/**
 * Prefer formatted text (preserves leading zeroes) when available.
 */
function pickIdentifier(formatted: unknown, raw: unknown): string {
  if (typeof formatted === "string" && formatted.trim() !== "") {
    // Avoid Excel date-formatted noise for IDs
    const trimmed = formatted.trim();
    if (!/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(trimmed)) {
      return trimmed;
    }
  }
  return formatIdentifier(raw);
}
