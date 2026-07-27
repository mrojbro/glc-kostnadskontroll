"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ColumnFilterDropdown,
  EMPTY_VALUE,
} from "@/components/ColumnFilterDropdown";
import {
  buildDateEkipageSummaries,
  buildEkipage3ByButikSummaries,
  type CoopFruktDateEkipageSummary,
  type CoopFruktEkipage3ButikSummary,
} from "@/lib/coopFrukt/aggregates";
import type { CoopFruktRow } from "@/lib/coopFrukt/types";
import {
  formatSwedishCurrency,
  formatSwedishDecimal2,
} from "@/lib/formatters";

interface CoopFruktGroupSummaryProps {
  rows: CoopFruktRow[];
}

type EkipageFilterColumn = "avgangsdatum" | "ekipage" | "vikt" | "summa";
type ButikFilterColumn = "avgangsdatum" | "butiksnamn" | "vikt" | "summa";

type FilterState<T extends string> = Partial<Record<T, string[]>>;

function formatVikt(value: number | null): string {
  return value === null ? "—" : formatSwedishDecimal2(value);
}

function sortFilterOptions(values: string[]): string[] {
  return values.sort((a, b) => {
    if (a === EMPTY_VALUE) return -1;
    if (b === EMPTY_VALUE) return 1;
    return a.localeCompare(b, "sv", { numeric: true });
  });
}

function getEkipageFilterValue(
  item: CoopFruktDateEkipageSummary,
  columnId: EkipageFilterColumn
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
  }
}

function getButikFilterValue(
  item: CoopFruktEkipage3ButikSummary,
  columnId: ButikFilterColumn
): string {
  switch (columnId) {
    case "avgangsdatum":
      return item.avgangsdatum.trim() || EMPTY_VALUE;
    case "butiksnamn":
      return item.butiksnamn.trim() || EMPTY_VALUE;
    case "vikt":
      return item.totalVikt === null
        ? EMPTY_VALUE
        : formatSwedishDecimal2(item.totalVikt);
    case "summa":
      return formatSwedishCurrency(item.totalSumma);
  }
}

function matchesFilters<TItem, TCol extends string>(
  item: TItem,
  filters: FilterState<TCol>,
  columns: readonly TCol[],
  getValue: (item: TItem, columnId: TCol) => string,
  excludeColumnId?: TCol
): boolean {
  for (const columnId of columns) {
    if (excludeColumnId && columnId === excludeColumnId) continue;
    const selected = filters[columnId];
    if (!selected || selected.length === 0) continue;
    if (!selected.includes(getValue(item, columnId))) return false;
  }
  return true;
}

function SummaryCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <div className="border-b border-[#3a3a3a] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-[#b8b8b8]">{description}</p>
      </div>
      <div className="h-[min(60vh,640px)] overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
        {children}
      </div>
    </div>
  );
}

const EKIPAGE_COLUMNS = [
  "avgangsdatum",
  "ekipage",
  "vikt",
  "summa",
] as const satisfies readonly EkipageFilterColumn[];

const EKIPAGE_LABELS: Record<EkipageFilterColumn, string> = {
  avgangsdatum: "Datum",
  ekipage: "Ekipage",
  vikt: "Vikt",
  summa: "Summa",
};

const BUTIK_COLUMNS = [
  "avgangsdatum",
  "butiksnamn",
  "vikt",
  "summa",
] as const satisfies readonly ButikFilterColumn[];

const BUTIK_LABELS: Record<ButikFilterColumn, string> = {
  avgangsdatum: "Datum",
  butiksnamn: "Butiksnamn",
  vikt: "Vikt",
  summa: "Summa",
};

export function CoopFruktGroupSummary({ rows }: CoopFruktGroupSummaryProps) {
  const [ekipageFilters, setEkipageFilters] = useState<
    FilterState<EkipageFilterColumn>
  >({});
  const [butikFilters, setButikFilters] = useState<
    FilterState<ButikFilterColumn>
  >({});

  const ekipageSummaries = useMemo(
    () => buildDateEkipageSummaries(rows),
    [rows]
  );
  const ekipage3Summaries = useMemo(
    () => buildEkipage3ByButikSummaries(rows),
    [rows]
  );

  const ekipageFilterOptions = useMemo(() => {
    const options = {} as Record<EkipageFilterColumn, string[]>;
    for (const key of EKIPAGE_COLUMNS) {
      const scoped = ekipageSummaries.filter((item) =>
        matchesFilters(
          item,
          ekipageFilters,
          EKIPAGE_COLUMNS,
          getEkipageFilterValue,
          key
        )
      );
      const available = sortFilterOptions(
        Array.from(
          new Set(scoped.map((item) => getEkipageFilterValue(item, key)))
        )
      );
      const selected = ekipageFilters[key] ?? [];
      options[key] = sortFilterOptions(
        Array.from(new Set([...available, ...selected]))
      );
    }
    return options;
  }, [ekipageSummaries, ekipageFilters]);

  const butikFilterOptions = useMemo(() => {
    const options = {} as Record<ButikFilterColumn, string[]>;
    for (const key of BUTIK_COLUMNS) {
      const scoped = ekipage3Summaries.filter((item) =>
        matchesFilters(
          item,
          butikFilters,
          BUTIK_COLUMNS,
          getButikFilterValue,
          key
        )
      );
      const available = sortFilterOptions(
        Array.from(
          new Set(scoped.map((item) => getButikFilterValue(item, key)))
        )
      );
      const selected = butikFilters[key] ?? [];
      options[key] = sortFilterOptions(
        Array.from(new Set([...available, ...selected]))
      );
    }
    return options;
  }, [ekipage3Summaries, butikFilters]);

  const filteredEkipage = useMemo(
    () =>
      ekipageSummaries.filter((item) =>
        matchesFilters(
          item,
          ekipageFilters,
          EKIPAGE_COLUMNS,
          getEkipageFilterValue
        )
      ),
    [ekipageSummaries, ekipageFilters]
  );

  const filteredButik = useMemo(
    () =>
      ekipage3Summaries.filter((item) =>
        matchesFilters(item, butikFilters, BUTIK_COLUMNS, getButikFilterValue)
      ),
    [ekipage3Summaries, butikFilters]
  );

  const setEkipageSelected = useCallback(
    (columnId: EkipageFilterColumn, selected: string[]) => {
      setEkipageFilters((prev) => {
        const next = { ...prev };
        if (selected.length === 0) delete next[columnId];
        else next[columnId] = selected;
        return next;
      });
    },
    []
  );

  const setButikSelected = useCallback(
    (columnId: ButikFilterColumn, selected: string[]) => {
      setButikFilters((prev) => {
        const next = { ...prev };
        if (selected.length === 0) delete next[columnId];
        else next[columnId] = selected;
        return next;
      });
    },
    []
  );

  if (rows.length === 0 || ekipageSummaries.length === 0) return null;

  const ekipageTotalVikt = filteredEkipage.reduce<number | null>((sum, item) => {
    if (item.totalVikt === null) return sum;
    return (sum ?? 0) + item.totalVikt;
  }, null);
  const ekipageTotalSumma = filteredEkipage.reduce(
    (sum, item) => sum + item.totalSumma,
    0
  );

  const ekipage3TotalVikt = filteredButik.reduce<number | null>((sum, item) => {
    if (item.totalVikt === null) return sum;
    return (sum ?? 0) + item.totalVikt;
  }, null);
  const ekipage3TotalSumma = filteredButik.reduce(
    (sum, item) => sum + item.totalSumma,
    0
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SummaryCard
        title="Per dag och ekipage"
        description="Total Vikt och Summa för varje Avgångsdatum och Ekipage. Använd kolumnfilter för att begränsa."
      >
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#eb6e08]">
            <tr>
              {EKIPAGE_COLUMNS.map((columnId) => {
                const isNumeric = columnId === "vikt" || columnId === "summa";
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
                      <span>{EKIPAGE_LABELS[columnId]}</span>
                      <ColumnFilterDropdown
                        label={EKIPAGE_LABELS[columnId]}
                        options={ekipageFilterOptions[columnId]}
                        selected={ekipageFilters[columnId] ?? []}
                        onChange={(selected) =>
                          setEkipageSelected(columnId, selected)
                        }
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredEkipage.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-[#b8b8b8]"
                >
                  Ingen rad matchar dina filter.
                </td>
              </tr>
            ) : (
              filteredEkipage.map((item) => (
                <tr
                  key={`${item.avgangsdatum}-${item.ekipage}`}
                  className="border-t border-[#3a3a3a] even:bg-[#202020] odd:bg-[#242424]"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap text-white">
                    {item.avgangsdatum}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-white">
                    {item.ekipage}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white">
                    {formatVikt(item.totalVikt)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white">
                    {formatSwedishCurrency(item.totalSumma)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#3a3a3a] bg-[#202020]">
              <td
                colSpan={2}
                className="px-3 py-3 text-sm font-semibold text-white"
              >
                Totalt
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-[#eb6e08]">
                {formatVikt(ekipageTotalVikt)}
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-[#eb6e08]">
                {formatSwedishCurrency(ekipageTotalSumma)}
              </td>
            </tr>
          </tfoot>
        </table>
      </SummaryCard>

      {ekipage3Summaries.length > 0 && (
        <SummaryCard
          title="Ekipage 3 per butik"
          description="Total Vikt och Summa för Ekipage 3, uppdelat per Avgångsdatum och Butiksnamn."
        >
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#eb6e08]">
              <tr>
                {BUTIK_COLUMNS.map((columnId) => {
                  const isNumeric = columnId === "vikt" || columnId === "summa";
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
                        <span>{BUTIK_LABELS[columnId]}</span>
                        <ColumnFilterDropdown
                          label={BUTIK_LABELS[columnId]}
                          options={butikFilterOptions[columnId]}
                          selected={butikFilters[columnId] ?? []}
                          onChange={(selected) =>
                            setButikSelected(columnId, selected)
                          }
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredButik.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-[#b8b8b8]"
                  >
                    Ingen rad matchar dina filter.
                  </td>
                </tr>
              ) : (
                filteredButik.map((item) => (
                  <tr
                    key={`${item.avgangsdatum}-${item.butiksnamn}`}
                    className="border-t border-[#3a3a3a] even:bg-[#202020] odd:bg-[#242424]"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-white">
                      {item.avgangsdatum}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-white">
                      {item.butiksnamn}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white">
                      {formatVikt(item.totalVikt)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white">
                      {formatSwedishCurrency(item.totalSumma)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#3a3a3a] bg-[#202020]">
                <td
                  colSpan={2}
                  className="px-3 py-3 text-sm font-semibold text-white"
                >
                  Totalt
                </td>
                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-[#eb6e08]">
                  {formatVikt(ekipage3TotalVikt)}
                </td>
                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-[#eb6e08]">
                  {formatSwedishCurrency(ekipage3TotalSumma)}
                </td>
              </tr>
            </tfoot>
          </table>
        </SummaryCard>
      )}
    </div>
  );
}
