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
  KOF_INPUT1_REQUIRED_HEADERS,
  KOF_INPUT2_REQUIRED_HEADERS,
  KOF_T5_RESOURCE_CODES,
  type KofInput2ParseResult,
  type KofInput2Row,
  type KofParseResult,
  type KofRow,
  type KofWorkbook,
} from "./types";

/**
 * Parse KOF Input 1 — CSV (or Excel) with required headers.
 */
export async function parseKofFile(file: File): Promise<KofParseResult> {
  try {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");

    let workbook: XLSX.WorkBook;
    if (isCsv) {
      const text = await file.text();
      workbook = XLSX.read(text, {
        type: "string",
        cellDates: true,
        raw: false,
      });
    } else {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        cellNF: true,
        cellText: true,
      });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        error: {
          type: "missing_sheet",
          message: "Filen innehåller inga arbetsblad/data.",
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
        message: `Kunde inte läsa filen: ${message}`,
      },
    };
  }
}

function tryParseInput1Sheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  fileName: string
): KofParseResult {
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
        message: `Filen "${fileName}" saknar rubrikrad och data.`,
        details: [...KOF_INPUT1_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Avsdatum") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Avsdatum") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = KOF_INPUT1_REQUIRED_HEADERS.filter(
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
    avsdatum: findColumnIndex(headerMap, "Avsdatum")!,
    franOrt: findColumnIndex(headerMap, "Från_ort")!,
    till: findColumnIndex(headerMap, "Till")!,
    ref: findColumnIndex(headerMap, "Ref")!,
    kg: findColumnIndex(headerMap, "kg")!,
    pall: findColumnIndex(headerMap, "Pall")!,
    pris: findColumnIndex(headerMap, "totalprisutl")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: KofRow[] = [];
  let rowId = 0;
  let totalPris = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const kg = parseNumericValue(row[col.kg]);
    const pall = parseNumericValue(row[col.pall]);
    const pris = parseNumericValue(row[col.pris]);
    if (pris !== null) totalPris += pris;

    const { frs, ordernr } = splitKofRef(formatted[col.ref] ?? row[col.ref]);

    rowId += 1;
    result.push({
      id: `kof-${rowId}`,
      // Prefer raw Avsdatum: values like 901 mean month 9 / day 01 (not Excel serial).
      datum: formatKofAvsdatum(row[col.avsdatum] ?? formatted[col.avsdatum]),
      fran: formatIdentifier(formatted[col.franOrt] ?? row[col.franOrt]),
      mottagare: formatIdentifier(formatted[col.till] ?? row[col.till]),
      frs,
      ordernr,
      kg,
      kgFormatted: kg === null ? "—" : formatSwedishDecimal2(kg),
      pall,
      pallFormatted: pall === null ? "—" : formatSwedishNumber(pall),
      pris,
      prisFormatted: pris === null ? "—" : formatSwedishCurrency(pris),
      ...buildT5AndDifferens(null, pris),
    });
  }

  const sortedRows = sortKofRows(result);

  return {
    success: true,
    data: {
      sheetName,
      fileName,
      rows: sortedRows,
      rowCount: sortedRows.length,
      totalPris,
      totalPrisFormatted: formatSwedishCurrency(totalPris),
    },
  };
}

/**
 * Parse KOF Input 2 — Ordernr + Resurs 1–3 with costs for T5 lookup (3006).
 */
export async function parseKofInput2File(
  file: File
): Promise<KofInput2ParseResult> {
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
): KofInput2ParseResult {
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
        details: [...KOF_INPUT2_REQUIRED_HEADERS],
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

  const missing = KOF_INPUT2_REQUIRED_HEADERS.filter(
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

  const result: KofInput2Row[] = [];

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

function isT5ResourceCode(value: unknown): boolean {
  return KOF_T5_RESOURCE_CODES.some((code) =>
    cellMatchesResourceCode(value, code)
  );
}

function resolveT5FromInput2Row(row: KofInput2Row): number {
  const pairs: Array<{ resurs: string; kostn: number | null }> = [
    { resurs: row.resurs1, kostn: row.resurs1Kostn },
    { resurs: row.resurs2, kostn: row.resurs2Kostn },
    { resurs: row.resurs3, kostn: row.resurs3Kostn },
  ];

  for (const pair of pairs) {
    if (isT5ResourceCode(pair.resurs)) {
      // Matched 3006 — blank cost becomes 0
      return pair.kostn ?? 0;
    }
  }

  // Ordernr matched in Input 2, but no 3006 (or blank resurs) → 0
  return 0;
}

export function buildT5AndDifferens(
  t5: number | null,
  pris: number | null
): Pick<KofRow, "t5" | "t5Formatted" | "differens" | "differensFormatted"> {
  const differens = t5 === null || pris === null ? null : roundCurrency2(t5 - pris);

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
 * when Resurs 1–3 contains 3006. Matched orders with blank cost get T5 = 0.
 */
export function applyKofInput2ToWorkbook(
  workbook: KofWorkbook,
  input2Rows: KofInput2Row[],
  input2FileName: string
): KofWorkbook {
  const lookup = new Map<string, KofInput2Row>();
  for (const row of input2Rows) {
    const key = normalizeOrdernrKey(row.ordernr);
    if (!key || lookup.has(key)) continue;
    lookup.set(key, row);
  }

  let t5MatchCount = 0;
  const rows = workbook.rows.map((row) => {
    const match = lookup.get(normalizeOrdernrKey(row.ordernr));
    if (!match) {
      return { ...row, ...buildT5AndDifferens(null, row.pris) };
    }

    const t5 = resolveT5FromInput2Row(match);
    t5MatchCount += 1;

    return {
      ...row,
      ...buildT5AndDifferens(t5, row.pris),
    };
  });

  return {
    ...workbook,
    rows: sortKofRows(rows),
    input2FileName,
    t5MatchCount,
  };
}

/** Split Ref "FRS / Ordernr" (or "FRS/Ordernr") into display columns. */
function splitKofRef(value: unknown): { frs: string; ordernr: string } {
  const raw = formatIdentifier(value);
  if (!raw) {
    return { frs: "", ordernr: "" };
  }

  const parts = raw.split("/");
  if (parts.length < 2) {
    return { frs: raw, ordernr: "" };
  }

  const frs = parts[0]?.trim() ?? "";
  const ordernr = parts.slice(1).join("/").trim();
  return {
    frs: formatIdentifier(frs),
    ordernr: formatIdentifier(ordernr),
  };
}

/**
 * KOF Avsdatum is often encoded as MDD / MMDD without year, e.g. 901 → Sep 1.
 * Year defaults to the current calendar year.
 */
function formatKofAvsdatum(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const digits = String(value)
    .trim()
    .replace(/\.0+$/, "")
    .replace(/\D/g, "");

  if (digits.length >= 3 && digits.length <= 4) {
    const day = Number(digits.slice(-2));
    const month = Number(digits.slice(0, -2));
    if (
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const year = new Date().getFullYear();
      const candidate = new Date(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`
      );
      if (
        !Number.isNaN(candidate.getTime()) &&
        candidate.getFullYear() === year &&
        candidate.getMonth() + 1 === month &&
        candidate.getDate() === day
      ) {
        return toIsoDateParts(year, month, day);
      }
    }
  }

  return formatDate(value);
}

function toIsoDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Default order: Datum → Mottagare → Från */
function sortKofRows(rows: KofRow[]): KofRow[] {
  return [...rows].sort((a, b) => {
    const byDate = compareSortText(a.datum, b.datum);
    if (byDate !== 0) return byDate;
    const byMottagare = compareSortText(a.mottagare, b.mottagare);
    if (byMottagare !== 0) return byMottagare;
    return compareSortText(a.fran, b.fran);
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
