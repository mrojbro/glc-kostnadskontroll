"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/excelExporter";
import type {
  ParsedWorkbook,
  RowCommentMap,
  RowStatusMap,
} from "@/lib/types";

interface ExportButtonProps {
  data: ParsedWorkbook;
  rowStatus: RowStatusMap;
  rowComments: RowCommentMap;
}

export function ExportButton({
  data,
  rowStatus,
  rowComments,
}: ExportButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
      onClick={() => exportToExcel(data, rowStatus, rowComments)}
    >
      <Download className="size-4" aria-hidden />
      Exportera Excel
    </Button>
  );
}
