import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
  formatSwedishNumber,
  parseNumericValue,
} from "@/lib/formatters";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  isEmptyRow,
} from "@/lib/validation";
import {
  HLP_REQUIRED_HEADERS,
  type HlpDistributionParseResult,
  type HlpDistributionRow,
} from "./types";

/** Accept common spelling variants of Flakmeter. */
const FLM_HEADER_ALIASES = [
  "Beräknad Flakmeter",
  "Beräknad Falkmeter",
  "Beräknad Falmeter",
] as const;

/**
 * Parse HLP Distribution workbook — first sheet that contains the required headers.
 */
export async function parseHlpDistributionFile(
  file: File
): Promise<HlpDistributionParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const parsed = tryParseSheet(sheet, sheetName);
      if (parsed.success) return parsed;
      if (parsed.error.type === "missing_columns") {
        // Keep looking on other sheets; remember last column error for message.
        continue;
      }
    }

    // Prefer a concrete missing-columns message from the first sheet if possible.
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

    return tryParseSheet(workbook.Sheets[firstSheetName], firstSheetName);
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

function tryParseSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string
): HlpDistributionParseResult {
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
        details: [...HLP_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = -1;
  let headerMap = new Map<string, number>();

  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const candidate = buildHeaderIndexMap(rows[i] ?? []);
    if (findColumnIndex(candidate, "Orderdatum") !== undefined) {
      headerRowIndex = i;
      headerMap = candidate;
      break;
    }
  }

  if (headerRowIndex < 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Hittade ingen rubrikrad med "Orderdatum" i arbetsbladet "${sheetName}".`,
        details: [...HLP_REQUIRED_HEADERS],
      },
    };
  }

  const flmCol = findColumnIndexWithAliases(headerMap, FLM_HEADER_ALIASES);

  const missing = HLP_REQUIRED_HEADERS.filter((header) => {
    if (header === "Beräknad Flakmeter") return flmCol === undefined;
    return findColumnIndex(headerMap, header) === undefined;
  });

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
    orderdatum: findColumnIndex(headerMap, "Orderdatum")!,
    fraktsedel: findColumnIndex(headerMap, "Fraktsedel")!,
    ordernummer: findColumnIndex(headerMap, "Ordernummer")!,
    kundnamn: findColumnIndex(headerMap, "Kundnamn")!,
    avsandare1: findColumnIndex(headerMap, "Avsändare 1")!,
    mottagare1: findColumnIndex(headerMap, "Mottagare 1")!,
    pallplats: findColumnIndex(headerMap, "Pallplats")!,
    flm: flmCol!,
    vikt: findColumnIndex(headerMap, "Beräknad vikt")!,
    summa: findColumnIndex(headerMap, "Summa (Resursvaluta)")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: HlpDistributionRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const formattedRow = formattedRows[i] ?? [];
    const avgangsdatum = formatDate(row[col.orderdatum]);
    const fraktsedeln = pickCompactIdentifier(
      formattedRow[col.fraktsedel],
      row[col.fraktsedel]
    );
    if (!fraktsedeln.trim()) continue;

    const ordernr = pickCompactIdentifier(
      formattedRow[col.ordernummer],
      row[col.ordernummer]
    );
    const avsandare = formatIdentifier(row[col.kundnamn]);
    const terminal = shortenIfContainsHlp(formatIdentifier(row[col.avsandare1]));
    let mottagare = formatIdentifier(row[col.mottagare1]);
    // Blank Mottagare 1 on a row with Fraktsedel → Tillägg
    if (!mottagare.trim()) {
      mottagare = "Tillägg";
    } else {
      mottagare = shortenIfContainsHlp(mottagare);
    }
    const pall = parseNumericValue(row[col.pallplats]);
    const flm = parseNumericValue(row[col.flm]);
    const vikt = parseNumericValue(row[col.vikt]);
    const summa = parseNumericValue(row[col.summa]) ?? 0;

    rowId += 1;
    result.push({
      id: `hlp-${rowId}`,
      avgangsdatum,
      fraktsedeln,
      ordernr,
      avsandare,
      terminal,
      mottagare,
      pall,
      pallFormatted: formatSwedishNumber(pall),
      flm,
      flmFormatted: formatSwedishDecimal2(flm),
      vikt,
      viktFormatted: formatSwedishDecimal2(vikt),
      summa,
      summaFormatted: formatSwedishCurrency(summa),
      highlightFraktsedel: false,
    });
  }

  const tillaggFraktsedlar = new Set(
    result
      .filter((row) => row.mottagare === "Tillägg")
      .map((row) => row.fraktsedeln)
  );
  for (const row of result) {
    row.highlightFraktsedel = tillaggFraktsedlar.has(row.fraktsedeln);
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

function findColumnIndexWithAliases(
  headerMap: Map<string, number>,
  aliases: readonly string[]
): number | undefined {
  for (const alias of aliases) {
    const index = findColumnIndex(headerMap, alias);
    if (index !== undefined) return index;
  }
  return undefined;
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

/** Identifiers without thousand-separator spaces (Fraktsedel / Ordernr). */
function pickCompactIdentifier(formatted: unknown, raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Number.isInteger(raw) ? String(raw) : String(raw);
  }
  return pickIdentifier(formatted, raw).replace(/\s+/g, "");
}

/** If a name contains "HLP", shorten it to "HLP". */
function shortenIfContainsHlp(value: string): string {
  return /hlp/i.test(value) ? "HLP" : value;
}
