import * as XLSX from "xlsx";
import {
  sanitizeFilename,
  todayIsoDate,
} from "./formatters";
import {
  formatRowStatus,
  type CostControlRow,
  type ParsedWorkbook,
  type RowCommentMap,
  type RowStatusMap,
} from "./types";

/**
 * Export processed cost-control data to a downloadable .xlsx file.
 * When `rows` is provided (e.g. current overview filters), only those
 * rows are written to the detail sheet — in the given order.
 */
export function exportToExcel(
  data: ParsedWorkbook,
  rowStatus: RowStatusMap = {},
  rowComments: RowCommentMap = {},
  rows?: CostControlRow[]
): void {
  const workbook = XLSX.utils.book_new();
  const detailRows = rows ?? data.rows;

  const detailSheet = buildDetailSheet(detailRows, rowStatus, rowComments);

  XLSX.utils.book_append_sheet(workbook, detailSheet, "Kostnadskontroll");

  const safeRef = sanitizeFilename(data.summary.reference);
  const filename = `GLC_Kostnadskontroll_${safeRef}_${todayIsoDate()}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

function buildDetailSheet(
  detailRows: CostControlRow[],
  rowStatus: RowStatusMap,
  rowComments: RowCommentMap
): XLSX.WorkSheet {
  const headers = [
    "FO-Nummer",
    "Typ",
    "Datum",
    "Butiksnr",
    "Pall",
    "Butiksnamn",
    "Postort",
    "RPU",
    "SEK",
    "Status",
    "Kommentar",
  ];

  const body = detailRows.map((row) => [
    row.foNummer,
    row.typ,
    row.datum,
    row.butiksnr,
    row.pall ?? "",
    row.butiksnamn,
    row.postort,
    row.rpu ?? "",
    row.sek,
    formatRowStatus(rowStatus[row.id] === "ok" ? "ok" : undefined),
    rowComments[row.id] ?? "",
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);

  sheet["!cols"] = [
    { wch: 11 },
    { wch: 7 },
    { wch: 11 },
    { wch: 9 },
    { wch: 8 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
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
