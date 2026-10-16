import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
  formatSwedishNumber,
  parseNumericValue,
  roundCurrency2,
} from "@/lib/formatters";
import { cellMatchesResourceCode } from "@/lib/resourceCodeGuard";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  isEmptyRow,
} from "@/lib/validation";
import {
  AXTRANS_INPUT1_REQUIRED_HEADERS,
  AXTRANS_INPUT2_REQUIRED_HEADERS,
  AXTRANS_T5_RESOURCE_CODE,
  type AxtransInput2ParseResult,
  type AxtransInput2Row,
  type AxtransParseResult,
  type AxtransRow,
  type AxtransWorkbook,
} from "./types";

/**
 * Parse Axtrans Input 1 — first sheet with required headers.
 */
export async function parseAxtransFile(
  file: File
): Promise<AxtransParseResult> {
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
): AxtransParseResult {
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
        details: [...AXTRANS_INPUT1_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Projektnummer") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Projektnummer") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = AXTRANS_INPUT1_REQUIRED_HEADERS.filter(
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
    datum: findColumnIndex(headerMap, "Orderdatum")!,
    ordernr: findColumnIndex(headerMap, "Projektnummer")!,
    frs: findColumnIndex(headerMap, "Fraktsedel")!,
    lastort: findColumnIndex(headerMap, "Avsändarort")!,
    mottagare: findColumnIndex(headerMap, "Mottagare")!,
    lossort: findColumnIndex(headerMap, "Tillort")!,
    pris: findColumnIndex(headerMap, "Pris utan DMT")!,
    kolli: findColumnIndex(headerMap, "Kolli")!,
    vikt: findColumnIndex(headerMap, "Vikt")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: AxtransRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const pris = parseNumericValue(row[col.pris]);
    const kolli = parseNumericValue(row[col.kolli]);
    const vikt = parseNumericValue(row[col.vikt]);
    const datum = formatDate(formatted[col.datum] ?? row[col.datum]);
    const ordernr = formatIdentifier(
      formatted[col.ordernr] ?? row[col.ordernr]
    );
    const frs = formatIdentifier(formatted[col.frs] ?? row[col.frs]);

    if (!datum && !ordernr && !frs && pris === null) continue;

    rowId += 1;
    result.push({
      id: `ax-${rowId}`,
      datum,
      ordernr,
      frs,
      kund: "",
      lastort: formatIdentifier(formatted[col.lastort] ?? row[col.lastort]),
      mottagare: formatIdentifier(
        formatted[col.mottagare] ?? row[col.mottagare]
      ),
      lossort: formatIdentifier(formatted[col.lossort] ?? row[col.lossort]),
      pris,
      prisFormatted: pris === null ? "—" : formatSwedishCurrency(pris),
      kolli,
      kolliFormatted: kolli === null ? "—" : formatSwedishNumber(kolli),
      vikt,
      viktFormatted: vikt === null ? "—" : formatSwedishDecimal2(vikt),
      ...buildT5AndDifferens(null, pris),
    });
  }

  const sortedRows = sortRows(result);

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
 * Parse Input 2 — Ordernr, Mott Namn, and Resurs 1–3 with costs for T5 lookup.
 */
export async function parseAxtransInput2File(
  file: File
): Promise<AxtransInput2ParseResult> {
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
): AxtransInput2ParseResult {
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
        details: [...AXTRANS_INPUT2_REQUIRED_HEADERS],
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

  const missing = AXTRANS_INPUT2_REQUIRED_HEADERS.filter(
    (header) => findColumnIndex(headerMap, header) === undefined
  );

  if (missing.length > 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Obligatoriska kolumner saknas i Input 2 ("${fileName}").`,
        details: missing.map((h) => `"${h}"`),
      },
    };
  }

  const col = {
    ordernr: findColumnIndex(headerMap, "Ordernr")!,
    mottNamn: findColumnIndex(headerMap, "Mott Namn")!,
    betalare: findColumnIndex(headerMap, "Betalare")!,
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

  const result: AxtransInput2Row[] = [];

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
      mottNamn: formatIdentifier(
        formatted[col.mottNamn] ?? row[col.mottNamn]
      ),
      betalare: formatIdentifier(
        formatted[col.betalare] ?? row[col.betalare]
      ),
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

export function buildT5AndDifferens(
  t5: number | null,
  pris: number | null
): Pick<
  AxtransRow,
  "t5" | "t5Formatted" | "differens" | "differensFormatted"
> {
  const differens =
    t5 === null || pris === null ? null : roundCurrency2(t5 - pris);

  return {
    t5,
    t5Formatted: t5 === null ? "—" : formatSwedishCurrency(t5),
    differens,
    differensFormatted:
      differens === null ? "—" : formatSwedishCurrency(differens),
  };
}

/**
 * Match Input 1 Ordernr against Input 2: fill Kund from Betalare,
 * Mottagare from Mott Namn when present, and T5 from the Resurs kostn
 * whose Resurs cell contains 3068. Matched blank cost → T5 = 0.
 */
export function applyAxtransInput2ToWorkbook(
  workbook: AxtransWorkbook,
  input2Rows: AxtransInput2Row[],
  input2FileName: string
): AxtransWorkbook {
  const lookup = new Map<string, AxtransInput2Row>();
  for (const row of input2Rows) {
    const key = normalizeOrdernrKey(row.ordernr);
    if (!key || lookup.has(key)) continue;
    lookup.set(key, row);
  }

  let t5MatchCount = 0;
  const rows = workbook.rows.map((row) => {
    const match = lookup.get(normalizeOrdernrKey(row.ordernr));
    if (!match) {
      return {
        ...row,
        kund: "",
        ...buildT5AndDifferens(null, row.pris),
      };
    }

    t5MatchCount += 1;
    return {
      ...row,
      kund: match.betalare,
      mottagare: match.mottNamn.trim() ? match.mottNamn : row.mottagare,
      ...buildT5AndDifferens(resolveT5FromInput2Row(match), row.pris),
    };
  });

  return {
    ...workbook,
    rows: sortRows(rows),
    input2FileName,
    t5MatchCount,
  };
}

function resolveT5FromInput2Row(row: AxtransInput2Row): number {
  const pairs = [
    { resurs: row.resurs1, kostn: row.resurs1Kostn },
    { resurs: row.resurs2, kostn: row.resurs2Kostn },
    { resurs: row.resurs3, kostn: row.resurs3Kostn },
  ];

  for (const pair of pairs) {
    if (cellMatchesResourceCode(pair.resurs, AXTRANS_T5_RESOURCE_CODE)) {
      return pair.kostn ?? 0;
    }
  }

  return 0;
}

function sortRows(rows: AxtransRow[]): AxtransRow[] {
  return [...rows].sort((a, b) => {
    const byDate = compareSortText(a.datum, b.datum);
    if (byDate !== 0) return byDate;
    const byLossort = compareSortText(a.lossort, b.lossort);
    if (byLossort !== 0) return byLossort;
    return compareSortText(a.ordernr, b.ordernr);
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

function normalizeOrdernrKey(value: string): string {
  return value.trim().toLowerCase();
}
