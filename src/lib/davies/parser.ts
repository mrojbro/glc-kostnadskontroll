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
  DAVIES_OK_ORDERSTATUSES,
  DAVIES_REQUIRED_HEADERS,
  type DaviesParseResult,
  type DaviesRow,
} from "./types";

const INTÄKTER_ALIASES = ["Intäkter", "Intäker", "Intakter"] as const;
const FRAKTSEDEL_ALIASES = [
  "Fraktsedelnummer",
  "Fraktsedelsnummer",
] as const;

/** Keep these Mott namn as-is; everything else → Boxmover c/o Dale Davies. */
const MOTT_NAMN_KEEP_AS_IS = [
  "GLC TERMINAL",
  "KÅKÅ Staffanstorp",
  "Kåkå Staffanstorp",
  "Martin & Servera Enköping",
  "Martin & Servera Holm",
  "Martin & Servera Norrköping",
  "Palcon c/o Kåkå",
  "Pågens AB",
  "Björk & Magnusson i Helsingborg",
  "Björk & Magnusson i Helsingborg AB",
  "CHOPCHOP VARBERG",
] as const;

const BOXMOVER_MOTT_NAMN = "Boxmover c/o Dale Davies";
const BOXMOVER_MOTT_ORT = "Staffanstorp";

/**
 * Parse 3054 Davies workbook — first sheet with the required headers.
 */
export async function parseDaviesFile(file: File): Promise<DaviesParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    for (const sheetName of workbook.SheetNames) {
      const parsed = tryParseSheet(workbook.Sheets[sheetName], sheetName);
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
): DaviesParseResult {
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
        details: [...DAVIES_REQUIRED_HEADERS],
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
        details: [...DAVIES_REQUIRED_HEADERS],
      },
    };
  }

  const intakterCol = findColumnIndexWithAliases(headerMap, INTÄKTER_ALIASES);
  const fraktsedelCol = findColumnIndexWithAliases(
    headerMap,
    FRAKTSEDEL_ALIASES
  );

  const missing = DAVIES_REQUIRED_HEADERS.filter((header) => {
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

  const result: DaviesRow[] = [];
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
    const resurs = sumDaviesResursKostnad(row, col);
    const { mottNamn, mottOrt } = resolveMottagare(
      formatIdentifier(row[col.mottNamn]),
      formatIdentifier(row[col.mottOrt])
    );
    const gods = formatIdentifier(row[col.gods]);

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
    result.push({
      id: `davies-${rowId}`,
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
      mottOrt,
      gods,
    });
  }

  const totalIntakter = result.reduce((sum, row) => sum + row.intakter, 0);

  return {
    success: true,
    data: {
      sheetName,
      rows: result,
      rowCount: result.length,
      totalIntakter,
      totalIntakterFormatted: formatSwedishCurrency(totalIntakter),
    },
  };
}

function sumDaviesResursKostnad(
  row: (string | number | boolean | Date | null)[],
  col: {
    resurs1: number;
    resurs1Kostn: number;
    resurs2: number;
    resurs2Kostn: number;
    resurs3: number;
    resurs3Kostn: number;
  }
): number {
  let total = 0;
  const pairs = [
    [col.resurs1, col.resurs1Kostn],
    [col.resurs2, col.resurs2Kostn],
    [col.resurs3, col.resurs3Kostn],
  ] as const;

  for (const [resursCol, kostnCol] of pairs) {
    if (containsDaviesCode(row[resursCol])) {
      total += parseNumericValue(row[kostnCol]) ?? 0;
    }
  }

  return total;
}

function containsDaviesCode(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return value === 3054;
  return String(value).includes("3054");
}

function resolveMottagare(
  mottNamn: string,
  mottOrt: string
): { mottNamn: string; mottOrt: string } {
  if (shouldKeepMottNamn(mottNamn)) {
    return { mottNamn, mottOrt };
  }
  return { mottNamn: BOXMOVER_MOTT_NAMN, mottOrt: BOXMOVER_MOTT_ORT };
}

function shouldKeepMottNamn(mottNamn: string): boolean {
  const normalized = normalizeHeader(mottNamn);
  if (!normalized) return false;
  return MOTT_NAMN_KEEP_AS_IS.some((allowed) =>
    normalized.includes(normalizeHeader(allowed))
  );
}

function isOkOrderstatus(value: string): boolean {
  const normalized = normalizeHeader(value);
  return DAVIES_OK_ORDERSTATUSES.some(
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
