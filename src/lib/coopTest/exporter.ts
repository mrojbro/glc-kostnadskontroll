import ExcelJS from "exceljs";
import type { CoopTestRow, CoopTestWorkbook } from "./types";
import { COOP_TEST_OUTPUT_HEADERS } from "./types";

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

const COLUMN_KEYS: Array<keyof CoopTestRow> = [
  "latestRequestedDate",
  "freightUnit",
  "handlingUnit",
  "originalOrder",
  "quantity",
  "loadCarrier",
  "latestRequestedTime",
  "grossWeight",
  "transportationGroup",
  "transportationGroupDescription",
  "butiksnr",
  "consigneeAddress",
  "resurs",
  "littera",
  "lossinfo",
  "lastningsId",
  "lastningsnamn",
  "lastningsadress",
  "lastningspostnr",
  "lastningspostort",
];

/**
 * Export Coop Test mapped rows to Excel with the fixed output headers.
 */
export async function exportCoopTestToExcel(
  data: CoopTestWorkbook
): Promise<void> {
  const exportedAt = new Date();
  const timestampLabel = formatExportTimestamp(exportedAt);
  const timestampFile = formatExportTimestampForFilename(exportedAt);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GLC Kostnadskontroll";
  workbook.lastModifiedBy = "GLC Kostnadskontroll";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const sheet = workbook.addWorksheet("COOP TEST", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });

  sheet.columns = COOP_TEST_OUTPUT_HEADERS.map((header, index) => ({
    header,
    key: COLUMN_KEYS[index],
    width: Math.min(Math.max(header.length + 2, 12), 36),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 18;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  });

  for (const row of data.rows) {
    const excelRow = sheet.addRow({
      latestRequestedDate: row.latestRequestedDate,
      freightUnit: row.freightUnit,
      handlingUnit: row.handlingUnit,
      originalOrder: row.originalOrder,
      quantity: row.quantity,
      loadCarrier: row.loadCarrier,
      latestRequestedTime: row.latestRequestedTime,
      grossWeight: row.grossWeight,
      transportationGroup: row.transportationGroup,
      transportationGroupDescription: row.transportationGroupDescription,
      butiksnr: row.butiksnr,
      consigneeAddress: row.consigneeAddress,
      resurs: row.resurs,
      littera: row.littera,
      lossinfo: row.lossinfo,
      lastningsId: row.lastningsId,
      lastningsnamn: row.lastningsnamn,
      lastningsadress: row.lastningsadress,
      lastningspostnr: row.lastningspostnr,
      lastningspostort: row.lastningspostort,
    });

    excelRow.eachCell((cell) => {
      cell.alignment = { horizontal: "left", vertical: "middle" };
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
  downloadWorkbook(buffer, `GLC_COOP_TEST_${timestampFile}.xlsx`);
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
