"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import { HlpDistributionTable } from "@/components/hlp-distribution/HlpDistributionTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import { exportHlpDistributionToExcel } from "@/lib/hlpDistribution/exporter";
import { parseHlpDistributionFile } from "@/lib/hlpDistribution/parser";
import { flagOlderWeekRows } from "@/lib/hlpDistribution/weekReview";
import type {
  HlpDistributionParseError,
  HlpDistributionWorkbook,
} from "@/lib/hlpDistribution/types";
import type { RowCommentMap, RowStatusMap } from "@/lib/types";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: HlpDistributionParseError }
  | { status: "success"; data: HlpDistributionWorkbook; fileName: string };

export function HlpDistributionApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [rowStatus, setRowStatus] = useState<RowStatusMap>({});
  const [rowComments, setRowComments] = useState<RowCommentMap>({});

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "loading" });
    setRowStatus({});
    setRowComments({});

    const result = await parseHlpDistributionFile(file);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    const olderWeekFlags = flagOlderWeekRows(result.data.rows);
    setRowStatus(olderWeekFlags.rowStatus);
    setRowComments(olderWeekFlags.rowComments);

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
            HLP Distribution
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">
            Ladda upp Excel-fil för att granska fraktunderlag och exportera
            kostnadskontroll.
          </p>
        </div>

        {state.status === "success" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() =>
                exportHlpDistributionToExcel(
                  state.data,
                  rowStatus,
                  rowComments
                )
              }
            >
              <Download className="size-4" aria-hidden />
              Exportera Excel
            </Button>
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
        <ExcelUploader
          onFileSelected={handleFile}
          hint={
            <>
              Dra och släpp en fil här, eller klicka för att välja. Kräver
              kolumner som{" "}
              <span className="text-white">Orderdatum</span>,{" "}
              <span className="text-white">Fraktsedel</span> och{" "}
              <span className="text-white">Summa (Resursvaluta)</span>.
            </>
          }
        />
      )}

      {state.status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#3a3a3a] bg-[#242424] px-6 py-20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <Loader2
            className="size-8 animate-spin text-[#eb6e08]"
            aria-hidden
          />
          <p className="text-white">Bearbetar Excel-fil…</p>
          <p className="text-sm text-[#b8b8b8]">Läser HLP-underlag</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-4">
          <ErrorMessage
            message={state.error.message}
            details={state.error.details}
          />
          <ExcelUploader
            onFileSelected={handleFile}
            hint={
              <>
                Dra och släpp en fil här, eller klicka för att välja. Kräver
                kolumner som{" "}
                <span className="text-white">Orderdatum</span>,{" "}
                <span className="text-white">Fraktsedel</span> och{" "}
                <span className="text-white">Summa (Resursvaluta)</span>.
              </>
            }
          />
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-[#b8b8b8]">
              Fil: <span className="text-white">{state.fileName}</span>
            </p>
            <p className="text-sm text-[#b8b8b8]">
              Arbetsblad:{" "}
              <span className="text-white">{state.data.sheetName}</span>
            </p>
          </div>

          <HlpDistributionTable
            rows={state.data.rows}
            totalSummaFormatted={state.data.totalSummaFormatted}
            rowCount={state.data.rowCount}
            rowStatus={rowStatus}
            onRowStatusChange={setRowStatus}
            rowComments={rowComments}
            onRowCommentsChange={setRowComments}
          />
        </div>
      )}

      {state.status === "idle" && (
        <EmptyState
          title="Ingen fil uppladdad"
          description="Ladda upp en Excel-arbetsbok för att visa HLP Distribution."
        />
      )}
    </div>
  );
}
