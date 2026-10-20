"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/excelExporter";
import type {
  CostControlRow,
  ParsedWorkbook,
  RowCommentMap,
  RowStatusMap,
} from "@/lib/types";

interface ExportButtonProps {
  data: ParsedWorkbook;
  rowStatus: RowStatusMap;
  rowComments: RowCommentMap;
  /** Rows currently shown in the overview (filters/sort applied). */
  rows?: CostControlRow[];
}

export function ExportButton({
  data,
  rowStatus,
  rowComments,
  rows,
}: ExportButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
      onClick={() => exportToExcel(data, rowStatus, rowComments, rows)}
      title={
        rows && rows.length !== data.rowCount
          ? `Exporterar ${rows.length} filtrerade rader`
          : undefined
      }
    >
      <Download className="size-4" aria-hidden />
      Exportera Excel
    </Button>
  );
}
