import * as XLSX from "xlsx";
import {
  sanitizeFilename,
  todayIsoDate,
} from "./formatters";
import {
  formatRowStatus,
  type ParsedWorkbook,
  type RowStatusMap,
} from "./types";

/**
 * Export processed cost-control data to a downloadable .xlsx file.
 */
export function exportToExcel(
  data: ParsedWorkbook,
  rowStatus: RowStatusMap = {}
): void {
  const workbook = XLSX.utils.book_new();

  const summarySheet = buildSummarySheet(data, rowStatus);
  const detailSheet = buildDetailSheet(data, rowStatus);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Sammanfattning");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Kostnadskontroll");

  const safeRef = sanitizeFilename(data.summary.reference);
  const filename = `GLC_Kostnadskontroll_${safeRef}_${todayIsoDate()}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

function buildSummarySheet(
  data: ParsedWorkbook,
  rowStatus: RowStatusMap
): XLSX.WorkSheet {
  const { summary } = data;
  const summaryTotalSek =
    summary.freightByRpu.value +
    summary.shunting.value +
    summary.fuelSurcharge.value +
    summary.adjustment.value;

  const okCount = Object.values(rowStatus).filter((s) => s === "ok").length;
  const checkCount = Object.values(rowStatus).filter(
    (s) => s === "check"
  ).length;

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
    ["OK", okCount],
    ["Kontroll", checkCount],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  sheet["!cols"] = [{ wch: 32 }, { wch: 18 }];

  styleHeaderCell(sheet, "A1");
  styleHeaderCell(sheet, "B1");

  return sheet;
}

function buildDetailSheet(
  data: ParsedWorkbook,
  rowStatus: RowStatusMap
): XLSX.WorkSheet {
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
    "Status",
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
    formatRowStatus(rowStatus[row.id]),
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
    { wch: 10 },
  ];

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
