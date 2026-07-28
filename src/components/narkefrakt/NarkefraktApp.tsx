"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import { NarkefraktTable } from "@/components/narkefrakt/NarkefraktTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import { exportNarkefraktToExcel } from "@/lib/narkefrakt/exporter";
import { parseNarkefraktBothSources } from "@/lib/narkefrakt/parser";
import {
  NARKEFRAKT_SOURCES,
  type NarkefraktParseError,
  type NarkefraktWorkbook,
} from "@/lib/narkefrakt/types";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: NarkefraktParseError }
  | { status: "success"; data: NarkefraktWorkbook };

export function NarkefraktApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const bothReady = fileA !== null && fileB !== null;

  const handleProcess = useCallback(async () => {
    if (!fileA || !fileB) {
      setState({
        status: "error",
        error: {
          type: "missing_sources",
          message:
            "Båda källorna måste laddas upp innan du kan fortsätta.",
          details: [
            !fileA ? `${NARKEFRAKT_SOURCES["source-a"].label} saknas` : null,
            !fileB ? `${NARKEFRAKT_SOURCES["source-b"].label} saknas` : null,
          ].filter(Boolean) as string[],
        },
      });
      return;
    }

    setState({ status: "loading" });
    const result = await parseNarkefraktBothSources(fileA, fileB);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    setState({ status: "success", data: result.data });
  }, [fileA, fileB]);

  const handleReset = useCallback(() => {
    setFileA(null);
    setFileB(null);
    setState({ status: "idle" });
  }, []);

  const showUploaders =
    state.status === "idle" || state.status === "error";

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
            3028 Närkefrakt
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">
            Ladda upp två Excel-källor (3028 och 3029). Båda krävs innan
            bearbetning. Resultatet visas och exporteras som en gemensam lista.
          </p>
        </div>

        {state.status === "success" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() => void exportNarkefraktToExcel(state.data)}
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
              Ladda upp nya filer
            </Button>
          </div>
        )}
      </div>

      {state.status === "error" && (
        <ErrorMessage
          message={state.error.message}
          details={state.error.details}
        />
      )}

      {showUploaders && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ExcelUploader
              title={NARKEFRAKT_SOURCES["source-a"].label}
              selectedFileName={fileA?.name ?? null}
              onFileSelected={setFileA}
              hint="Första källfilen"
            />
            <ExcelUploader
              title={NARKEFRAKT_SOURCES["source-b"].label}
              selectedFileName={fileB?.name ?? null}
              onFileSelected={setFileB}
              hint="Andra källfilen"
            />
          </div>

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#b8b8b8]">
              {bothReady
                ? "Båda källorna är valda — du kan bearbeta."
                : "Välj båda källorna för att fortsätta."}
            </p>
            <Button
              type="button"
              size="lg"
              disabled={!bothReady}
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] disabled:opacity-40 focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() => void handleProcess()}
            >
              Bearbeta båda källorna
            </Button>
          </div>
        </div>
      )}

      {state.status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#3a3a3a] bg-[#242424] px-6 py-20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <Loader2
            className="size-8 animate-spin text-[#eb6e08]"
            aria-hidden
          />
          <p className="text-white">Bearbetar Excel-filer…</p>
          <p className="text-sm text-[#b8b8b8]">
            Läser {NARKEFRAKT_SOURCES["source-a"].label} och{" "}
            {NARKEFRAKT_SOURCES["source-b"].label}
          </p>
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-6">
          <div className="space-y-1">
            {state.data.sources.map((source) => (
              <p key={source.id} className="text-sm text-[#b8b8b8]">
                {source.label}:{" "}
                <span className="text-white">{source.fileName}</span>
                {" · "}
                blad <span className="text-white">{source.sheetName}</span>
                {" · "}
                <span className="text-white">{source.rowCount}</span> rader
              </p>
            ))}
          </div>

          <NarkefraktTable
            rows={state.data.rows}
            totalIntakterFormatted={state.data.totalIntakterFormatted}
            totalResursFormatted={state.data.totalResursFormatted}
            rowCount={state.data.rowCount}
          />
        </div>
      )}

      {state.status === "idle" && !bothReady && (
        <EmptyState
          title="Två källor krävs"
          description="Ladda upp 3028 och 3029 för att visa 3028 Närkefrakt."
        />
      )}
    </div>
  );
}
