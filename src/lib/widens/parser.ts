import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishCurrency,
  formatSwedishDecimal2,
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
  WIDENS_INPUT1_REQUIRED_HEADERS,
  WIDENS_INPUT2_REQUIRED_HEADERS,
  WIDENS_T5_RESOURCE_CODES,
  type WidensInput2ParseResult,
  type WidensInput2Row,
  type WidensParseResult,
  type WidensRow,
  type WidensWorkbook,
} from "./types";

/**
 * Parse Widens Input 1 — Excel with required headers.
 * Radbelopp is split into Frakt / DMT based on Artikelslag; matching
 * shipment lines are merged so both amounts can appear on one row.
 */
export async function parseWidensFile(file: File): Promise<WidensParseResult> {
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
): WidensParseResult {
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
        details: [...WIDENS_INPUT1_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = 0;
  let headerMap = buildHeaderIndexMap(rows[0] ?? []);

  if (findColumnIndex(headerMap, "Transportdag") === undefined) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const candidate = buildHeaderIndexMap(rows[i] ?? []);
      if (findColumnIndex(candidate, "Transportdag") !== undefined) {
        headerRowIndex = i;
        headerMap = candidate;
        break;
      }
    }
  }

  const missing = WIDENS_INPUT1_REQUIRED_HEADERS.filter((header) => {
    if (header === "Fraktsedelnummer") {
      return (
        findColumnIndex(headerMap, "Fraktsedelnummer") === undefined &&
        findColumnIndex(headerMap, "Fraktsedelsnummer") === undefined
      );
    }
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

  const frsCol =
    findColumnIndex(headerMap, "Fraktsedelnummer") ??
    findColumnIndex(headerMap, "Fraktsedelsnummer");

  const col = {
    transportdag: findColumnIndex(headerMap, "Transportdag")!,
    referens: findColumnIndex(headerMap, "Referens")!,
    frs: frsCol!,
    fran: findColumnIndex(headerMap, "Från (namn)")!,
    till: findColumnIndex(headerMap, "Mottagare (namn)")!,
    postort: findColumnIndex(headerMap, "Mottagare (ort)")!,
    vikt: findColumnIndex(headerMap, "Vikt")!,
    kolli: findColumnIndex(headerMap, "Kolli")!,
    ppl: findColumnIndex(headerMap, "Skrymmeantal")!,
    godsinfo: findColumnIndex(headerMap, "Godsinformation")!,
    artikelslag: findColumnIndex(headerMap, "Artikelslag")!,
    radbelopp: findColumnIndex(headerMap, "Radbelopp")!,
  };

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const merged = new Map<string, WidensRow>();
  let rowId = 0;
  let totalFrakt = 0;
  let totalDmt = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isEmptyRow(row)) continue;

    const formatted = formattedRows[i] ?? [];
    const artikelslagKind = classifyArtikelslag(
      formatted[col.artikelslag] ?? row[col.artikelslag]
    );
    if (!artikelslagKind) continue;

    const amount = parseNumericValue(row[col.radbelopp]);
    const transportdag = formatDate(
      formatted[col.transportdag] ?? row[col.transportdag]
    );
    const ordernr = formatIdentifier(
      formatted[col.referens] ?? row[col.referens]
    );
    const frs = formatIdentifier(formatted[col.frs] ?? row[col.frs]);
    const fran = formatIdentifier(formatted[col.fran] ?? row[col.fran]);
    const till = formatIdentifier(formatted[col.till] ?? row[col.till]);
    const postort = formatIdentifier(
      formatted[col.postort] ?? row[col.postort]
    );
    const godsinfo = formatIdentifier(
      formatted[col.godsinfo] ?? row[col.godsinfo]
    );
    const vikt = parseNumericValue(row[col.vikt]);
    const kolli = parseNumericValue(row[col.kolli]);
    const ppl = parseNumericValue(row[col.ppl]);

    const mergeKey = [
      transportdag,
      ordernr,
      frs,
      fran,
      till,
      postort,
    ]
      .map((part) => part.trim().toLowerCase())
      .join("|");

    let existing = merged.get(mergeKey);
    if (!existing) {
      rowId += 1;
      existing = {
        id: `widens-${rowId}`,
        transportdag,
        ordernr,
        frs,
        fran,
        till,
        postort,
        vikt,
        viktFormatted: vikt === null ? "—" : formatSwedishDecimal2(vikt),
        kolli,
        kolliFormatted: kolli === null ? "—" : formatSwedishDecimal2(kolli),
        ppl,
        pplFormatted: ppl === null ? "—" : formatSwedishDecimal2(ppl),
        godsinfo,
        frakt: null,
        fraktFormatted: "—",
        dmt: null,
        dmtFormatted: "—",
        summa: null,
        summaFormatted: "—",
        ...buildT5AndDifferens(null, null),
      };
      merged.set(mergeKey, existing);
    } else {
      // Prefer first non-empty values for shared fields.
      if (!existing.godsinfo && godsinfo) existing.godsinfo = godsinfo;
      if (existing.vikt === null && vikt !== null) {
        existing.vikt = vikt;
        existing.viktFormatted = formatSwedishDecimal2(vikt);
      }
      if (existing.kolli === null && kolli !== null) {
        existing.kolli = kolli;
        existing.kolliFormatted = formatSwedishDecimal2(kolli);
      }
      if (existing.ppl === null && ppl !== null) {
        existing.ppl = ppl;
        existing.pplFormatted = formatSwedishDecimal2(ppl);
      }
    }

    if (artikelslagKind === "frakt" && amount !== null) {
      existing.frakt = (existing.frakt ?? 0) + amount;
      existing.fraktFormatted = formatSwedishCurrency(existing.frakt);
      totalFrakt += amount;
    }

    if (artikelslagKind === "dmt" && amount !== null) {
      existing.dmt = (existing.dmt ?? 0) + amount;
      existing.dmtFormatted = formatSwedishCurrency(existing.dmt);
      totalDmt += amount;
    }

    applySumma(existing);
  }

  const result = sortWidensRows(Array.from(merged.values()));
  const totalSumma = totalFrakt + totalDmt;

  return {
    success: true,
    data: {
      sheetName,
      fileName,
      rows: result,
      rowCount: result.length,
      totalFrakt,
      totalFraktFormatted: formatSwedishCurrency(totalFrakt),
      totalDmt,
      totalDmtFormatted: formatSwedishCurrency(totalDmt),
      totalSumma,
      totalSummaFormatted: formatSwedishCurrency(totalSumma),
    },
  };
}

function applySumma(row: WidensRow): void {
  if (row.frakt === null && row.dmt === null) {
    row.summa = null;
    row.summaFormatted = "—";
  } else {
    row.summa = (row.frakt ?? 0) + (row.dmt ?? 0);
    row.summaFormatted = formatSwedishCurrency(row.summa);
  }
  Object.assign(row, buildT5AndDifferens(row.t5, row.summa));
}

/**
 * Parse Widens Input 2 — Ordernr + Resurs 1–3 with costs for T5 (3012/3044).
 */
export async function parseWidensInput2File(
  file: File
): Promise<WidensInput2ParseResult> {
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
): WidensInput2ParseResult {
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
        details: [...WIDENS_INPUT2_REQUIRED_HEADERS],
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

  const missing = WIDENS_INPUT2_REQUIRED_HEADERS.filter(
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

  const result: WidensInput2Row[] = [];

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
  return WIDENS_T5_RESOURCE_CODES.some((code) =>
    cellMatchesResourceCode(value, code)
  );
}

function resolveT5FromInput2Row(row: WidensInput2Row): number {
  const pairs: Array<{ resurs: string; kostn: number | null }> = [
    { resurs: row.resurs1, kostn: row.resurs1Kostn },
    { resurs: row.resurs2, kostn: row.resurs2Kostn },
    { resurs: row.resurs3, kostn: row.resurs3Kostn },
  ];

  for (const pair of pairs) {
    if (isT5ResourceCode(pair.resurs)) {
      // Matched 3012/3044 — blank cost becomes 0
      return pair.kostn ?? 0;
    }
  }

  // Ordernr matched in Input 2, but no 3012/3044 → 0
  return 0;
}

export function buildT5AndDifferens(
  t5: number | null,
  summa: number | null
): Pick<
  WidensRow,
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
 * Match Input 1 Ordernr against Input 2 and fill T5 from Resurs kostn
 * when Resurs 1–3 contains 3012 or 3044.
 */
export function applyWidensInput2ToWorkbook(
  workbook: WidensWorkbook,
  input2Rows: WidensInput2Row[],
  input2FileName: string
): WidensWorkbook {
  const lookup = new Map<string, WidensInput2Row>();
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
    rows: sortWidensRows(rows),
    input2FileName,
    t5MatchCount,
  };
}

function classifyArtikelslag(value: unknown): "frakt" | "dmt" | null {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/å/g, "a");

  if (!text) return null;
  if (text.includes("drivmedel")) return "dmt";
  if (text.includes("frakt")) return "frakt";
  return null;
}

/** Default order: Transportdag → Postort → Mottagare */
function sortWidensRows(rows: WidensRow[]): WidensRow[] {
  return [...rows].sort((a, b) => {
    const byDate = compareSortText(a.transportdag, b.transportdag);
    if (byDate !== 0) return byDate;
    const byPostort = compareSortText(a.postort, b.postort);
    if (byPostort !== 0) return byPostort;
    return compareSortText(a.till, b.till);
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
