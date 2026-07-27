import ExcelJS from "exceljs";
import type { NarkefraktRow, NarkefraktWorkbook } from "./types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEB6E08" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  name: "Calibri",
  size: 11,
};

/**
 * Pivot export: Datum (rows) × Mott Namn (columns) = sum(Resurs).
 * Dates are normalized to Mon/Wed delivery days before pivoting.
 */
export async function exportNarkefraktToExcel(
  data: NarkefraktWorkbook
): Promise<void> {
  const exportedAt = new Date();
  const timestampLabel = formatExportTimestamp(exportedAt);
  const timestampFile = formatExportTimestampForFilename(exportedAt);
  const { dates, mottNames, totals } = buildResursPivot(data.rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GLC Kostnadskontroll";
  workbook.lastModifiedBy = "GLC Kostnadskontroll";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const sheet = workbook.addWorksheet("3028 Närkefrakt", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 1, activeCell: "B2" }],
  });

  const headerValues = ["Datum", ...mottNames, "Totalt"];
  const headerRow = sheet.addRow(headerValues);
  headerRow.height = 18;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "left", vertical: "middle" };
  });

  sheet.getColumn(1).width = 12;
  for (let i = 0; i < mottNames.length; i++) {
    sheet.getColumn(i + 2).width = Math.max(14, mottNames[i].length + 2);
  }
  sheet.getColumn(mottNames.length + 2).width = 12;

  for (const datum of dates) {
    const rowValues: (string | number | null)[] = [datum];
    let rowTotal = 0;
    for (const mottNamn of mottNames) {
      const key = pivotKey(datum, mottNamn);
      const value = totals.get(key) ?? 0;
      rowTotal += value;
      rowValues.push(value === 0 ? null : value);
    }
    rowValues.push(rowTotal === 0 ? null : rowTotal);

    const excelRow = sheet.addRow(rowValues);
    excelRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    for (let col = 2; col <= mottNames.length + 2; col++) {
      const cell = excelRow.getCell(col);
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "0.00";
      if (col === mottNames.length + 2) {
        cell.font = { bold: true, name: "Calibri", size: 11 };
      }
    }
  }

  sheet.addRow([]);
  const stampRow = sheet.addRow([`Exporterad: ${timestampLabel}`]);
  stampRow.getCell(1).font = {
    italic: true,
    color: { argb: "FF666666" },
    name: "Calibri",
    size: 10,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(buffer, `GLC_3028_Narkefrakt_${timestampFile}.xlsx`);
}

function buildResursPivot(rows: NarkefraktRow[]): {
  dates: string[];
  mottNames: string[];
  totals: Map<string, number>;
} {
  const dateSet = new Set<string>();
  const mottSet = new Set<string>();
  const totals = new Map<string, number>();

  for (const row of rows) {
    const datum = normalizeNarkefraktExportDate(row.datum);
    const mottNamn = row.mottNamn.trim();
    if (!datum || !mottNamn) continue;

    dateSet.add(datum);
    mottSet.add(mottNamn);

    const key = pivotKey(datum, mottNamn);
    totals.set(key, (totals.get(key) ?? 0) + row.resurs);
  }

  const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b, "sv"));
  const mottNames = Array.from(mottSet).sort((a, b) =>
    a.localeCompare(b, "sv", { sensitivity: "base" })
  );

  return { dates, mottNames, totals };
}

/**
 * Delivery days are Mon/Wed.
 * Tue → Mon of that week, Thu → Wed of that week.
 */
export function normalizeNarkefraktExportDate(datum: string): string {
  const trimmed = datum.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return trimmed;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  if (Number.isNaN(date.getTime())) return trimmed;

  const weekday = date.getDay(); // 0 Sun … 6 Sat
  if (weekday === 2) {
    // Tuesday → Monday
    date.setDate(date.getDate() - 1);
  } else if (weekday === 4) {
    // Thursday → Wednesday
    date.setDate(date.getDate() - 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pivotKey(datum: string, mottNamn: string): string {
  return `${datum}\0${mottNamn}`;
}

function formatExportTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatExportTimestampForFilename(date: Date): string {
  return formatExportTimestamp(date).replace(/:/g, "-").replace(/\s+/g, "_");
}

function downloadWorkbook(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
