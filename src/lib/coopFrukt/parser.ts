import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
  formatSwedishDecimal3,
  parseNumericValue,
} from "@/lib/formatters";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  findSheetName,
  isEmptyRow,
  normalizeHeader,
} from "@/lib/validation";
import {
  COOP_FRUKT_REQUIRED_HEADERS,
  COOP_FRUKT_SHEET_NAME,
  type CoopFruktParseResult,
  type CoopFruktRow,
} from "./types";

/**
 * Parse Coop Frukt workbook — sheet "Grunddata" (prefer name, else 2nd sheet).
 */
export async function parseCoopFruktFile(
  file: File
): Promise<CoopFruktParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const sheetName = resolveGrunddataSheet(workbook.SheetNames);
    if (!sheetName) {
      return {
        success: false,
        error: {
          type: "missing_sheet",
          message: `Obligatoriskt arbetsblad saknas: "${COOP_FRUKT_SHEET_NAME}" (blad 2).`,
          details: workbook.SheetNames.map((name) => `"${name}"`),
        },
      };
    }

    const sheet = workbook.Sheets[sheetName];
    return parseGrunddataSheet(sheet, sheetName);
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

function resolveGrunddataSheet(sheetNames: string[]): string | undefined {
  const byName = findSheetName(sheetNames, COOP_FRUKT_SHEET_NAME);
  if (byName) return byName;
  // Sheet number 2 = index 1
  if (sheetNames.length >= 2) return sheetNames[1];
  return undefined;
}

function parseGrunddataSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string
): CoopFruktParseResult {
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
        message: `Arbetsbladet "${sheetName}" saknar rubrikrad och data.`,
        details: [...COOP_FRUKT_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Fraktsedelsnummer") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Fraktsedelsnummer") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = COOP_FRUKT_REQUIRED_HEADERS.filter(
    (header) => findColumnIndex(headerMap, header) === undefined
  );

  if (missing.length > 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Obligatoriska kolumner saknas i arbetsbladet "${sheetName}".`,
        details: missing.map((h) => `"${h}"`),
      },
    };
  }

  const col = {
    datum: findColumnIndex(headerMap, "Lev. Datum")!,
    vecka: findColumnIndex(headerMap, "Vecka")!,
    frs: findColumnIndex(headerMap, "Fraktsedelsnummer")!,
    kundnamn: findColumnIndex(headerMap, "Kundnamn")!,
    motort: findColumnIndex(headerMap, "Motort")!,
    kg: findColumnIndex(headerMap, "Kg")!,
    krKg: findColumnIndex(headerMap, "Kr/Kg")!,
    totalKr: findColumnIndex(headerMap, "Total Kr")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: CoopFruktRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const formattedRow = formattedRows[i] ?? [];
    const frs = pickIdentifier(formattedRow[col.frs], row[col.frs]);
    const vecka = pickIdentifier(formattedRow[col.vecka], row[col.vecka]);
    const butiksnamn = formatIdentifier(row[col.kundnamn]);
    const postort = formatIdentifier(row[col.motort]);
    const avgangsdatum = formatDate(row[col.datum]);
    const vikt = parseNumericValue(row[col.kg]);
    const pris = parseNumericValue(row[col.krKg]);
    const summa = parseNumericValue(row[col.totalKr]) ?? 0;
    const summaMatches = doesViktPrisMatchSumma(vikt, pris, summa);

    if (!frs && !butiksnamn && !avgangsdatum && vikt === null && summa === 0) {
      continue;
    }

    rowId += 1;
    result.push({
      id: `frukt-${rowId}`,
      avgangsdatum,
      vecka,
      frs,
      ekipage: "",
      terminal: "",
      butiksnamn,
      postort,
      vikt,
      viktFormatted: formatSwedishDecimal2(vikt),
      pris,
      prisFormatted: formatSwedishDecimal3(pris),
      summa,
      summaFormatted: formatSwedishCurrency(summa),
      summaMatches,
    });
  }

  const totalSumma = result.reduce((sum, row) => sum + row.summa, 0);

  return {
    success: true,
    data: {
      sheetName,
      rows: result,
      rowCount: result.length,
      totalSumma,
      totalSummaFormatted: formatSwedishCurrency(totalSumma),
    },
  };
}

function pickIdentifier(formatted: unknown, raw: unknown): string {
  if (typeof formatted === "string" && formatted.trim() !== "") {
    const trimmed = formatted.trim();
    if (!/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(trimmed)) {
      return trimmed;
    }
  }
  return formatIdentifier(raw);
}

function doesViktPrisMatchSumma(
  vikt: number | null,
  pris: number | null,
  summa: number
): boolean {
  if (vikt === null || pris === null) return false;
  const product = vikt * pris;
  return Math.abs(product - summa) < 0.015;
}

/** Expose for tests / debugging */
export function headerAliasesMatch(a: string, b: string): boolean {
  return normalizeHeader(a) === normalizeHeader(b);
}
