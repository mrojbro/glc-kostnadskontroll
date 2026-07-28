import ExcelJS from "exceljs";
import type { KrickosWorkbook } from "./types";

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
 * Export Krickos rows to a single styled sheet with a frozen header row.
 */
export async function exportKrickosToExcel(
  data: KrickosWorkbook
): Promise<void> {
  const exportedAt = new Date();
  const timestampLabel = formatExportTimestamp(exportedAt);
  const timestampFile = formatExportTimestampForFilename(exportedAt);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GLC Kostnadskontroll";
  workbook.lastModifiedBy = "GLC Kostnadskontroll";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const sheet = workbook.addWorksheet("2215 Krickos", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });

  sheet.columns = [
    { header: "Datum", key: "datum", width: 12 },
    { header: "FRS", key: "frs", width: 14 },
    { header: "Betalare", key: "betalare", width: 18 },
    { header: "Littera", key: "littera", width: 18 },
    { header: "Ersättning", key: "ersattning", width: 12 },
    { header: "Mott Namn", key: "mottNamn", width: 28 },
    { header: "Mott Ort", key: "mottOrt", width: 14 },
    { header: "Gods", key: "gods", width: 40 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 18;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "left", vertical: "middle" };
  });

  for (const row of sortRowsForExport(data.rows)) {
    const ersattning =
      row.resursFormatted === "Samtax" ? "Samtax" : row.resurs;
    const excelRow = sheet.addRow({
      datum: row.datum,
      frs: row.fraktsedelsnummer,
      betalare: row.betalare,
      littera: row.littera,
      ersattning,
      mottNamn: row.mottNamn,
      mottOrt: row.mottOrt,
      gods: row.gods,
    });

    excelRow.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: "left", vertical: "middle" };
      if (colNumber === 5 && row.resursFormatted !== "Samtax") {
        cell.numFmt = "0.00";
      }
    });
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
  downloadWorkbook(buffer, `GLC_2215_Krickos_${timestampFile}.xlsx`);
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

function sortRowsForExport(
  rows: KrickosWorkbook["rows"]
): KrickosWorkbook["rows"] {
  return [...rows].sort((a, b) => {
    const byDatum = a.datum.localeCompare(b.datum, "sv");
    if (byDatum !== 0) return byDatum;
    const byOrt = a.mottOrt.localeCompare(b.mottOrt, "sv", {
      sensitivity: "base",
    });
    if (byOrt !== 0) return byOrt;
    return a.mottNamn.localeCompare(b.mottNamn, "sv", { sensitivity: "base" });
  });
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
