import * as XLSX from "xlsx";
import {
  formatDate,
  formatIdentifier,
  formatSwedishDecimal2,
  parseNumericValue,
} from "@/lib/formatters";
import {
  buildHeaderIndexMap,
  findColumnIndex,
  isEmptyRow,
} from "@/lib/validation";
import {
  BR_HANSSONS_REQUIRED_HEADERS,
  BR_HANSSONS_SOURCES,
  type BrHanssonsCompareParseResult,
  type BrHanssonsCompareResult,
  type BrHanssonsCompareRow,
  type BrHanssonsParseError,
  type BrHanssonsParseResult,
  type BrHanssonsRow,
  type BrHanssonsSourceId,
  type BrHanssonsWorkbook,
} from "./types";

/**
 * Parse one Br Hanssons sendingar sheet.
 */
export async function parseBrHanssonsFile(
  file: File,
  sourceId: BrHanssonsSourceId
): Promise<BrHanssonsParseResult> {
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

    return tryParseSheet(
      workbook.Sheets[firstSheetName],
      firstSheetName,
      sourceId,
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

export async function compareBrHanssonsFiles(
  file15: File | null,
  file21: File | null
): Promise<BrHanssonsCompareParseResult> {
  const label15 = BR_HANSSONS_SOURCES.kl15.label;
  const label21 = BR_HANSSONS_SOURCES.kl21.label;

  if (!file15 || !file21) {
    return {
      success: false,
      error: {
        type: "missing_sources",
        message: "Båda filerna måste laddas upp innan du kan fortsätta.",
        details: [
          !file15 ? `${label15} saknas` : null,
          !file21 ? `${label21} saknas` : null,
        ].filter(Boolean) as string[],
      },
    };
  }

  const nameCheck15 = validateBrHanssonsFileName(file15.name, "kl15");
  if (nameCheck15) {
    return { success: false, error: nameCheck15 };
  }

  const nameCheck21 = validateBrHanssonsFileName(file21.name, "kl21");
  if (nameCheck21) {
    return { success: false, error: nameCheck21 };
  }

  const [result15, result21] = await Promise.all([
    parseBrHanssonsFile(file15, "kl15"),
    parseBrHanssonsFile(file21, "kl21"),
  ]);

  if (!result15.success) {
    return {
      success: false,
      error: {
        ...result15.error,
        message: `${label15}: ${result15.error.message}`,
      },
    };
  }

  if (!result21.success) {
    return {
      success: false,
      error: {
        ...result21.error,
        message: `${label21}: ${result21.error.message}`,
      },
    };
  }

  const dateCheck = validateSameFileDates(
    result15.data,
    result21.data,
    label15,
    label21
  );
  if (dateCheck) {
    return { success: false, error: dateCheck };
  }

  return {
    success: true,
    data: buildCompareResult(result15.data, result21.data),
  };
}

function uniqueRowDates(rows: BrHanssonsWorkbook["rows"]): string[] {
  const dates = new Set<string>();
  for (const row of rows) {
    const datum = row.datum.trim();
    if (datum) dates.add(datum);
  }
  return Array.from(dates).sort((a, b) => a.localeCompare(b, "sv"));
}

function validateSameFileDates(
  source15: BrHanssonsWorkbook,
  source21: BrHanssonsWorkbook,
  label15: string,
  label21: string
): BrHanssonsParseError | null {
  const dates15 = uniqueRowDates(source15.rows);
  const dates21 = uniqueRowDates(source21.rows);

  if (dates15.length === 0) {
    return {
      type: "date_mismatch",
      message: `${label15} saknar giltigt datum.`,
    };
  }

  if (dates21.length === 0) {
    return {
      type: "date_mismatch",
      message: `${label21} saknar giltigt datum.`,
    };
  }

  if (dates15.length > 1 || dates21.length > 1) {
    return {
      type: "date_mismatch",
      message:
        "Varje fil får bara innehålla ett datum. Rensa blandade datum och försök igen.",
      details: [
        dates15.length > 1
          ? `${label15}: ${dates15.join(", ")}`
          : null,
        dates21.length > 1
          ? `${label21}: ${dates21.join(", ")}`
          : null,
      ].filter(Boolean) as string[],
    };
  }

  if (dates15[0] !== dates21[0]) {
    return {
      type: "date_mismatch",
      message:
        "Filerna måste ha samma datum. Ladda upp 15:00- och 21:00-filer för samma dag.",
      details: [
        `${label15}: ${dates15[0]}`,
        `${label21}: ${dates21[0]}`,
      ],
    };
  }

  return null;
}

/** Filename must contain KL15 / KL21 for the matching upload slot. */
export function validateBrHanssonsFileName(
  fileName: string,
  sourceId: BrHanssonsSourceId
): BrHanssonsParseError | null {
  const requiredToken = sourceId === "kl15" ? "KL15" : "KL21";
  const label = BR_HANSSONS_SOURCES[sourceId].label;

  if (!fileName.toUpperCase().includes(requiredToken)) {
    return {
      type: "filename_mismatch",
      message: `${label} måste ha "${requiredToken}" i filnamnet.`,
      details: [`Vald fil: ${fileName}`],
    };
  }

  return null;
}

/**
 * Some BRH exports store cells beyond the declared sheet dimension (!ref).
 * Expand !ref from actual cells so sheet_to_json does not stop early.
 */
function expandSheetRef(sheet: XLSX.WorkSheet): void {
  let range = sheet["!ref"]
    ? XLSX.utils.decode_range(sheet["!ref"])
    : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  let found = false;

  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!")) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (!found) {
      range = { s: { r: cell.r, c: cell.c }, e: { r: cell.r, c: cell.c } };
      found = true;
      continue;
    }
    if (cell.r < range.s.r) range.s.r = cell.r;
    if (cell.c < range.s.c) range.s.c = cell.c;
    if (cell.r > range.e.r) range.e.r = cell.r;
    if (cell.c > range.e.c) range.e.c = cell.c;
  }

  if (found) {
    sheet["!ref"] = XLSX.utils.encode_range(range);
  }
}

function tryParseSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  sourceId: BrHanssonsSourceId,
  fileName: string
): BrHanssonsParseResult {
  expandSheetRef(sheet);

  const rows = XLSX.utils.sheet_to_json<
    (string | number | boolean | Date | null)[]
  >(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const formattedRows = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        type: "missing_columns",
        message: `Arbetsbladet "${sheetName}" saknar rubrikrad och data.`,
        details: [...BR_HANSSONS_REQUIRED_HEADERS],
      },
    };
  }

  let headerRowIndex = -1;
  let headerMap = new Map<string, number>();

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const candidate = buildHeaderIndexMap(rows[i] ?? []);
    if (findColumnIndex(candidate, "Sedelnummer") !== undefined) {
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
        message: `Hittade ingen rubrikrad med "Sedelnummer" i arbetsbladet "${sheetName}".`,
        details: [...BR_HANSSONS_REQUIRED_HEADERS],
      },
    };
  }

  const missing = BR_HANSSONS_REQUIRED_HEADERS.filter(
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
    datum: findColumnIndex(headerMap, "Datum")!,
    sedelnummer: findColumnIndex(headerMap, "Sedelnummer")!,
    markning: findColumnIndex(headerMap, "Märkning")!,
    angoringNamn: findColumnIndex(headerMap, "Angöring namn - sista")!,
    angoringPostort: findColumnIndex(headerMap, "Angöring postort - sista")!,
    vikt: findColumnIndex(headerMap, "Vikt")!,
    pallplats: findColumnIndex(headerMap, "Pallplats")!,
    kollinslag: findColumnIndex(headerMap, "Kollinslag")!,
  };

  const result: BrHanssonsRow[] = [];
  let rowId = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const formattedRow = formattedRows[i] ?? [];
    const datum = formatDate(row[col.datum]);
    const sedelnummer = pickIdentifier(
      formattedRow[col.sedelnummer],
      row[col.sedelnummer]
    );
    const markning = pickIdentifier(
      formattedRow[col.markning],
      row[col.markning]
    );
    const angoringNamn = formatIdentifier(row[col.angoringNamn]);
    const angoringPostort = formatIdentifier(row[col.angoringPostort]);
    const vikt = parseNumericValue(row[col.vikt]);
    const pallplats = parseNumericValue(row[col.pallplats]);
    const kollinslag = formatIdentifier(row[col.kollinslag]);

    if (
      !datum &&
      !sedelnummer &&
      !angoringNamn &&
      vikt === null &&
      pallplats === null &&
      !kollinslag
    ) {
      continue;
    }

    rowId += 1;
    result.push({
      id: `brh-${sourceId}-${rowId}`,
      datum,
      sedelnummer,
      markning,
      angoringNamn,
      angoringPostort,
      vikt,
      viktFormatted: formatSwedishDecimal2(vikt),
      pallplats,
      pallplatsFormatted: formatSwedishDecimal2(pallplats),
      kollinslag,
    });
  }

  return {
    success: true,
    data: {
      sheetName,
      sourceId,
      sourceLabel: BR_HANSSONS_SOURCES[sourceId].label,
      fileName,
      rows: result,
      rowCount: result.length,
    },
  };
}

export function normalizeAngoringKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function buildCompareResult(
  source15: BrHanssonsWorkbook,
  source21: BrHanssonsWorkbook
): BrHanssonsCompareResult {
  const map15 = indexByAngoring(source15.rows);
  const map21 = indexByAngoring(source21.rows);
  const keys = new Set([...map15.keys(), ...map21.keys()]);
  const rows: BrHanssonsCompareRow[] = [];
  let changedCount = 0;
  let only15Count = 0;
  let only21Count = 0;
  let unchangedCount = 0;
  let rowId = 0;

  const sortedKeys = Array.from(keys).sort((a, b) =>
    a.localeCompare(b, "sv", { sensitivity: "base" })
  );

  for (const key of sortedKeys) {
    const row15 = map15.get(key);
    const row21 = map21.get(key);
    const base = row21 ?? row15!;
    const kollinslagChanged =
      normalizeText(row15?.kollinslag ?? "") !==
      normalizeText(row21?.kollinslag ?? "");

    let status: BrHanssonsCompareRow["status"];
    if (row15 && !row21) {
      status = "only15";
      only15Count += 1;
    } else if (!row15 && row21) {
      status = "only21";
      only21Count += 1;
    } else if (kollinslagChanged) {
      // Only Kollinslag differences count as changed.
      status = "changed";
      changedCount += 1;
    } else {
      status = "unchanged";
      unchangedCount += 1;
    }

    rowId += 1;
    rows.push({
      id: `cmp-${rowId}`,
      matchKey: key,
      status,
      datum: base.datum,
      sedelnummer: base.sedelnummer,
      markning: base.markning,
      angoringNamn: base.angoringNamn,
      angoringPostort: base.angoringPostort,
      vikt15: row15?.vikt ?? null,
      vikt15Formatted: row15?.viktFormatted ?? "—",
      vikt21: row21?.vikt ?? null,
      vikt21Formatted: row21?.viktFormatted ?? "—",
      // Vikt/Pall are shown for context but never drive the compare status.
      viktChanged: false,
      pallplats15: row15?.pallplats ?? null,
      pallplats15Formatted: row15?.pallplatsFormatted ?? "—",
      pallplats21: row21?.pallplats ?? null,
      pallplats21Formatted: row21?.pallplatsFormatted ?? "—",
      pallplatsChanged: false,
      kollinslag15: row15?.kollinslag || "—",
      kollinslag21: row21?.kollinslag || "—",
      kollinslagChanged,
    });
  }

  rows.sort((a, b) => {
    const byPostort = a.angoringPostort.localeCompare(b.angoringPostort, "sv", {
      sensitivity: "base",
    });
    if (byPostort !== 0) return byPostort;
    return a.angoringNamn.localeCompare(b.angoringNamn, "sv", {
      sensitivity: "base",
    });
  });

  return {
    rows,
    rowCount: rows.length,
    changedCount,
    only15Count,
    only21Count,
    unchangedCount,
    source15: {
      fileName: source15.fileName,
      sheetName: source15.sheetName,
      rowCount: source15.rowCount,
    },
    source21: {
      fileName: source21.fileName,
      sheetName: source21.sheetName,
      rowCount: source21.rowCount,
    },
  };
}

function indexByAngoring(rows: BrHanssonsRow[]): Map<string, BrHanssonsRow> {
  const map = new Map<string, BrHanssonsRow>();
  for (const row of rows) {
    const key = normalizeAngoringKey(row.angoringNamn);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row });
      continue;
    }
    // Duplicate angöring in same file: sum numeric fields, keep first texts.
    existing.vikt =
      existing.vikt === null && row.vikt === null
        ? null
        : (existing.vikt ?? 0) + (row.vikt ?? 0);
    existing.pallplats =
      existing.pallplats === null && row.pallplats === null
        ? null
        : (existing.pallplats ?? 0) + (row.pallplats ?? 0);
    existing.viktFormatted = formatSwedishDecimal2(existing.vikt);
    existing.pallplatsFormatted = formatSwedishDecimal2(existing.pallplats);
  }
  return map;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
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
