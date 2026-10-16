"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CopyableText } from "@/components/CopyableText";
import { Input } from "@/components/ui/input";
import type { NarkefraktPortalRow } from "@/lib/narkefraktPortal/types";
import {
  formatSwedishCurrency,
  formatSwedishDecimal2,
  parseNumericValue,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

const COLUMNS: Array<{
  key: keyof NarkefraktPortalRow;
  label: string;
  align?: "left" | "right";
  title?: string;
}> = [
  { key: "datum", label: "Datum" },
  { key: "frs", label: "FRS" },
  { key: "ordernr", label: "Ordernr" },
  { key: "lastort", label: "Lastort" },
  { key: "mottagare", label: "Mottagare" },
  { key: "lossort", label: "Lossort" },
  { key: "prisFormatted", label: "Pris", align: "right" },
  { key: "dmtFormatted", label: "DMT", align: "right" },
  { key: "summaFormatted", label: "Summa", align: "right" },
  { key: "t5Formatted", label: "T5", align: "right" },
  {
    key: "differensFormatted",
    label: "Differens",
    align: "right",
    title: "T5 − Summa",
  },
];

interface NarkefraktPortalTableProps {
  rows: NarkefraktPortalRow[];
  onT5Change: (rowId: string, t5: number | null) => void;
}

const deckClass =
  "rounded-2xl border border-[#3a3a3a] bg-[#242424] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]";

function differensClass(value: number | null): string {
  if (value === null) return "text-[#b8b8b8]";
  if (Math.round(value * 100) >= 0) return "font-medium text-[#4ade80]";
  return "font-medium text-[#fca5a5]";
}

function sumNullable(
  rows: NarkefraktPortalRow[],
  key: "pris" | "dmt" | "summa" | "t5" | "differens"
): number {
  return rows.reduce((total, row) => {
    const value = row[key];
    return value === null ? total : total + value;
  }, 0);
}

function formatT5Draft(value: number | null): string {
  if (value === null) return "";
  return formatSwedishDecimal2(value);
}

function rowMatchesGlobalSearch(
  row: NarkefraktPortalRow,
  query: string
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const values = [
    row.datum,
    row.frs,
    row.ordernr,
    row.lastort,
    row.mottagare,
    row.lossort,
    row.prisFormatted,
    row.dmtFormatted,
    row.summaFormatted,
    row.t5Formatted,
    row.differensFormatted,
  ];
  return values.some((value) =>
    String(value).toLowerCase().includes(normalized)
  );
}

function EditableT5Cell({
  rowId,
  value,
  onChange,
}: {
  rowId: string;
  value: number | null;
  onChange: (rowId: string, t5: number | null) => void;
}) {
  const [draft, setDraft] = useState(() => formatT5Draft(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatT5Draft(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === "—") {
      onChange(rowId, null);
      setDraft("");
      return;
    }
    const parsed = parseNumericValue(trimmed);
    onChange(rowId, parsed);
    setDraft(formatT5Draft(parsed));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : value === null ? "—" : formatSwedishCurrency(value)}
      onFocus={(e) => {
        const input = e.currentTarget;
        setFocused(true);
        setDraft(formatT5Draft(value));
        requestAnimationFrame(() => input.select());
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(formatT5Draft(value));
          e.currentTarget.blur();
        }
      }}
      aria-label="Redigera T5"
      title="Klicka för att redigera T5"
      className={cn(
        "w-full max-w-full rounded-md border border-[#3a3a3a] bg-[#202020] px-1.5 py-0.5 text-right text-xs tabular-nums outline-none transition-colors",
        "focus:border-[#eb6e08] focus:ring-1 focus:ring-[#eb6e08]/40",
        value === null ? "text-[#b8b8b8]" : "text-[#eb6e08]",
        "hover:border-[#eb6e08]/60"
      )}
    />
  );
}

export function NarkefraktPortalTable({
  rows,
  onT5Change,
}: NarkefraktPortalTableProps) {
  const [search, setSearch] = useState("");

  // Reset search on new upload, not when a single T5 cell is edited.
  const rowSetId = `${rows.length}:${rows[0]?.id ?? ""}:${rows.at(-1)?.id ?? ""}`;
  useEffect(() => {
    setSearch("");
  }, [rowSetId]);

  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesGlobalSearch(row, search)),
    [rows, search]
  );

  const totals = useMemo(() => {
    const pris = sumNullable(filteredRows, "pris");
    const dmt = sumNullable(filteredRows, "dmt");
    const summa = sumNullable(filteredRows, "summa");
    const t5 = sumNullable(filteredRows, "t5");
    const differens = sumNullable(filteredRows, "differens");
    const t5Count = filteredRows.filter((row) => row.t5 !== null).length;
    const hasDifferens = filteredRows.some((row) => row.differens !== null);

    return {
      prisFormatted: formatSwedishCurrency(pris),
      dmtFormatted: formatSwedishCurrency(dmt),
      summaFormatted: formatSwedishCurrency(summa),
      t5Formatted: t5Count > 0 ? formatSwedishCurrency(t5) : "—",
      t5Count,
      differens: hasDifferens ? differens : null,
      differensFormatted: hasDifferens
        ? formatSwedishCurrency(differens)
        : "—",
    };
  }, [filteredRows]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div
          className={`${deckClass} flex items-center sm:col-span-2 xl:col-span-1`}
        >
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b8b8b8]"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök i alla kolumner…"
              className="h-10 border-[#3a3a3a] bg-[#202020] pl-9 text-white placeholder:text-[#b8b8b8] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
            />
          </div>
        </div>
        <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}>
          <p className="text-sm text-[#b8b8b8]">Totalt Pris</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#eb6e08]">
            {totals.prisFormatted}
          </p>
          <p className="mt-1 text-xs text-[#b8b8b8]">
            {filteredRows.length} av {rows.length} rader
          </p>
        </article>
        <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}>
          <p className="text-sm text-[#b8b8b8]">Totalt DMT</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#eb6e08]">
            {totals.dmtFormatted}
          </p>
        </article>
        <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}>
          <p className="text-sm text-[#b8b8b8]">Totalt Summa</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#eb6e08]">
            {totals.summaFormatted}
          </p>
        </article>
        <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}>
          <p className="text-sm text-[#b8b8b8]">Totalt T5</p>
          <p
            className={cn(
              "mt-2 text-xl font-bold tabular-nums",
              totals.t5Formatted === "—" ? "text-[#b8b8b8]" : "text-[#eb6e08]"
            )}
          >
            {totals.t5Formatted}
          </p>
          <p className="mt-1 text-xs text-[#b8b8b8]">
            {totals.t5Count === 0
              ? "Inga T5-värden ännu"
              : `${totals.t5Count} med T5`}
          </p>
        </article>
        <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}>
          <p className="text-sm text-[#b8b8b8]">Totalt Differens</p>
          <p
            className={cn(
              "mt-2 text-xl font-bold tabular-nums",
              differensClass(totals.differens)
            )}
          >
            {totals.differensFormatted}
          </p>
          <p className="mt-1 text-xs text-[#b8b8b8]">T5 − Summa</p>
        </article>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="h-[min(70vh,720px)] overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-left text-xs">
            <colgroup>
              <col className="w-[7rem]" />
              <col className="w-[7rem]" />
              <col className="w-[7rem]" />
              <col className="w-[8rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col className="w-[7rem]" />
              <col className="w-[6.5rem]" />
              <col className="w-[7rem]" />
              <col className="w-[7.5rem]" />
              <col className="w-[6.5rem]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#eb6e08]">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    title={column.title}
                    className={`px-2 py-2 font-semibold text-white whitespace-nowrap ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-16 text-center text-sm text-[#b8b8b8]"
                  >
                    {search.trim()
                      ? "Inga rader matchar sökningen."
                      : "Inga rader att visa."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-t border-[#3a3a3a] ${
                      index % 2 === 0 ? "bg-[#242424]" : "bg-[#202020]"
                    }`}
                  >
                    {COLUMNS.map((column) => {
                      const value = String(row[column.key] ?? "—");
                      const isDifferens = column.key === "differensFormatted";
                      const isT5 = column.key === "t5Formatted";

                      if (isT5) {
                        return (
                          <td
                            key={column.key}
                            className="overflow-hidden px-1.5 py-1 whitespace-nowrap text-right"
                          >
                            <EditableT5Cell
                              rowId={row.id}
                              value={row.t5}
                              onChange={onT5Change}
                            />
                          </td>
                        );
                      }

                      const isCopyable =
                        column.key === "ordernr" || column.key === "frs";
                      const isTextColumn =
                        column.key === "datum" ||
                        column.key === "frs" ||
                        column.key === "ordernr" ||
                        column.key === "lastort" ||
                        column.key === "mottagare" ||
                        column.key === "lossort";

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "overflow-hidden px-2 py-1",
                            column.align === "right"
                              ? "whitespace-nowrap text-right tabular-nums"
                              : "max-w-0",
                            isDifferens
                              ? differensClass(row.differens)
                              : "text-white"
                          )}
                          title={
                            isDifferens && row.differens !== null
                              ? "T5 − Summa"
                              : isCopyable
                                ? undefined
                                : value || undefined
                          }
                        >
                          {isCopyable ? (
                            <CopyableText
                              value={value || "—"}
                              label={
                                column.key === "ordernr" ? "Ordernr" : "FRS"
                              }
                            />
                          ) : isTextColumn ? (
                            <span className="block truncate">
                              {value.trim() ? value : "—"}
                            </span>
                          ) : (
                            value || "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#3a3a3a] bg-[#202020] px-4 py-3">
          <p className="text-sm text-[#b8b8b8]">
            Visar{" "}
            <span className="font-medium text-white">
              {filteredRows.length}
            </span>
            {search.trim() ? (
              <>
                {" "}
                av{" "}
                <span className="font-medium text-white">{rows.length}</span>
              </>
            ) : null}{" "}
            rader
            {" · "}
            <span className="text-[#4ade80]">Differens +</span>
            {" / "}
            <span className="text-[#fca5a5]">Differens −</span>
            {" = T5 − Summa"}
            {" · "}
            T5 är redigerbar
          </p>
        </div>
      </div>
    </section>
  );
}
