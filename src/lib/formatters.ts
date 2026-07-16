/**
 * Swedish number and currency formatting utilities.
 */

const swedishNumberFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 10,
});

const swedishCurrencyNumberFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Parse a cell value into a finite number, or null if empty/invalid.
 */
export function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Handle Swedish and English number formats
    let normalized = trimmed.replace(/\s/g, "").replace(/\u00a0/g, "");

    if (normalized.includes(",") && normalized.includes(".")) {
      // Assume Swedish: 1.234,56 or English: 1,234.56
      if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
    } else if (normalized.includes(",")) {
      normalized = normalized.replace(",", ".");
    }

    // Strip currency suffixes
    normalized = normalized.replace(/sek/i, "").replace(/kr/i, "").trim();

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value instanceof Date) {
    return null;
  }

  return null;
}

/**
 * Format a number as Swedish currency: `1 234,56 SEK`
 */
export function formatSwedishCurrency(value: unknown): string {
  const num = parseNumericValue(value);
  if (num === null) {
    return "0,00 SEK";
  }
  return `${swedishCurrencyNumberFormatter.format(num)} SEK`;
}

/**
 * Format a quantity using Swedish number formatting.
 * Preserves decimals when they exist.
 */
export function formatSwedishNumber(value: unknown): string {
  const num = parseNumericValue(value);
  if (num === null) {
    return "";
  }

  const hasDecimals = !Number.isInteger(num);
  if (hasDecimals) {
    return new Intl.NumberFormat("sv-SE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 10,
    }).format(num);
  }

  return swedishNumberFormatter.format(num);
}

/**
 * Format a number with exactly two decimals (Swedish): `17,60`
 */
export function formatSwedishDecimal2(value: unknown): string {
  const num = parseNumericValue(value);
  if (num === null) {
    return "";
  }

  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Preserve identifiers as strings, keeping leading zeroes when present.
 */
export function formatIdentifier(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    // Avoid scientific notation for large IDs; do not pad zeroes lost by Excel
    return Number.isInteger(value) ? String(value) : String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value).trim();
}

/**
 * Format a date value as YYYY-MM-DD.
 * Handles Excel serial dates, JS Dates, ISO strings, and text dates.
 * Returns the original string representation if parsing fails.
 */
export function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return String(value);
    }
    return toIsoDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const fromSerial = excelSerialToDate(value);
    if (fromSerial) {
      return toIsoDate(fromSerial);
    }
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    // Already ISO-like
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = trimmed.match(
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s|$)/
    );
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, "0");
      const month = dmyMatch[2].padStart(2, "0");
      const year = dmyMatch[3];
      const candidate = new Date(`${year}-${month}-${day}T00:00:00`);
      if (!Number.isNaN(candidate.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }

    // YYYY/MM/DD
    const ymdMatch = trimmed.match(
      /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s|$)/
    );
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, "0");
      const day = ymdMatch[3].padStart(2, "0");
      const candidate = new Date(`${year}-${month}-${day}T00:00:00`);
      if (!Number.isNaN(candidate.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return toIsoDate(parsed);
    }

    return trimmed;
  }

  return String(value);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert Excel serial date to JS Date.
 * Excel's epoch is 1899-12-30 (accounting for the 1900 leap year bug).
 */
function excelSerialToDate(serial: number): Date | null {
  // Reasonable range for Excel dates (1900–2100-ish)
  if (serial < 1 || serial > 2958465) {
    return null;
  }

  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  const fractionalDay = serial - Math.floor(serial) + 1e-8;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;

  const result = new Date(
    dateInfo.getFullYear(),
    dateInfo.getMonth(),
    dateInfo.getDate(),
    hours,
    minutes,
    seconds
  );

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result;
}

/**
 * Sanitize a string for safe use in filenames.
 */
export function sanitizeFilename(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || "utan_referens";
}

/**
 * Today's date as YYYY-MM-DD.
 */
export function todayIsoDate(): string {
  return toIsoDate(new Date());
}
