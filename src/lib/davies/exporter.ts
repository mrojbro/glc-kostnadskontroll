import ExcelJS from "exceljs";
import { todayIsoDate } from "@/lib/formatters";
import type { DaviesWorkbook } from "./types";

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
 * Export Davies rows to a single styled sheet with a frozen header row.
 */
export async function exportDaviesToExcel(data: DaviesWorkbook): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("3054 Davies", {
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
    const excelRow = sheet.addRow({
      datum: row.datum,
      frs: row.fraktsedelsnummer,
      betalare: row.betalare,
      littera: row.littera,
      ersattning: row.resurs,
      mottNamn: row.mottNamn,
      mottOrt: row.mottOrt,
      gods: row.gods,
    });

    excelRow.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: "left", vertical: "middle" };
      if (colNumber === 5) {
        cell.numFmt = "0.00";
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(buffer, `GLC_3054_Davies_${todayIsoDate()}.xlsx`);
}

function sortRowsForExport(rows: DaviesWorkbook["rows"]): DaviesWorkbook["rows"] {
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
