"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  ColumnFilterDropdown,
  EMPTY_VALUE,
} from "@/components/ColumnFilterDropdown";
import {
  KrickosColorLegend,
  rowMatchesKrickosLegend,
  type KrickosLegendCounts,
  type KrickosLegendFilterKey,
} from "@/components/krickos/KrickosColorLegend";
import { KrickosFilters } from "@/components/krickos/KrickosFilters";
import { StatusPill } from "@/components/krickos/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { formatSwedishCurrency } from "@/lib/formatters";
import type { KrickosRow } from "@/lib/krickos/types";
import { cn } from "@/lib/utils";

type FilterableColumn =
  | "datum"
  | "ordernr"
  | "betalare"
  | "fraktsedelsnummer"
  | "klarFakturering"
  | "orderstatus"
  | "intakter"
  | "tg"
  | "tb"
  | "resurs"
  | "mottNamn"
  | "mottOrt"
  | "gods";

interface KrickosTableProps {
  rows: KrickosRow[];
  totalIntakterFormatted: string;
  totalResursFormatted: string;
  rowCount: number;
}

const DEFAULT_SORTING: SortingState = [
  { id: "datum", desc: false },
  { id: "ordernr", desc: false },
];

const FILTERABLE_COLUMNS: FilterableColumn[] = [
  "datum",
  "ordernr",
  "betalare",
  "fraktsedelsnummer",
  "klarFakturering",
  "orderstatus",
  "intakter",
  "tg",
  "tb",
  "resurs",
  "mottNamn",
  "mottOrt",
  "gods",
];

const FILTER_LABELS: Record<FilterableColumn, string> = {
  datum: "Datum",
  ordernr: "Ordernr",
  betalare: "Betalare",
  fraktsedelsnummer: "FRS",
  klarFakturering: "KlarFakt",
  orderstatus: "Orderstatus",
  intakter: "Intäkter",
  tg: "TG",
  tb: "TB",
  resurs: "Resurs",
  mottNamn: "Mott namn",
  mottOrt: "Mott Ort",
  gods: "Gods",
};

type StatusTone = "ok" | "bad" | "neutral";

function isNyOrderstatus(orderstatus: string): boolean {
  return orderstatus.trim().toLowerCase() === "ny";
}

/** When Orderstatus is Ny, force related review columns to red. */
function toneForReviewColumn(
  row: KrickosRow,
  tone: StatusTone
): StatusTone {
  if (isNyOrderstatus(row.orderstatus)) return "bad";
  return tone;
}

function multiSelectFilter(
  row: { original: KrickosRow },
  columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as string[] | undefined;
  if (!selected || selected.length === 0) return true;
  return selected.includes(
    getFilterDisplayValue(row.original, columnId as FilterableColumn)
  );
}

function getFilterDisplayValue(
  row: KrickosRow,
  columnId: FilterableColumn
): string {
  switch (columnId) {
    case "datum":
      return row.datum.trim() || EMPTY_VALUE;
    case "ordernr":
      return row.ordernr.trim() || EMPTY_VALUE;
    case "betalare":
      return row.betalare.trim() || EMPTY_VALUE;
    case "fraktsedelsnummer":
      return row.fraktsedelsnummer.trim() || EMPTY_VALUE;
    case "klarFakturering":
      return row.klarFaktureringLabel;
    case "orderstatus":
      return row.orderstatus.trim() || EMPTY_VALUE;
    case "intakter":
      return row.intakterFormatted.trim() || EMPTY_VALUE;
    case "tg":
      return row.tgFormatted.trim() || EMPTY_VALUE;
    case "tb":
      return row.tbFormatted.trim() || EMPTY_VALUE;
    case "resurs":
      return row.resursFormatted.trim() || EMPTY_VALUE;
    case "mottNamn":
      return row.mottNamn.trim() || EMPTY_VALUE;
    case "mottOrt":
      return row.mottOrt.trim() || EMPTY_VALUE;
    case "gods":
      return row.gods.trim() || EMPTY_VALUE;
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

function uniqueColumnOptions(
  rows: KrickosRow[],
  key: FilterableColumn
): string[] {
  const values = new Set<string>();
  for (const row of rows) values.add(getFilterDisplayValue(row, key));
  return sortFilterOptions(Array.from(values));
}

function rowMatchesGlobalSearch(row: KrickosRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const values = [
    row.datum,
    row.ordernr,
    row.betalare,
    row.littera,
    row.fraktsedelsnummer,
    row.klarFaktureringLabel,
    row.orderstatus,
    row.intakterFormatted,
    row.tgFormatted,
    row.tbFormatted,
    row.resursFormatted,
    row.mottNamn,
    row.mottOrt,
    row.gods,
  ];
  return values.some((value) =>
    String(value).toLowerCase().includes(normalized)
  );
}

function rowMatchesOtherColumnFilters(
  row: KrickosRow,
  filters: ColumnFiltersState,
  excludeColumnId: FilterableColumn
): boolean {
  for (const filter of filters) {
    if (filter.id === excludeColumnId) continue;
    const selected = filter.value as string[] | undefined;
    if (!selected || selected.length === 0) continue;
    const key = getFilterDisplayValue(row, filter.id as FilterableColumn);
    if (!selected.includes(key)) return false;
  }
  return true;
}

export function KrickosTable({
  rows,
  totalIntakterFormatted,
  totalResursFormatted,
  rowCount,
}: KrickosTableProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [legendFilter, setLegendFilter] =
    useState<KrickosLegendFilterKey | null>(null);

  useEffect(() => {
    setColumnFilters([]);
    setGlobalFilter("");
    setSorting(DEFAULT_SORTING);
    setLegendFilter(null);
  }, [rows]);

  const tableRows = useMemo(() => {
    if (!legendFilter) return rows;
    return rows.filter((row) => rowMatchesKrickosLegend(row, legendFilter));
  }, [rows, legendFilter]);

  const filterOptions = useMemo(() => {
    const options = {} as Record<FilterableColumn, string[]>;
    for (const key of FILTERABLE_COLUMNS) {
      const scopedRows = tableRows.filter(
        (row) =>
          rowMatchesGlobalSearch(row, globalFilter) &&
          rowMatchesOtherColumnFilters(row, columnFilters, key)
      );
      const available = uniqueColumnOptions(scopedRows, key);
      const selected =
        (columnFilters.find((item) => item.id === key)?.value as
          | string[]
          | undefined) ?? [];
      options[key] = sortFilterOptions(
        Array.from(new Set([...available, ...selected]))
      );
    }
    return options;
  }, [tableRows, columnFilters, globalFilter]);

  const getSelected = useCallback(
    (columnId: FilterableColumn): string[] => {
      const filter = columnFilters.find((item) => item.id === columnId);
      return (filter?.value as string[] | undefined) ?? [];
    },
    [columnFilters]
  );

  const setSelected = useCallback(
    (columnId: FilterableColumn, selected: string[]) => {
      setColumnFilters((prev) => {
        const without = prev.filter((item) => item.id !== columnId);
        if (selected.length === 0) return without;
        return [...without, { id: columnId, value: selected }];
      });
    },
    []
  );

  const columns = useMemo<ColumnDef<KrickosRow>[]>(
    () => [
      {
        accessorKey: "datum",
        header: "Datum",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "ordernr",
        header: "Ordernr",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "betalare",
        header: "Betalare",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[6rem] truncate" title={value}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "fraktsedelsnummer",
        header: "FRS",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        id: "klarFakturering",
        accessorFn: (row) => row.klarFaktureringLabel,
        header: "KlarFakt",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <StatusPill
            tone={toneForReviewColumn(
              info.row.original,
              info.row.original.klarFakturering ? "ok" : "bad"
            )}
          >
            {info.row.original.klarFaktureringLabel}
          </StatusPill>
        ),
      },
      {
        accessorKey: "orderstatus",
        header: "Orderstatus",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const row = info.row.original;
          return (
            <StatusPill
              tone={row.orderstatusOk ? "ok" : "bad"}
              title={row.orderstatus}
            >
              {row.orderstatus || "—"}
            </StatusPill>
          );
        },
      },
      {
        id: "intakter",
        accessorFn: (row) => row.intakter,
        header: "Intäkter",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <StatusPill
            tone={toneForReviewColumn(
              info.row.original,
              info.row.original.intakterOk ? "ok" : "bad"
            )}
            className="tabular-nums"
          >
            {info.row.original.intakterFormatted}
          </StatusPill>
        ),
        sortingFn: "basic",
      },
      {
        id: "tg",
        accessorFn: (row) => row.tg ?? Number.NEGATIVE_INFINITY,
        header: "TG",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const row = info.row.original;
          const value = row.tg;
          const tone: StatusTone =
            value === null ? "neutral" : value >= 0 ? "ok" : "bad";
          return (
            <StatusPill
              tone={toneForReviewColumn(row, tone)}
              className="tabular-nums"
            >
              {row.tgFormatted || "—"}
            </StatusPill>
          );
        },
        sortingFn: "basic",
      },
      {
        id: "tb",
        accessorFn: (row) => row.tb ?? Number.NEGATIVE_INFINITY,
        header: "TB",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const row = info.row.original;
          const value = row.tb;
          const tone: StatusTone =
            value === null ? "neutral" : value >= 0 ? "ok" : "bad";
          return (
            <StatusPill
              tone={toneForReviewColumn(row, tone)}
              className="tabular-nums"
            >
              {row.tbFormatted || "—"}
            </StatusPill>
          );
        },
        sortingFn: "basic",
      },
      {
        id: "resurs",
        accessorFn: (row) => row.resurs,
        header: "Resurs",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const row = info.row.original;
          return (
            <StatusPill
              tone={toneForReviewColumn(
                row,
                row.resurs >= 0 ? "ok" : "bad"
              )}
              className="tabular-nums"
            >
              {row.resursFormatted}
            </StatusPill>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "mottNamn",
        header: "Mott namn",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[13rem] truncate" title={value}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "mottOrt",
        header: "Mott Ort",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "gods",
        header: "Gods",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[8rem] truncate" title={value}>
              {value}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: tableRows,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableMultiSort: true,
    globalFilterFn: (row, _columnId, filterValue) =>
      rowMatchesGlobalSearch(row.original, String(filterValue)),
  });

  const visibleRows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const filteredIntakter = filteredRows.reduce(
    (sum, row) => sum + row.original.intakter,
    0
  );
  const filteredResurs = filteredRows.reduce(
    (sum, row) => sum + row.original.resurs,
    0
  );
  const hasActiveFilters =
    globalFilter.trim() !== "" ||
    columnFilters.length > 0 ||
    legendFilter !== null;
  const displayTotal = !hasActiveFilters
    ? totalIntakterFormatted
    : formatSwedishCurrency(filteredIntakter);
  const displayTotalResurs = !hasActiveFilters
    ? totalResursFormatted
    : formatSwedishCurrency(filteredResurs);
  const displayTotalKrickos = formatSwedishCurrency(filteredResurs * 0.9);
  const displayCount = !hasActiveFilters ? rowCount : filteredRows.length;

  const legendCounts = useMemo((): KrickosLegendCounts => {
    const counts: KrickosLegendCounts = {
      klarFaktJa: 0,
      klarFaktNej: 0,
      orderstatusOk: 0,
      orderstatusBad: 0,
      intakterOk: 0,
      intakterBad: 0,
      tgTbOk: 0,
      tgTbBad: 0,
    };

    for (const row of rows) {
      if (row.klarFakturering) counts.klarFaktJa += 1;
      else counts.klarFaktNej += 1;

      if (row.orderstatusOk) counts.orderstatusOk += 1;
      else counts.orderstatusBad += 1;

      if (row.intakterOk) counts.intakterOk += 1;
      else counts.intakterBad += 1;

      const tgNegative = row.tg !== null && row.tg < 0;
      const tbNegative = row.tb !== null && row.tb < 0;
      if (tgNegative || tbNegative) counts.tgTbBad += 1;
      else counts.tgTbOk += 1;
    }

    return counts;
  }, [rows]);

  const handleReset = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setLegendFilter(null);
    setSorting(DEFAULT_SORTING);
  };

  return (
    <section className="space-y-4">
      <KrickosFilters
        search={globalFilter}
        onSearchChange={setGlobalFilter}
        onReset={handleReset}
        rowCount={displayCount}
        totalCount={rowCount}
        totalIntakterFormatted={displayTotal}
        totalResursFormatted={displayTotalResurs}
        totalKrickosFormatted={displayTotalKrickos}
      />

      <KrickosColorLegend
        counts={legendCounts}
        activeFilter={legendFilter}
        onFilterChange={setLegendFilter}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Inga rader"
          description="Inga rader hittades i Excel-filen."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="h-[min(70vh,720px)] overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
            <table className="w-full min-w-[1400px] table-fixed border-collapse text-left text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[6rem]" />
                <col className="w-[14rem]" />
                <col className="w-[5.5rem]" />
                <col className="w-[5.5rem]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-[#eb6e08]">
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted();
                      const canSort = header.column.getCanSort();
                      const columnId = header.column.id as FilterableColumn;
                      const isFilterable =
                        FILTERABLE_COLUMNS.includes(columnId);

                      return (
                        <th
                          key={header.id}
                          className="px-2 py-2.5 font-semibold text-white whitespace-nowrap"
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center gap-0.5">
                              {canSort ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-0.5 rounded-md py-0.5 cursor-pointer hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {sorted === "asc" ? (
                                    <ArrowUp className="size-3" aria-hidden />
                                  ) : sorted === "desc" ? (
                                    <ArrowDown className="size-3" aria-hidden />
                                  ) : (
                                    <ArrowUpDown
                                      className="size-3 opacity-70"
                                      aria-hidden
                                    />
                                  )}
                                </button>
                              ) : (
                                <span>
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                              )}
                              {isFilterable && (
                                <ColumnFilterDropdown
                                  label={FILTER_LABELS[columnId]}
                                  options={filterOptions[columnId]}
                                  selected={getSelected(columnId)}
                                  onChange={(selected) =>
                                    setSelected(columnId, selected)
                                  }
                                />
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-16 text-center text-sm text-[#b8b8b8]"
                    >
                      Ingen rad matchar din sökning eller dina filter. Prova att
                      återställa.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t border-[#3a3a3a]",
                          index % 2 === 0 ? "bg-[#242424]" : "bg-[#202020]",
                          "hover:bg-[#2a2218]"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-2 py-2 text-left align-middle whitespace-nowrap text-white"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#3a3a3a] bg-[#202020] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#b8b8b8]">
              Visar{" "}
              <span className="font-medium text-white">{displayCount}</span>{" "}
              av <span className="font-medium text-white">{rowCount}</span>{" "}
              rader
            </p>
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-6">
              <p>
                <span className="text-[#b8b8b8]">Totalt Intäkter: </span>
                <span className="font-semibold tabular-nums text-[#eb6e08]">
                  {displayTotal}
                </span>
              </p>
              <p>
                <span className="text-[#b8b8b8]">Totalt Resurs: </span>
                <span className="font-semibold tabular-nums text-[#eb6e08]">
                  {displayTotalResurs}
                </span>
              </p>
              <p>
                <span className="text-[#b8b8b8]">Krickos: </span>
                <span className="font-semibold tabular-nums text-[#eb6e08]">
                  {displayTotalKrickos}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
