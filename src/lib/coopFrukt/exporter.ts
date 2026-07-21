import * as XLSX from "xlsx";
import { todayIsoDate } from "@/lib/formatters";
import {
  formatRowStatus,
  type RowCommentMap,
  type RowStatusMap,
} from "@/lib/types";
import type { CoopFruktWorkbook } from "./types";

/**
 * Export Coop Frukt processed data to Excel.
 */
export function exportCoopFruktToExcel(
  data: CoopFruktWorkbook,
  rowStatus: RowStatusMap = {},
  rowComments: RowCommentMap = {}
): void {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildSummarySheet(data, rowStatus),
    "Sammanfattning"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildDetailSheet(data, rowStatus, rowComments),
    "Coop Frukt"
  );

  const filename = `GLC_Coop_Frukt_${todayIsoDate()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

function buildSummarySheet(
  data: CoopFruktWorkbook,
  rowStatus: RowStatusMap
): XLSX.WorkSheet {
  const okCount = Object.values(rowStatus).filter((s) => s === "ok").length;
  const checkCount = Object.values(rowStatus).filter(
    (s) => s === "check"
  ).length;

  const rows: (string | number)[][] = [
    ["Arbetsblad", data.sheetName],
    [],
    ["Totalt Summa", data.totalSumma],
    ["Antal rader", data.rowCount],
    ["OK", okCount],
    ["Kontroll", checkCount],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 24 }, { wch: 18 }];
  styleHeaderCell(sheet, "A1");
  styleHeaderCell(sheet, "B1");
  return sheet;
}

function buildDetailSheet(
  data: CoopFruktWorkbook,
  rowStatus: RowStatusMap,
  rowComments: RowCommentMap
): XLSX.WorkSheet {
  const headers = [
    "Avgångsdatum",
    "Vecka",
    "FRS",
    "Ekipage",
    "Terminal",
    "Butiksnamn",
    "Postort",
    "Vikt",
    "Pris",
    "Summa",
    "Status",
    "Kommentar",
  ];

  const body = data.rows.map((row) => [
    row.avgangsdatum,
    row.vecka,
    row.frs,
    row.ekipage,
    row.terminal,
    row.butiksnamn,
    row.postort,
    row.vikt ?? "",
    row.pris ?? "",
    row.summa,
    formatRowStatus(rowStatus[row.id]),
    rowComments[row.id] ?? "",
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  sheet["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
  ];

  for (let col = 0; col < headers.length; col++) {
    styleHeaderCell(sheet, XLSX.utils.encode_cell({ r: 0, c: col }));
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
