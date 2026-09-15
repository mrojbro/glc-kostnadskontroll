"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { WidensTable } from "@/components/widens/WidensTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ExcelUploader } from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import {
  applyWidensInput2ToWorkbook,
  buildT5AndDifferens,
  parseWidensFile,
  parseWidensInput2File,
} from "@/lib/widens/parser";
import type {
  WidensParseError,
  WidensRow,
  WidensWorkbook,
} from "@/lib/widens/types";
import { cn } from "@/lib/utils";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: WidensParseError }
  | {
      status: "success";
      data: WidensWorkbook;
      mergingInput2?: boolean;
    };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

function buildOrdernrList(rows: WidensRow[]): string {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of rows) {
    const value = row.ordernr.trim();
    if (!value || value === "—") continue;
    if (seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }
  return values.join(", ");
}

export function WidensApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [ordernrCopied, setOrdernrCopied] = useState(false);
  const [input2Error, setInput2Error] = useState<WidensParseError | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "loading" });
    setOrdernrCopied(false);
    setInput2Error(null);

    const result = await parseWidensFile(file);

    if (!result.success) {
      setState({ status: "error", error: result.error });
      return;
    }

    setState({ status: "success", data: result.data });
  }, []);

  const handleInput2 = useCallback(
    async (file: File) => {
      if (state.status !== "success") return;

      setInput2Error(null);
      const previous = state.data;
      setState({ status: "success", data: previous, mergingInput2: true });

      const result = await parseWidensInput2File(file);

      if (!result.success) {
        setInput2Error(result.error);
        setState({ status: "success", data: previous });
        return;
      }

      const merged = applyWidensInput2ToWorkbook(
        previous,
        result.data.rows,
        result.data.fileName
      );
      setState({ status: "success", data: merged });
    },
    [state]
  );

  const handleT5Change = useCallback((rowId: string, t5: number | null) => {
    setState((prev) => {
      if (prev.status !== "success") return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          rows: prev.data.rows.map((row) =>
            row.id === rowId
              ? { ...row, ...buildT5AndDifferens(t5, row.summa) }
              : row
          ),
        },
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setState({ status: "idle" });
    setOrdernrCopied(false);
    setInput2Error(null);
  }, []);

  const ordernrList = useMemo(() => {
    if (state.status !== "success") return "";
    return buildOrdernrList(state.data.rows);
  }, [state]);

  const handleCopyOrdernr = useCallback(async () => {
    if (!ordernrList) return;
    const ok = await copyText(ordernrList);
    if (!ok) return;
    setOrdernrCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setOrdernrCopied(false), 1500);
  }, [ordernrList]);

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
            Widens
          </h1>
          <p className="max-w-2xl text-[#b8b8b8]">
            Ladda upp Excel-filen, kopiera Ordernr, och ladda upp Input 2 för att
            fylla kolumnen T5 (resurs 3012/3044).
          </p>
        </div>

        {state.status === "success" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              disabled={!ordernrList}
              className={cn(
                "h-10 gap-2 rounded-lg px-4 text-white focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40",
                ordernrCopied
                  ? "bg-[#22c55e] hover:bg-[#16a34a]"
                  : "bg-[#eb6e08] hover:bg-[#d46207] disabled:opacity-40"
              )}
              onClick={() => void handleCopyOrdernr()}
              title={
                ordernrList
                  ? "Kopiera alla Ordernr som kommaseparerad lista"
                  : "Inga Ordernr att kopiera"
              }
            >
              {ordernrCopied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {ordernrCopied ? "Kopierad" : "Ordernr"}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={state.mergingInput2}
              className="h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] disabled:opacity-40 focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
              onClick={() => input2Ref.current?.click()}
              title="Ladda upp Input 2 med Ordernr och Resurs 1–3"
            >
              {state.mergingInput2 ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <FileSpreadsheet className="size-4" aria-hidden />
              )}
              {state.mergingInput2 ? "Matchar…" : "Input 2"}
            </Button>
            <input
              ref={input2Ref}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleInput2(file);
              }}
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

      {state.status === "error" && (
        <ErrorMessage
          message={state.error.message}
          details={state.error.details}
        />
      )}

      {input2Error && (
        <ErrorMessage
          message={input2Error.message}
          details={input2Error.details}
        />
      )}

      {(state.status === "idle" || state.status === "error") && (
        <ExcelUploader
          title="Input 1 — Ladda upp Excel"
          onFileSelected={(file) => void handleFile(file)}
          hint={
            <>
              Excel med kolumner som{" "}
              <span className="text-white">Transportdag</span>,{" "}
              <span className="text-white">Referens</span>,{" "}
              <span className="text-white">Fraktsedelnummer</span>,{" "}
              <span className="text-white">Artikelslag</span>,{" "}
              <span className="text-white">Radbelopp</span> m.fl.
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
          <p className="text-sm text-[#b8b8b8]">Läser Widens Input 1</p>
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-[#b8b8b8]">
              Fil: <span className="text-white">{state.data.fileName}</span>
            </p>
            <p className="text-sm text-[#b8b8b8]">
              Arbetsblad:{" "}
              <span className="text-white">{state.data.sheetName}</span>
              {" · "}
              <span className="text-white">{state.data.rowCount}</span> rader
              {ordernrList ? (
                <>
                  {" · "}
                  <span className="text-white">
                    {ordernrList.split(", ").length}
                  </span>{" "}
                  unika Ordernr
                </>
              ) : null}
            </p>
            {state.data.input2FileName ? (
              <p className="text-sm text-[#b8b8b8]">
                Input 2:{" "}
                <span className="text-white">{state.data.input2FileName}</span>
                {" · "}
                <span className="text-white">{state.data.t5MatchCount ?? 0}</span>{" "}
                T5-träffar
              </p>
            ) : (
              <p className="text-sm text-[#b8b8b8]">
                Input 2:{" "}
                <span className="text-white">inte uppladdad ännu</span>
              </p>
            )}
          </div>

          <WidensTable rows={state.data.rows} onT5Change={handleT5Change} />
        </div>
      )}

      {state.status === "idle" && (
        <EmptyState
          title="Ingen fil uppladdad"
          description="Ladda upp en Excel-fil för Input 1 för att visa Widens-rader och kopiera Ordernr."
        />
      )}
    </div>
  );
}
