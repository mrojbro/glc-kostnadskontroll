import * as XLSX from "xlsx";
import {
  sanitizeFilename,
  todayIsoDate,
} from "./formatters";
import type { ParsedWorkbook } from "./types";

/**
 * Export processed cost-control data to a downloadable .xlsx file.
 */
export function exportToExcel(data: ParsedWorkbook): void {
  const workbook = XLSX.utils.book_new();

  const summarySheet = buildSummarySheet(data);
  const detailSheet = buildDetailSheet(data);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Sammanfattning");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Kostnadskontroll");

  const safeRef = sanitizeFilename(data.summary.reference);
  const filename = `GLC_Kostnadskontroll_${safeRef}_${todayIsoDate()}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

function buildSummarySheet(data: ParsedWorkbook): XLSX.WorkSheet {
  const { summary } = data;
  const summaryTotalSek =
    summary.freightByRpu.value +
    summary.shunting.value +
    summary.fuelSurcharge.value +
    summary.adjustment.value;

  const rows: (string | number)[][] = [
    ["Referens", summary.reference],
    [],
    [summary.freightByRpu.label, summary.freightByRpu.value],
    [summary.shunting.label, summary.shunting.value],
    [summary.fuelSurcharge.label, summary.fuelSurcharge.value],
    [summary.adjustment.label, summary.adjustment.value],
    ["Totalt SEK (sammanfattning)", summaryTotalSek],
    [],
    ["Totalt SEK (fakturarader)", data.totalSek],
    ["Antal rader", data.rowCount],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  sheet["!cols"] = [{ wch: 32 }, { wch: 18 }];

  // Header-style first row
  styleHeaderCell(sheet, "A1");
  styleHeaderCell(sheet, "B1");

  return sheet;
}

function buildDetailSheet(data: ParsedWorkbook): XLSX.WorkSheet {
  const headers = [
    "FO-Nummer",
    "Typ",
    "Datum",
    "Butiksnr",
    "Butiksnamn",
    "Postort",
    "Pall",
    "RPU",
    "SEK",
  ];

  const body = data.rows.map((row) => [
    row.foNummer,
    row.typ,
    row.datum,
    row.butiksnr,
    row.butiksnamn,
    row.postort,
    row.pall ?? "",
    row.rpu ?? "",
    row.sek,
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);

  sheet["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
  ];

  // Style header row
  for (let col = 0; col < headers.length; col++) {
    const address = XLSX.utils.encode_cell({ r: 0, c: col });
    styleHeaderCell(sheet, address);
  }

  return sheet;
}

function styleHeaderCell(sheet: XLSX.WorkSheet, address: string): void {
  const cell = sheet[address];
  if (!cell) return;

  cell.s = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "EB6E08" }, patternType: "solid" },
    alignment: { horizontal: "left", vertical: "center" },
  };
}
