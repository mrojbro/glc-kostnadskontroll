"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { CostControlTable } from "@/components/CostControlTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { ExportButton } from "@/components/ExportButton";
import { SummaryCards } from "@/components/SummaryCards";
import { SummaryHeader } from "@/components/SummaryHeader";
import { Button } from "@/components/ui/button";
import { parseExcelFile } from "@/lib/excelParser";
import type {
  CostControlRow,
  ParseError,
  ParsedWorkbook,
  RowCommentMap,
  RowStatusMap,
} from "@/lib/types";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: ParseError }
  | { status: "success"; data: ParsedWorkbook; fileName: string };

interface CostControlAppProps {
  title: string;
  description?: string;
}

export function CostControlApp({
  title,
  description = "Ladda upp en fakturaunderlagsfil, granska sammanfattning och fakturarader, och exportera resultatet till Excel.",
}: CostControlAppProps) {
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [rowStatus, setRowStatus] = useState<RowStatusMap>({});
  const [rowComments, setRowComments] = useState<RowCommentMap>({});
  const [visibleRows, setVisibleRows] = useState<CostControlRow[]>([]);

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "loading" });
    setRowStatus({});
    setRowComments({});
    setVisibleRows([]);

    const result = await parseExcelFile(file);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    setState({
      status: "success",
      data: result.data,
      fileName: file.name,
    });
  }, []);

  const handleReset = useCallback(() => {
    setState({ status: "idle" });
    setRowStatus({});
    setRowComments({});
    setVisibleRows([]);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 text-sm text-[#b8b8b8] transition-colors hover:text-[#eb6e08]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tillbaka
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-[#b8b8b8]">
            GLC Kostnadskontroll
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#eb6e08] sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">{description}</p>
        </div>

        {state.status === "success" && (
          <div className="flex flex-wrap gap-2">
            <ExportButton
              data={state.data}
              rowStatus={rowStatus}
              rowComments={rowComments}
              rows={visibleRows}
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-10 gap-2 rounded-lg border-[#3a3a3a] bg-[#202020] text-white hover:border-[#eb6e08] hover:bg-[#2a2218] hover:text-white focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={handleReset}
            >
              <Upload className="size-4" aria-hidden />
              Ladda upp ny fil
            </Button>
          </div>
        )}
      </div>

      {state.status === "idle" && (
        <ExcelUploader onFileSelected={handleFile} />
      )}

      {state.status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#3a3a3a] bg-[#242424] px-6 py-20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <Loader2
            className="size-8 animate-spin text-[#eb6e08]"
            aria-hidden
          />
          <p className="text-white">Bearbetar Excel-fil…</p>
          <p className="text-sm text-[#b8b8b8]">
            Validerar arbetsblad och kolumner
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-4">
          <ErrorMessage
            message={state.error.message}
            details={state.error.details}
          />
          <ExcelUploader onFileSelected={handleFile} />
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-10">
          <div className="space-y-1">
            <SummaryHeader reference={state.data.summary.reference} />
            <p className="text-sm text-[#b8b8b8]">
              Fil:{" "}
              <span className="text-white">{state.fileName}</span>
            </p>
          </div>

          <SummaryCards summary={state.data.summary} />

          <CostControlTable
            rows={state.data.rows}
            totalSekFormatted={state.data.totalSekFormatted}
            rowCount={state.data.rowCount}
            rowStatus={rowStatus}
            onRowStatusChange={setRowStatus}
            rowComments={rowComments}
            onRowCommentsChange={setRowComments}
            onVisibleRowsChange={setVisibleRows}
          />
        </div>
      )}

      {state.status === "idle" && (
        <EmptyState
          title="Ingen fil uppladdad"
          description="Ladda upp en Excel-arbetsbok för att visa sammanfattning och kostnadskontroll."
        />
      )}
    </div>
  );
}
