"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ColumnFilterDropdown,
  EMPTY_VALUE,
} from "@/components/ColumnFilterDropdown";
import {
  formatSwedishCurrency,
  formatSwedishDecimal2,
} from "@/lib/formatters";
import type { CoopFruktDateEkipageSummary } from "@/lib/coopFrukt/aggregates";

type SummaryFilterColumn =
  | "avgangsdatum"
  | "ekipage"
  | "vikt"
  | "summa"
  | "rowCount";

const FILTERABLE_COLUMNS: SummaryFilterColumn[] = [
  "avgangsdatum",
  "ekipage",
  "vikt",
  "summa",
  "rowCount",
];

const FILTER_LABELS: Record<SummaryFilterColumn, string> = {
  avgangsdatum: "Avgångsdatum",
  ekipage: "Ekipage",
  vikt: "Vikt",
  summa: "Summa",
  rowCount: "Rader",
};

interface CoopFruktGroupSummaryProps {
  summaries: CoopFruktDateEkipageSummary[];
}

type SummaryFiltersState = Partial<Record<SummaryFilterColumn, string[]>>;

function getSummaryFilterValue(
  item: CoopFruktDateEkipageSummary,
  columnId: SummaryFilterColumn
): string {
  switch (columnId) {
    case "avgangsdatum":
      return item.avgangsdatum.trim() || EMPTY_VALUE;
    case "ekipage":
      return item.ekipage.trim() || EMPTY_VALUE;
    case "vikt":
      return item.totalVikt === null
        ? EMPTY_VALUE
        : formatSwedishDecimal2(item.totalVikt);
    case "summa":
      return formatSwedishCurrency(item.totalSumma);
    case "rowCount":
      return String(item.rowCount);
    default:
      return EMPTY_VALUE;
  }
}

function sortFilterOptions(values: string[]): string[] {
  return values.sort((a, b) => {
    if (a === EMPTY_VALUE) return -1;
    if (b === EMPTY_VALUE) return 1;
    return a.localeCompare(b, "sv", { numeric: true });
  });
}

function matchesSummaryFilters(
  item: CoopFruktDateEkipageSummary,
  filters: SummaryFiltersState
): boolean {
  for (const columnId of FILTERABLE_COLUMNS) {
    const selected = filters[columnId];
    if (!selected || selected.length === 0) continue;
    if (!selected.includes(getSummaryFilterValue(item, columnId))) return false;
  }
  return true;
}

function matchesOtherSummaryFilters(
  item: CoopFruktDateEkipageSummary,
  filters: SummaryFiltersState,
  excludeColumnId: SummaryFilterColumn
): boolean {
  for (const columnId of FILTERABLE_COLUMNS) {
    if (columnId === excludeColumnId) continue;
    const selected = filters[columnId];
    if (!selected || selected.length === 0) continue;
    if (!selected.includes(getSummaryFilterValue(item, columnId))) return false;
  }
  return true;
}

export function CoopFruktGroupSummary({
  summaries,
}: CoopFruktGroupSummaryProps) {
  const [columnFilters, setColumnFilters] = useState<SummaryFiltersState>({});

  const filterOptions = useMemo(() => {
    const options = {} as Record<SummaryFilterColumn, string[]>;
    for (const key of FILTERABLE_COLUMNS) {
      const scoped = summaries.filter((item) =>
        matchesOtherSummaryFilters(item, columnFilters, key)
      );
      const available = sortFilterOptions(
        Array.from(
          new Set(scoped.map((item) => getSummaryFilterValue(item, key)))
        )
      );
      const selected = columnFilters[key] ?? [];
      options[key] = sortFilterOptions(
        Array.from(new Set([...available, ...selected]))
      );
    }
    return options;
  }, [summaries, columnFilters]);

  const filteredSummaries = useMemo(
    () => summaries.filter((item) => matchesSummaryFilters(item, columnFilters)),
    [summaries, columnFilters]
  );

  const setSelected = useCallback(
    (columnId: SummaryFilterColumn, selected: string[]) => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        if (selected.length === 0) {
          delete next[columnId];
        } else {
          next[columnId] = selected;
        }
        return next;
      });
    },
    []
  );

  if (summaries.length === 0) return null;

  const totalVikt = filteredSummaries.reduce<number | null>((sum, item) => {
    if (item.totalVikt === null) return sum;
    return (sum ?? 0) + item.totalVikt;
  }, null);
  const totalSumma = filteredSummaries.reduce(
    (sum, item) => sum + item.totalSumma,
    0
  );
  const totalRows = filteredSummaries.reduce(
    (sum, item) => sum + item.rowCount,
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <div className="border-b border-[#3a3a3a] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          Sammanfattning per datum och ekipage
        </h2>
        <p className="mt-0.5 text-xs text-[#b8b8b8]">
          Visar total Vikt och Summa för varje kombination av Avgångsdatum och
          Ekipage.
        </p>
      </div>

      <div className="max-h-72 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#eb6e08]">
            <tr>
              {FILTERABLE_COLUMNS.map((columnId) => {
                const isNumeric =
                  columnId === "vikt" ||
                  columnId === "summa" ||
                  columnId === "rowCount";

                return (
                  <th
                    key={columnId}
                    className={`px-3 py-2.5 font-semibold text-white whitespace-nowrap ${
                      isNumeric ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-0.5 ${
                        isNumeric ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span>{FILTER_LABELS[columnId]}</span>
                      <ColumnFilterDropdown
                        label={FILTER_LABELS[columnId]}
                        options={filterOptions[columnId]}
                        selected={columnFilters[columnId] ?? []}
                        onChange={(selected) => setSelected(columnId, selected)}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredSummaries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-[#b8b8b8]"
                >
                  Ingen rad matchar dina filter i sammanfattningen.
                </td>
              </tr>
            ) : (
              filteredSummaries.map((item) => (
                <tr
                  key={`${item.avgangsdatum}-${item.ekipage}`}
                  className="border-t border-[#3a3a3a] even:bg-[#202020] odd:bg-[#242424]"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-white">
                    {item.avgangsdatum}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-white">
                    {item.ekipage}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white">
                    {item.totalVikt === null
                      ? "—"
                      : formatSwedishDecimal2(item.totalVikt)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white">
                    {formatSwedishCurrency(item.totalSumma)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#b8b8b8]">
                    {item.rowCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#3a3a3a] bg-[#202020]">
              <td
                colSpan={2}
                className="px-3 py-2.5 text-sm font-semibold text-white"
              >
                Totalt
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[#eb6e08]">
                {totalVikt === null ? "—" : formatSwedishDecimal2(totalVikt)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[#eb6e08]">
                {formatSwedishCurrency(totalSumma)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[#b8b8b8]">
                {totalRows}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
