"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import { DaviesTable } from "@/components/davies/DaviesTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import { exportDaviesToExcel } from "@/lib/davies/exporter";
import { parseDaviesFile } from "@/lib/davies/parser";
import type { DaviesParseError, DaviesWorkbook } from "@/lib/davies/types";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: DaviesParseError }
  | { status: "success"; data: DaviesWorkbook; fileName: string };

export function DaviesApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "loading" });

    const result = await parseDaviesFile(file);

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
            3054 Davies
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">
            Ladda upp Excel-fil för att granska orderstatus, intäkter och
            resurskostnad för Davies.
          </p>
        </div>

        {state.status === "success" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() => void exportDaviesToExcel(state.data)}
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
              kolumner som <span className="text-white">Lastdag</span>,{" "}
              <span className="text-white">Orderstatus</span> och{" "}
              <span className="text-white">Resurs 1–3</span>.
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
          <p className="text-sm text-[#b8b8b8]">Läser Davies-underlag</p>
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
                kolumner som <span className="text-white">Lastdag</span>,{" "}
                <span className="text-white">Orderstatus</span> och{" "}
                <span className="text-white">Resurs 1–3</span>.
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

          <DaviesTable
            rows={state.data.rows}
            totalIntakterFormatted={state.data.totalIntakterFormatted}
            rowCount={state.data.rowCount}
          />
        </div>
      )}

      {state.status === "idle" && (
        <EmptyState
          title="Ingen fil uppladdad"
          description="Ladda upp en Excel-arbetsbok för att visa 3054 Davies."
        />
      )}
    </div>
  );
}
