import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
  formatSwedishNumber,
  parseNumericValue,
} from "@/lib/formatters";
import { cellMatchesResourceCode } from "@/lib/resourceCodeGuard";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  isEmptyRow,
} from "@/lib/validation";
import {
  GDL_INPUT1_REQUIRED_HEADERS,
  GDL_INPUT2_REQUIRED_HEADERS,
  GDL_T5_RESOURCE_CODES,
  type GdlInput2ParseResult,
  type GdlInput2Row,
  type GdlParseResult,
  type GdlRow,
  type GdlWorkbook,
} from "./types";

/**
 * Parse GDL Input 1 — first sheet with required headers.
 */
export async function parseGdlFile(file: File): Promise<GdlParseResult> {
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

    return tryParseInput1Sheet(
      workbook.Sheets[firstSheetName],
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

function tryParseInput1Sheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  fileName: string
): GdlParseResult {
  const rows = XLSX.utils.sheet_to_json<
    (string | number | boolean | Date | null)[]
  >(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Arbetsbladet "${sheetName}" saknar rubrikrad och data.`,
        details: [...GDL_INPUT1_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Fakturanummer") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Fakturanummer") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = GDL_INPUT1_REQUIRED_HEADERS.filter(
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
    fakturanummer: findColumnIndex(headerMap, "Fakturanummer")!,
    avsandarreferens: findColumnIndex(headerMap, "Avsändarreferens")!,
    fraktsedel: findColumnIndex(headerMap, "Fraktsedel")!,
    leveransdatum: findColumnIndex(headerMap, "Leveransdatum")!,
    avsandare: findColumnIndex(headerMap, "Avsändare")!,
    mottagare: findColumnIndex(headerMap, "Mottagare")!,
    tillort: findColumnIndex(headerMap, "Tillort")!,
    prisUtanDmt: findColumnIndex(headerMap, "Pris utan DMT")!,
    dmt: findColumnIndex(headerMap, "DMT")!,
    summa: findColumnIndex(headerMap, "Summa")!,
    kolli: findColumnIndex(headerMap, "Kolli")!,
    vikt: findColumnIndex(headerMap, "Vikt")!,
    pall: findColumnIndex(headerMap, "Pall")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: GdlRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const prisUtanDmt = parseNumericValue(row[col.prisUtanDmt]);
    const dmt = parseNumericValue(row[col.dmt]);
    const summa = parseNumericValue(row[col.summa]);
    const kolli = parseNumericValue(row[col.kolli]);
    const vikt = parseNumericValue(row[col.vikt]);
    const pall = parseNumericValue(row[col.pall]);

    rowId += 1;
    result.push({
      id: `gdl-${rowId}`,
      fakturanummer: formatIdentifier(
        formatted[col.fakturanummer] ?? row[col.fakturanummer]
      ),
      ordernr: formatIdentifier(
        formatted[col.avsandarreferens] ?? row[col.avsandarreferens]
      ),
      frs: formatIdentifier(formatted[col.fraktsedel] ?? row[col.fraktsedel]),
      leveransdatum: formatDate(
        formatted[col.leveransdatum] ?? row[col.leveransdatum]
      ),
      avsandare: formatIdentifier(
        formatted[col.avsandare] ?? row[col.avsandare]
      ),
      mottagare: formatIdentifier(
        formatted[col.mottagare] ?? row[col.mottagare]
      ),
      postort: formatIdentifier(formatted[col.tillort] ?? row[col.tillort]),
      prisUtanDmt,
      prisUtanDmtFormatted:
        prisUtanDmt === null ? "—" : formatSwedishCurrency(prisUtanDmt),
      dmt,
      dmtFormatted: dmt === null ? "—" : formatSwedishCurrency(dmt),
      summa,
      summaFormatted: summa === null ? "—" : formatSwedishCurrency(summa),
      ...buildT5AndDifferens(null, summa),
      kolli,
      kolliFormatted: kolli === null ? "—" : formatSwedishNumber(kolli),
      vikt,
      viktFormatted: vikt === null ? "—" : formatSwedishDecimal2(vikt),
      pall,
      pallFormatted: pall === null ? "—" : formatSwedishNumber(pall),
    });
  }

  const sortedRows = sortGdlRows(result);

  return {
    success: true,
    data: {
      sheetName,
      fileName,
      rows: sortedRows,
      rowCount: sortedRows.length,
    },
  };
}

/**
 * Parse GDL Input 2 — Ordernr + Resurs 1–3 with costs for T5 lookup.
 */
export async function parseGdlInput2File(
  file: File
): Promise<GdlInput2ParseResult> {
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

    return tryParseInput2Sheet(
      workbook.Sheets[firstSheetName],
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

function tryParseInput2Sheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  fileName: string
): GdlInput2ParseResult {
  const rows = XLSX.utils.sheet_to_json<
    (string | number | boolean | Date | null)[]
  >(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Arbetsbladet "${sheetName}" saknar rubrikrad och data.`,
        details: [...GDL_INPUT2_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Ordernr") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Ordernr") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = GDL_INPUT2_REQUIRED_HEADERS.filter(
    (header) => findColumnIndex(headerMap, header) === undefined
  );

  if (missing.length > 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Obligatoriska kolumner saknas i Input 2 ("${sheetName}").`,
        details: missing.map((h) => `"${h}"`),
      },
    };
  }

  const col = {
    ordernr: findColumnIndex(headerMap, "Ordernr")!,
    resurs1: findColumnIndex(headerMap, "Resurs 1")!,
    resurs1Kostn: findColumnIndex(headerMap, "Resurs 1 kostn")!,
    resurs2: findColumnIndex(headerMap, "Resurs 2")!,
    resurs2Kostn: findColumnIndex(headerMap, "Resurs 2 kostn")!,
    resurs3: findColumnIndex(headerMap, "Resurs 3")!,
    resurs3Kostn: findColumnIndex(headerMap, "Resurs 3 kostn")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: GdlInput2Row[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const ordernr = formatIdentifier(
      formatted[col.ordernr] ?? row[col.ordernr]
    );
    if (!ordernr) continue;

    result.push({
      ordernr,
      resurs1: formatIdentifier(formatted[col.resurs1] ?? row[col.resurs1]),
      resurs1Kostn: parseNumericValue(row[col.resurs1Kostn]),
      resurs2: formatIdentifier(formatted[col.resurs2] ?? row[col.resurs2]),
      resurs2Kostn: parseNumericValue(row[col.resurs2Kostn]),
      resurs3: formatIdentifier(formatted[col.resurs3] ?? row[col.resurs3]),
      resurs3Kostn: parseNumericValue(row[col.resurs3Kostn]),
    });
  }

  return {
    success: true,
    data: {
      sheetName,
      fileName,
      rows: result,
      rowCount: result.length,
    },
  };
}

function normalizeOrdernrKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Default display order: Leveransdatum → Postort → Mottagare.
 */
function sortGdlRows(rows: GdlRow[]): GdlRow[] {
  return [...rows].sort((a, b) => {
    const byDate = compareSortText(a.leveransdatum, b.leveransdatum);
    if (byDate !== 0) return byDate;
    const byPostort = compareSortText(a.postort, b.postort);
    if (byPostort !== 0) return byPostort;
    return compareSortText(a.mottagare, b.mottagare);
  });
}

function compareSortText(a: string, b: string): number {
  const left = a.trim();
  const right = b.trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, "sv", {
    numeric: true,
    sensitivity: "base",
  });
}

function isT5ResourceCode(value: unknown): boolean {
  return GDL_T5_RESOURCE_CODES.some((code) =>
    cellMatchesResourceCode(value, code)
  );
}

function resolveT5FromInput2Row(row: GdlInput2Row): number {
  const pairs: Array<{ resurs: string; kostn: number | null }> = [
    { resurs: row.resurs1, kostn: row.resurs1Kostn },
    { resurs: row.resurs2, kostn: row.resurs2Kostn },
    { resurs: row.resurs3, kostn: row.resurs3Kostn },
  ];

  for (const pair of pairs) {
    if (isT5ResourceCode(pair.resurs)) {
      // Matched 3024/3032 — blank cost becomes 0
      return pair.kostn ?? 0;
    }
  }

  // Ordernr matched in Input 2, but no 3024/3032 (or blank resurs) → 0
  return 0;
}

function buildT5AndDifferens(
  t5: number | null,
  summa: number | null
): Pick<
  GdlRow,
  "t5" | "t5Formatted" | "differens" | "differensFormatted"
> {
  const differens =
    t5 === null || summa === null ? null : t5 - summa;

  return {
    t5,
    t5Formatted: t5 === null ? "—" : formatSwedishCurrency(t5),
    differens,
    differensFormatted:
      differens === null ? "—" : formatSwedishCurrency(differens),
  };
}

/**
 * Match Input 1 Ordernr against Input 2 and fill T5 from Resurs kostn
 * when Resurs 1–3 contains 3024 or 3032. Matched orders with blank
 * cost/data get T5 = 0.
 */
export function applyGdlInput2ToWorkbook(
  workbook: GdlWorkbook,
  input2Rows: GdlInput2Row[],
  input2FileName: string
): GdlWorkbook {
  const lookup = new Map<string, GdlInput2Row>();
  for (const row of input2Rows) {
    const key = normalizeOrdernrKey(row.ordernr);
    if (!key || lookup.has(key)) continue;
    lookup.set(key, row);
  }

  let t5MatchCount = 0;
  const rows = workbook.rows.map((row) => {
    const match = lookup.get(normalizeOrdernrKey(row.ordernr));
    if (!match) {
      return { ...row, ...buildT5AndDifferens(null, row.summa) };
    }

    const t5 = resolveT5FromInput2Row(match);
    t5MatchCount += 1;

    return {
      ...row,
      ...buildT5AndDifferens(t5, row.summa),
    };
  });

  return {
    ...workbook,
    rows: sortGdlRows(rows),
    input2FileName,
    t5MatchCount,
  };
}
