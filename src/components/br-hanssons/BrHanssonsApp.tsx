"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { BrHanssonsCompareTable } from "@/components/br-hanssons/BrHanssonsCompareTable";
import {
  BrHanssonsInstructionsDialog,
  BrHanssonsInstructionsTrigger,
} from "@/components/br-hanssons/BrHanssonsInstructionsDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import { compareBrHanssonsFiles, validateBrHanssonsFileName } from "@/lib/brHanssons/parser";
import {
  BR_HANSSONS_SOURCES,
  type BrHanssonsCompareResult,
  type BrHanssonsParseError,
  type BrHanssonsSourceId,
} from "@/lib/brHanssons/types";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: BrHanssonsParseError }
  | { status: "success"; data: BrHanssonsCompareResult };

export function BrHanssonsApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [file15, setFile15] = useState<File | null>(null);
  const [file21, setFile21] = useState<File | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const bothReady = file15 !== null && file21 !== null;

  const handleFileSelected = useCallback(
    (sourceId: BrHanssonsSourceId, file: File) => {
      const nameError = validateBrHanssonsFileName(file.name, sourceId);
      if (nameError) {
        if (sourceId === "kl15") setFile15(null);
        else setFile21(null);
        setState({ status: "error", error: nameError });
        return;
      }

      if (sourceId === "kl15") setFile15(file);
      else setFile21(file);

      setState((prev) =>
        prev.status === "error" && prev.error.type === "filename_mismatch"
          ? { status: "idle" }
          : prev
      );
    },
    []
  );

  const handleProcess = useCallback(async () => {
    if (!file15 || !file21) {
      setState({
        status: "error",
        error: {
          type: "missing_sources",
          message: "Båda filerna måste laddas upp innan du kan fortsätta.",
          details: [
            !file15 ? `${BR_HANSSONS_SOURCES.kl15.label} saknas` : null,
            !file21 ? `${BR_HANSSONS_SOURCES.kl21.label} saknas` : null,
          ].filter(Boolean) as string[],
        },
      });
      return;
    }

    setState({ status: "loading" });
    const result = await compareBrHanssonsFiles(file15, file21);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    setState({ status: "success", data: result.data });
  }, [file15, file21]);

  const handleReset = useCallback(() => {
    setFile15(null);
    setFile21(null);
    setState({ status: "idle" });
  }, []);

  const showUploaders = state.status === "idle" || state.status === "error";

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
            Br Hanssons
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">
            Jämför preliminära bokningar (15:00) med slutliga bokningar (21:00)
            per angöring. Visar endast rader där Kollinslag skiljer sig.
          </p>
          <BrHanssonsInstructionsTrigger
            onClick={() => setInstructionsOpen(true)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.status === "success" && (
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
          )}
        </div>
      </div>

      <BrHanssonsInstructionsDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
      />

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
              title={BR_HANSSONS_SOURCES.kl15.label}
              selectedFileName={file15?.name ?? null}
              onFileSelected={(file) => handleFileSelected("kl15", file)}
              hint="Filnamnet måste innehålla KL15"
            />
            <ExcelUploader
              title={BR_HANSSONS_SOURCES.kl21.label}
              selectedFileName={file21?.name ?? null}
              onFileSelected={(file) => handleFileSelected("kl21", file)}
              hint="Filnamnet måste innehålla KL21"
            />
          </div>

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#b8b8b8]">
              {bothReady
                ? "Båda filerna är valda — du kan jämföra."
                : "Välj både 15:00-filen och 21:00-filen för att fortsätta."}
            </p>
            <Button
              type="button"
              size="lg"
              disabled={!bothReady}
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] disabled:opacity-40 focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() => void handleProcess()}
            >
              Jämför filer
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
          <p className="text-white">Jämför Excel-filer…</p>
          <p className="text-sm text-[#b8b8b8]">
            Matchar angöringar mellan 15:00 och 21:00
          </p>
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-[#b8b8b8]">
              {BR_HANSSONS_SOURCES.kl15.label}:{" "}
              <span className="text-white">{state.data.source15.fileName}</span>
              {" · "}
              <span className="text-white">{state.data.source15.rowCount}</span>{" "}
              rader
            </p>
            <p className="text-sm text-[#b8b8b8]">
              {BR_HANSSONS_SOURCES.kl21.label}:{" "}
              <span className="text-white">{state.data.source21.fileName}</span>
              {" · "}
              <span className="text-white">{state.data.source21.rowCount}</span>{" "}
              rader
            </p>
          </div>

          <BrHanssonsCompareTable
            key={`${state.data.source15.fileName}|${state.data.source21.fileName}`}
            data={state.data}
          />
        </div>
      )}

      {state.status === "idle" && !bothReady && (
        <EmptyState
          title="Två filer krävs"
          description="Ladda upp 15:00-filen och 21:00-filen för att jämföra bokningar."
        />
      )}
    </div>
  );
}
