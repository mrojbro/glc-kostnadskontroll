"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardPaste, Download, Loader2, Upload } from "lucide-react";
import { CoopTestTable } from "@/components/coop-test/CoopTestTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import { exportCoopTestToExcel } from "@/lib/coopTest/exporter";
import { parseCoopTestFile, parseCoopTestPaste } from "@/lib/coopTest/parser";
import type { CoopTestParseError, CoopTestWorkbook } from "@/lib/coopTest/types";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: CoopTestParseError }
  | { status: "success"; data: CoopTestWorkbook };

export function CoopTestApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [pasteText, setPasteText] = useState("");

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "loading" });
    setPasteText("");

    const result = await parseCoopTestFile(file);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    setState({ status: "success", data: result.data });
  }, []);

  const handlePaste = useCallback(() => {
    setState({ status: "loading" });

    const result = parseCoopTestPaste(pasteText);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    setState({ status: "success", data: result.data });
  }, [pasteText]);

  const handleReset = useCallback(() => {
    setState({ status: "idle" });
    setPasteText("");
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
            COOP TEST
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">
            Ladda upp eller klistra in Excel-data och exportera den mappade
            output-layouten. Gross Weight skrivs med kommatecken (344.080 →
            344,080).
          </p>
        </div>

        {state.status === "success" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() => void exportCoopTestToExcel(state.data)}
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
              Ny data
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

      {(state.status === "idle" || state.status === "error") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ExcelUploader
            title="Ladda upp Excel-fil"
            onFileSelected={(file) => void handleFile(file)}
            hint={
              <>
                Kräver kolumner som{" "}
                <span className="text-white">
                  Latest Requested Date (Unloading Location)
                </span>
                , <span className="text-white">Execution Document</span>,{" "}
                <span className="text-white">Consignee</span>,{" "}
                <span className="text-white">Gross Weight</span> m.fl.
              </>
            }
          />

          <div className="flex flex-col gap-4 rounded-2xl border border-[#3a3a3a] bg-[#242424] px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">
                Klistra in från Excel
              </p>
              <p className="text-sm text-[#b8b8b8]">
                Kopiera rubrikrad + data i Excel och klistra in här (tabbseparerat).
              </p>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.trim()) {
                  e.preventDefault();
                  setPasteText(text);
                }
              }}
              rows={12}
              spellCheck={false}
              placeholder={"Latest Requested Date...\tExecution Document\t...\n2026-01-15\t12345\t..."}
              className="min-h-[220px] w-full resize-y rounded-xl border border-[#3a3a3a] bg-[#202020] px-3 py-2 font-mono text-xs text-white placeholder:text-[#5a5a5a] outline-none focus:border-[#eb6e08] focus:ring-1 focus:ring-[#eb6e08]/40"
            />
            <Button
              type="button"
              size="lg"
              disabled={!pasteText.trim()}
              className="h-10 gap-2 self-start rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] disabled:opacity-40 focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={handlePaste}
            >
              <ClipboardPaste className="size-4" aria-hidden />
              Bearbeta inklistring
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
          <p className="text-white">Bearbetar data…</p>
          <p className="text-sm text-[#b8b8b8]">Mappar till output-layout</p>
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-[#b8b8b8]">
              Källa: <span className="text-white">{state.data.fileName}</span>
            </p>
            <p className="text-sm text-[#b8b8b8]">
              Arbetsblad:{" "}
              <span className="text-white">{state.data.sheetName}</span>
              {" · "}
              <span className="text-white">{state.data.rowCount}</span> rader
              {state.data.tskIgnoredCount > 0 ? (
                <>
                  {" · "}
                  <span className="text-[#f0a35a]">
                    {state.data.tskIgnoredCount} TSK ignorerade
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <CoopTestTable
            rows={state.data.rows}
            summary={state.data.summary}
            tskIgnoredCount={state.data.tskIgnoredCount}
          />
        </div>
      )}

      {state.status === "idle" && (
        <EmptyState
          title="Ingen data ännu"
          description="Ladda upp en Excel-fil eller klistra in data från Excel för att skapa COOP TEST-outputen."
        />
      )}
    </div>
  );
}
