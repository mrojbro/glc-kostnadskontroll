import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
  parseNumericValue,
} from "@/lib/formatters";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  isEmptyRow,
  normalizeHeader,
} from "@/lib/validation";
import {
  NARKEFRAKT_OK_ORDERSTATUSES,
  NARKEFRAKT_REQUIRED_HEADERS,
  NARKEFRAKT_SOURCES,
  type NarkefraktParseResult,
  type NarkefraktRow,
  type NarkefraktSourceId,
  type NarkefraktWorkbook,
} from "./types";
import { match3029MottFromLittera, matchAllowedMottPair } from "./mottLookup";

const INTÄKTER_ALIASES = ["Intäkter", "Intäker", "Intakter"] as const;
const FRAKTSEDEL_ALIASES = [
  "Fraktsedelnummer",
  "Fraktsedelsnummer",
] as const;

/**
 * Parse 3028 Närkefrakt workbook for one source — first sheet with required headers.
 * Source A and B currently share the same layout; swap in source-specific logic later.
 */
export async function parseNarkefraktFile(
  file: File,
  sourceId: NarkefraktSourceId
): Promise<NarkefraktParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    for (const sheetName of workbook.SheetNames) {
      const parsed = tryParseSheet(
        workbook.Sheets[sheetName],
        sheetName,
        sourceId
      );
      if (parsed.success) return parsed;
      if (parsed.error.type === "missing_columns") continue;
    }

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

    return tryParseSheet(
      workbook.Sheets[firstSheetName],
      firstSheetName,
      sourceId
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

/** 3028 — hook for source-specific rules later. */
export function parseNarkefraktSourceA(file: File) {
  return parseNarkefraktFile(file, "source-a");
}

/** 3029 — hook for source-specific rules later. */
export function parseNarkefraktSourceB(file: File) {
  return parseNarkefraktFile(file, "source-b");
}

/**
 * Require both sources, parse each, and merge into one workbook for review/export.
 */
export async function parseNarkefraktBothSources(
  fileA: File | null,
  fileB: File | null
): Promise<NarkefraktParseResult> {
  const labelA = NARKEFRAKT_SOURCES["source-a"].label;
  const labelB = NARKEFRAKT_SOURCES["source-b"].label;

  if (!fileA || !fileB) {
    return {
      success: false,
      error: {
        type: "missing_sources",
        message:
          "Båda källorna måste laddas upp innan du kan fortsätta.",
        details: [
          !fileA ? `${labelA} saknas` : null,
          !fileB ? `${labelB} saknas` : null,
        ].filter(Boolean) as string[],
      },
    };
  }

  const [resultA, resultB] = await Promise.all([
    parseNarkefraktSourceA(fileA),
    parseNarkefraktSourceB(fileB),
  ]);

  if (!resultA.success) {
    return {
      success: false,
      error: {
        ...resultA.error,
        message: `${labelA}: ${resultA.error.message}`,
      },
    };
  }

  if (!resultB.success) {
    return {
      success: false,
      error: {
        ...resultB.error,
        message: `${labelB}: ${resultB.error.message}`,
      },
    };
  }

  return {
    success: true,
    data: mergeNarkefraktWorkbooks(
      resultA.data,
      resultB.data,
      fileA.name,
      fileB.name
    ),
  };
}

export function mergeNarkefraktWorkbooks(
  sourceA: NarkefraktWorkbook,
  sourceB: NarkefraktWorkbook,
  fileNameA: string,
  fileNameB: string
): NarkefraktWorkbook {
  const rows = [...sourceA.rows, ...sourceB.rows];
  const totalIntakter = rows.reduce((sum, row) => sum + row.intakter, 0);

  return {
    sheetName: `${NARKEFRAKT_SOURCES["source-a"].label} + ${NARKEFRAKT_SOURCES["source-b"].label}`,
    rows,
    rowCount: rows.length,
    totalIntakter,
    totalIntakterFormatted: formatSwedishCurrency(totalIntakter),
    sources: [
      {
        id: "source-a",
        label: NARKEFRAKT_SOURCES["source-a"].label,
        fileName: fileNameA,
        sheetName: sourceA.sheetName,
        rowCount: sourceA.rowCount,
      },
      {
        id: "source-b",
        label: NARKEFRAKT_SOURCES["source-b"].label,
        fileName: fileNameB,
        sheetName: sourceB.sheetName,
        rowCount: sourceB.rowCount,
      },
    ],
  };
}

function tryParseSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  sourceId: NarkefraktSourceId
): NarkefraktParseResult {
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
        details: [...NARKEFRAKT_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = -1;
  let headerMap = new Map<string, number>();

  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const candidate = buildHeaderIndexMap(rows[i] ?? []);
    if (findColumnIndex(candidate, "Lastdag") !== undefined) {
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
        message: `Hittade ingen rubrikrad med "Lastdag" i arbetsbladet "${sheetName}".`,
        details: [...NARKEFRAKT_REQUIRED_HEADERS],
      },
    };
  }

  const intakterCol = findColumnIndexWithAliases(headerMap, INTÄKTER_ALIASES);
  const fraktsedelCol = findColumnIndexWithAliases(
    headerMap,
    FRAKTSEDEL_ALIASES
  );

  const missing = NARKEFRAKT_REQUIRED_HEADERS.filter((header) => {
    if (header === "Intäkter") return intakterCol === undefined;
    if (header === "Fraktsedelnummer") return fraktsedelCol === undefined;
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
    lastdag: findColumnIndex(headerMap, "Lastdag")!,
    ordernr: findColumnIndex(headerMap, "Ordernr")!,
    betalare: findColumnIndex(headerMap, "Betalare")!,
    littera: findColumnIndex(headerMap, "Littera")!,
    fraktsedel: fraktsedelCol!,
    klarFakturering: findColumnIndex(headerMap, "KlarFakturering")!,
    orderstatus: findColumnIndex(headerMap, "Orderstatus")!,
    intakter: intakterCol!,
    tg: findColumnIndex(headerMap, "TG")!,
    tb: findColumnIndex(headerMap, "TB")!,
    resurs1: findColumnIndex(headerMap, "Resurs 1")!,
    resurs1Kostn: findColumnIndex(headerMap, "Resurs 1 kostn")!,
    resurs2: findColumnIndex(headerMap, "Resurs 2")!,
    resurs2Kostn: findColumnIndex(headerMap, "Resurs 2 kostn")!,
    resurs3: findColumnIndex(headerMap, "Resurs 3")!,
    resurs3Kostn: findColumnIndex(headerMap, "Resurs 3 kostn")!,
    mottNamn: findColumnIndex(headerMap, "Mott namn")!,
    mottOrt: findColumnIndex(headerMap, "Mott Ort")!,
    gods: findColumnIndex(headerMap, "Gods")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const result: NarkefraktRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const formattedRow = formattedRows[i] ?? [];
    const ordernr = pickIdentifier(formattedRow[col.ordernr], row[col.ordernr]);
    const datum = formatDate(row[col.lastdag]);
    const betalare = formatIdentifier(row[col.betalare]);
    const littera = formatIdentifier(row[col.littera]);
    const fraktsedelsnummer = pickIdentifier(
      formattedRow[col.fraktsedel],
      row[col.fraktsedel]
    );
    const klarFakturering = parseChecked(row[col.klarFakturering]);
    const orderstatus = formatIdentifier(row[col.orderstatus]);
    if (/makulerad/i.test(orderstatus)) continue;

    const orderstatusOk = isOkOrderstatus(orderstatus);
    const intakter = parseNumericValue(row[col.intakter]) ?? 0;
    const intakterOk = intakter > 0;
    const tg = parseNumericValue(row[col.tg]);
    const tb = parseNumericValue(row[col.tb]);
    const resurs = sumNarkefraktResursKostnad(row, col, sourceId);
    const rawMottNamn = formatIdentifier(row[col.mottNamn]);
    const mottOrt = formatIdentifier(row[col.mottOrt]);
    const gods = formatIdentifier(row[col.gods]);

    // 3028: Mott Namn + Mott Ort pairs + resurskod 3028
    // 3029: Littera region → Mott Namn + resurskod 3029
    let mottNamn = rawMottNamn;
    let resolvedMottOrt = mottOrt;
    if (sourceId === "source-a") {
      const matched = matchAllowedMottPair(rawMottNamn, mottOrt);
      if (!matched) continue;
      if (
        !rowHasNarkefraktCode(
          row,
          col,
          NARKEFRAKT_SOURCES[sourceId].resourceCode
        )
      ) {
        continue;
      }
      mottNamn = matched.mottNamn;
      resolvedMottOrt = matched.mottOrt;
    } else if (sourceId === "source-b") {
      const matchedNamn = match3029MottFromLittera(littera);
      if (!matchedNamn) continue;
      if (
        !rowHasNarkefraktCode(
          row,
          col,
          NARKEFRAKT_SOURCES[sourceId].resourceCode
        )
      ) {
        continue;
      }
      mottNamn = matchedNamn;
    }

    if (
      !ordernr &&
      !datum &&
      !betalare &&
      !fraktsedelsnummer &&
      !orderstatus &&
      intakter === 0 &&
      resurs === 0
    ) {
      continue;
    }

    rowId += 1;
    const source = NARKEFRAKT_SOURCES[sourceId];
    result.push({
      id: `narkefrakt-${sourceId}-${rowId}`,
      sourceId,
      sourceLabel: source.label,
      datum,
      ordernr,
      betalare,
      littera,
      fraktsedelsnummer,
      klarFakturering,
      klarFaktureringLabel: klarFakturering ? "Ja" : "Nej",
      orderstatus,
      orderstatusOk,
      intakter,
      intakterFormatted: formatSwedishCurrency(intakter),
      intakterOk,
      tg,
      tgFormatted: formatSwedishDecimal2(tg),
      tb,
      tbFormatted: formatSwedishDecimal2(tb),
      resurs,
      resursFormatted: formatSwedishCurrency(resurs),
      mottNamn,
      mottOrt: resolvedMottOrt,
      gods,
    });
  }

  const totalIntakter = result.reduce((sum, row) => sum + row.intakter, 0);
  const source = NARKEFRAKT_SOURCES[sourceId];

  return {
    success: true,
    data: {
      sheetName,
      rows: result,
      rowCount: result.length,
      totalIntakter,
      totalIntakterFormatted: formatSwedishCurrency(totalIntakter),
      sources: [
        {
          id: sourceId,
          label: source.label,
          fileName: "",
          sheetName,
          rowCount: result.length,
        },
      ],
    },
  };
}

function sumNarkefraktResursKostnad(
  row: (string | number | boolean | Date | null)[],
  col: {
    resurs1: number;
    resurs1Kostn: number;
    resurs2: number;
    resurs2Kostn: number;
    resurs3: number;
    resurs3Kostn: number;
  },
  sourceId: NarkefraktSourceId
): number {
  let total = 0;
  const pairs = [
    [col.resurs1, col.resurs1Kostn],
    [col.resurs2, col.resurs2Kostn],
    [col.resurs3, col.resurs3Kostn],
  ] as const;
  const resourceCode = NARKEFRAKT_SOURCES[sourceId].resourceCode;

  for (const [resursCol, kostnCol] of pairs) {
    if (containsNarkefraktCode(row[resursCol], resourceCode)) {
      total += parseNumericValue(row[kostnCol]) ?? 0;
    }
  }

  return total;
}

function rowHasNarkefraktCode(
  row: (string | number | boolean | Date | null)[],
  col: {
    resurs1: number;
    resurs2: number;
    resurs3: number;
  },
  resourceCode: number
): boolean {
  return (
    containsNarkefraktCode(row[col.resurs1], resourceCode) ||
    containsNarkefraktCode(row[col.resurs2], resourceCode) ||
    containsNarkefraktCode(row[col.resurs3], resourceCode)
  );
}

/** Match resurskod like Davies/Boxmover (number, "3028", "3028.0", etc.). */
function containsNarkefraktCode(
  value: unknown,
  resourceCode: number
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") {
    return Number.isFinite(value) && Math.round(value) === resourceCode;
  }
  if (value instanceof Date) return false;

  const text = String(value).trim();
  if (!text) return false;
  if (text.includes(String(resourceCode))) return true;

  const asNum = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(asNum) && Math.round(asNum) === resourceCode;
}

function isOkOrderstatus(value: string): boolean {
  const normalized = normalizeHeader(value);
  return NARKEFRAKT_OK_ORDERSTATUSES.some(
    (status) => normalizeHeader(status) === normalized
  );
}

function parseChecked(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value instanceof Date) return false;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    return [
      "true",
      "1",
      "ja",
      "yes",
      "x",
      "✓",
      "☑",
      "checked",
      "ikrystad",
      "ikryssad",
    ].includes(trimmed);
  }
  return false;
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
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Number.isInteger(raw) ? String(raw) : String(raw);
  }
  if (typeof formatted === "string" && formatted.trim() !== "") {
    const trimmed = formatted.trim();
    if (!/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(trimmed)) {
      return trimmed.replace(/\s+/g, " ").trim();
    }
  }
  return formatIdentifier(raw);
}
