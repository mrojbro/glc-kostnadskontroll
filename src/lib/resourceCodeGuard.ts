import { isEmptyRow } from "@/lib/validation";

export interface ResourceCodeMajorityResult {
  ok: boolean;
  total: number;
  matching: number;
  sharePercent: number;
}

/**
 * True when a Resurs 1/2/3 cell matches the expected resource code
 * (number equality, "3054.0", or text containing the code).
 */
export function cellMatchesResourceCode(
  value: unknown,
  expectedCode: number
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") {
    return Number.isFinite(value) && Math.round(value) === expectedCode;
  }
  if (value instanceof Date || typeof value === "boolean") return false;

  const text = String(value).trim();
  if (!text) return false;
  if (text.includes(String(expectedCode))) return true;

  const parsed = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && Math.round(parsed) === expectedCode;
}

export function isNonEmptyResursCell(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Date || typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value).trim() !== "";
}

/**
 * Require a strict majority (> 50%) of data rows that have any Resurs 1–3
 * value to also contain the expected resource code in at least one slot.
 *
 * Row-based (not cell-based) so files with multiple resource codes per row
 * still pass when the expected code is present on most rows.
 */
export function checkResourceCodeMajority(
  rows: (string | number | boolean | Date | null)[][],
  headerRowIndex: number,
  resursCols: readonly [number, number, number],
  expectedCode: number
): ResourceCodeMajorityResult {
  let total = 0;
  let matching = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const cells = resursCols.map((col) => row[col]);
    if (!cells.some(isNonEmptyResursCell)) continue;

    total += 1;
    if (cells.some((cell) => cellMatchesResourceCode(cell, expectedCode))) {
      matching += 1;
    }
  }

  const sharePercent =
    total === 0 ? 0 : Math.round((matching / total) * 100);

  return {
    ok: total > 0 && matching * 2 > total,
    total,
    matching,
    sharePercent,
  };
}

export function buildWrongResourceCodeError(
  expectedCode: number,
  result: ResourceCodeMajorityResult
): {
  type: "wrong_resource_code";
  message: string;
  details: string[];
} {
  const details =
    result.total === 0
      ? [
          `Inga värden hittades i kolumnerna Resurs 1–3.`,
          `Förväntade att merparten av raderna skulle innehålla resurskod ${expectedCode}.`,
        ]
      : [
          `Hittade resurskod ${expectedCode} på ${result.matching} av ${result.total} rader med resursvärden (${result.sharePercent}%).`,
          `Förväntade att mer än hälften av raderna skulle innehålla resurskod ${expectedCode}.`,
          `Kontrollera att du laddat upp rätt Excel-fil.`,
        ];

  return {
    type: "wrong_resource_code",
    message: `Fel fil? Merparten av raderna har inte resurskod ${expectedCode} i Resurs 1–3.`,
    details,
  };
}
