import {
  REQUIRED_INVOICE_HEADERS,
  REQUIRED_SHEETS,
  type ParseError,
} from "./types";

/**
 * Normalize a header for comparison: trim + lowercase.
 */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/**
 * Find a sheet by name with trimmed, case-insensitive matching.
 */
export function findSheetName(
  sheetNames: string[],
  expected: string
): string | undefined {
  const target = normalizeHeader(expected);
  return sheetNames.find((name) => normalizeHeader(name) === target);
}

/**
 * Validate that both required worksheets exist.
 */
export function validateSheets(sheetNames: string[]): ParseError | null {
  const missing: string[] = [];

  if (!findSheetName(sheetNames, REQUIRED_SHEETS.summary)) {
    missing.push(`"${REQUIRED_SHEETS.summary}"`);
  }
  if (!findSheetName(sheetNames, REQUIRED_SHEETS.invoice)) {
    missing.push(`"${REQUIRED_SHEETS.invoice}"`);
  }

  if (missing.length === 0) {
    return null;
  }

  return {
    type: "missing_sheets",
    message:
      missing.length === 1
        ? `Obligatoriskt arbetsblad saknas: ${missing[0]}`
        : `Obligatoriska arbetsblad saknas: ${missing.join(" och ")}`,
    details: missing,
  };
}

/**
 * Build a map from normalized header → column index.
 */
export function buildHeaderIndexMap(
  headerRow: unknown[]
): Map<string, number> {
  const map = new Map<string, number>();

  headerRow.forEach((cell, index) => {
    if (cell === null || cell === undefined || cell === "") return;
    const key = normalizeHeader(String(cell));
    if (key && !map.has(key)) {
      map.set(key, index);
    }
  });

  return map;
}

/**
 * Resolve column index for a required header name.
 */
export function findColumnIndex(
  headerMap: Map<string, number>,
  headerName: string
): number | undefined {
  return headerMap.get(normalizeHeader(headerName));
}

/**
 * Validate that all required invoice columns are present.
 * Returns an error listing every missing header.
 */
export function validateRequiredColumns(
  headerMap: Map<string, number>
): ParseError | null {
  const missing = REQUIRED_INVOICE_HEADERS.filter(
    (header) => findColumnIndex(headerMap, header) === undefined
  );

  if (missing.length === 0) {
    return null;
  }

  return {
    type: "missing_columns",
    message:
      "Obligatoriska kolumner saknas i arbetsbladet \"Invoice basis\".",
    details: missing.map((h) => `"${h}"`),
  };
}

/**
 * Case-insensitive trim comparison.
 */
export function equalsIgnoreCase(a: unknown, b: string): boolean {
  if (a === null || a === undefined) return false;
  return String(a).trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Check if a row is completely empty.
 */
export function isEmptyRow(row: unknown[]): boolean {
  return row.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === ""
  );
}
