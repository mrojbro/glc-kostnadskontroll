import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
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
  NARKEFRAKT_PORTAL_INPUT1_REQUIRED_HEADERS,
  NARKEFRAKT_PORTAL_INPUT2_REQUIRED_HEADERS,
  NARKEFRAKT_PORTAL_T5_RESOURCE_CODE,
  type NarkefraktPortalInput2ParseResult,
  type NarkefraktPortalInput2Row,
  type NarkefraktPortalParseResult,
  type NarkefraktPortalRow,
  type NarkefraktPortalWorkbook,
} from "./types";

/**
 * Parse Närkefrakt Input 1.
 * Line items with Debetradsbenämning Godstransport / Drivmedelstillägg are
 * merged per shipment so Pris + DMT land on one row.
 */
export async function parseNarkefraktPortalFile(
  file: File
): Promise<NarkefraktPortalParseResult> {
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
): NarkefraktPortalParseResult {
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
        details: [...NARKEFRAKT_PORTAL_INPUT1_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Sedelnummer") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Sedelnummer") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const kundtotalCol = findKundtotalColumn(headerMap);

  const missing = NARKEFRAKT_PORTAL_INPUT1_REQUIRED_HEADERS.filter((header) => {
    if (header === "Kundtotal(D)") return kundtotalCol === undefined;
    return findColumnIndex(headerMap, header) === undefined;
  });

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
    datum: findColumnIndex(headerMap, "Planerad starttid")!,
    frs: findColumnIndex(headerMap, "Sedelnummer")!,
    ordernr: findColumnIndex(headerMap, "Märkning")!,
    lastort: findColumnIndex(headerMap, "Angöring postort - första")!,
    lossort: findColumnIndex(headerMap, "Angöring postort - sista")!,
    debet: findColumnIndex(headerMap, "Debetradsbenämning")!,
    kundtotal: kundtotalCol!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const merged = new Map<string, NarkefraktPortalRow>();
  let rowId = 0;
  let totalPris = 0;
  let totalDmt = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const kind = classifyDebetrad(
      formatted[col.debet] ?? row[col.debet]
    );
    if (!kind) continue;

    const amount = parseNumericValue(row[col.kundtotal]);
    const datum = formatDate(formatted[col.datum] ?? row[col.datum]);
    const frs = formatIdentifier(formatted[col.frs] ?? row[col.frs]);
    const ordernr = formatIdentifier(
      formatted[col.ordernr] ?? row[col.ordernr]
    );
    const lastort = formatIdentifier(
      formatted[col.lastort] ?? row[col.lastort]
    );
    const lossort = formatIdentifier(
      formatted[col.lossort] ?? row[col.lossort]
    );

    if (!frs && !ordernr && !datum && amount === null) continue;

    const mergeKey = [datum, frs, ordernr, lastort, lossort]
      .map((part) => part.trim().toLowerCase())
      .join("|");

    let existing = merged.get(mergeKey);
    if (!existing) {
      rowId += 1;
      existing = {
        id: `nf-${rowId}`,
        datum,
        frs,
        ordernr,
        lastort,
        betalare: "",
        mottagare: "",
        lossort,
        pris: null,
        prisFormatted: "—",
        dmt: null,
        dmtFormatted: "—",
        summa: null,
        summaFormatted: "—",
        ...buildT5AndDifferens(null, null),
      };
      merged.set(mergeKey, existing);
    }

    if (kind === "pris" && amount !== null) {
      existing.pris = (existing.pris ?? 0) + amount;
      existing.prisFormatted = formatSwedishCurrency(existing.pris);
      totalPris += amount;
    }

    if (kind === "dmt" && amount !== null) {
      existing.dmt = (existing.dmt ?? 0) + amount;
      existing.dmtFormatted = formatSwedishCurrency(existing.dmt);
      totalDmt += amount;
    }

    applySumma(existing);
  }

  const result = sortRows(Array.from(merged.values()));
  const totalSumma = totalPris + totalDmt;

  return {
    success: true,
    data: {
      sheetName,
      fileName,
      rows: result,
      rowCount: result.length,
      totalPris,
      totalPrisFormatted: formatSwedishCurrency(totalPris),
      totalDmt,
      totalDmtFormatted: formatSwedishCurrency(totalDmt),
      totalSumma,
      totalSummaFormatted: formatSwedishCurrency(totalSumma),
    },
  };
}

/**
 * Parse Input 2 — Ordernr, Mott Namn, and Resurs 1–3 with costs for T5 lookup.
 */
export async function parseNarkefraktPortalInput2File(
  file: File
): Promise<NarkefraktPortalInput2ParseResult> {
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
): NarkefraktPortalInput2ParseResult {
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
        details: [...NARKEFRAKT_PORTAL_INPUT2_REQUIRED_HEADERS],
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

  const missing = NARKEFRAKT_PORTAL_INPUT2_REQUIRED_HEADERS.filter(
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

  const result: NarkefraktPortalInput2Row[] = [];

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
  summa: number | null
): Pick<
  NarkefraktPortalRow,
  "t5" | "t5Formatted" | "differens" | "differensFormatted"
> {
  const differens =
    t5 === null || summa === null ? null : roundCurrency2(t5 - summa);

  return {
    t5,
    t5Formatted: t5 === null ? "—" : formatSwedishCurrency(t5),
    differens,
    differensFormatted:
      differens === null ? "—" : formatSwedishCurrency(differens),
  };
}

/**
 * Match Input 1 Ordernr against Input 2: fill Mottagare from Mott Namn,
 * Betalare from Betalare, and T5 from the Resurs kostn whose Resurs
 * cell contains 3028. Matched blank cost → T5 = 0.
 */
export function applyNarkefraktPortalInput2ToWorkbook(
  workbook: NarkefraktPortalWorkbook,
  input2Rows: NarkefraktPortalInput2Row[],
  input2FileName: string
): NarkefraktPortalWorkbook {
  const lookup = new Map<string, NarkefraktPortalInput2Row>();
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
        mottagare: "",
        betalare: "",
        ...buildT5AndDifferens(null, row.summa),
      };
    }

    t5MatchCount += 1;
    return {
      ...row,
      mottagare: match.mottNamn,
      betalare: match.betalare,
      ...buildT5AndDifferens(resolveT5FromInput2Row(match), row.summa),
    };
  });

  return {
    ...workbook,
    rows: sortRows(rows),
    input2FileName,
    t5MatchCount,
  };
}

function resolveT5FromInput2Row(row: NarkefraktPortalInput2Row): number {
  const pairs = [
    { resurs: row.resurs1, kostn: row.resurs1Kostn },
    { resurs: row.resurs2, kostn: row.resurs2Kostn },
    { resurs: row.resurs3, kostn: row.resurs3Kostn },
  ];

  for (const pair of pairs) {
    if (cellMatchesResourceCode(pair.resurs, NARKEFRAKT_PORTAL_T5_RESOURCE_CODE)) {
      return pair.kostn ?? 0;
    }
  }

  // Ordernr matched in Input 2, but no 3028 → 0
  return 0;
}

function applySumma(row: NarkefraktPortalRow): void {
  if (row.pris === null && row.dmt === null) {
    row.summa = null;
    row.summaFormatted = "—";
  } else {
    row.summa = roundCurrency2((row.pris ?? 0) + (row.dmt ?? 0));
    row.summaFormatted = formatSwedishCurrency(row.summa);
  }
  Object.assign(row, buildT5AndDifferens(row.t5, row.summa));
}

function classifyDebetrad(value: unknown): "pris" | "dmt" | null {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (!text) return null;
  if (text.includes("drivmedel")) return "dmt";
  if (text.includes("godstransport")) return "pris";
  return null;
}

function findKundtotalColumn(
  headerMap: Map<string, number>
): number | undefined {
  return (
    findColumnIndex(headerMap, "Kundtotal(D)") ??
    findColumnIndex(headerMap, "Kundtotal (D)") ??
    findColumnIndex(headerMap, "Kundtotal")
  );
}

function sortRows(rows: NarkefraktPortalRow[]): NarkefraktPortalRow[] {
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
