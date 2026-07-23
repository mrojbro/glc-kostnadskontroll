"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { HlpDistributionFilters } from "@/components/hlp-distribution/HlpDistributionFilters";
import { EmptyState } from "@/components/EmptyState";
import {
  RowCommentInput,
  RowStatusButtons,
} from "@/components/RowReviewControls";
import { formatSwedishCurrency } from "@/lib/formatters";
import type { HlpDistributionRow } from "@/lib/hlpDistribution/types";
import type { RowCommentMap, RowStatus, RowStatusMap } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterableColumn =
  | "avgangsdatum"
  | "fraktsedeln"
  | "ordernr"
  | "avsandare"
  | "terminal"
  | "mottagare"
  | "pall"
  | "flm"
  | "vikt"
  | "summa";

type ReviewTableMeta = {
  rowStatus: RowStatusMap;
  rowComments: RowCommentMap;
  setStatus: (rowId: string, status: RowStatus) => void;
  setComment: (rowId: string, value: string) => void;
};

interface HlpDistributionTableProps {
  rows: HlpDistributionRow[];
  totalSummaFormatted: string;
  rowCount: number;
  rowStatus: RowStatusMap;
  onRowStatusChange: (next: RowStatusMap) => void;
  rowComments: RowCommentMap;
  onRowCommentsChange: (next: RowCommentMap) => void;
}

const DEFAULT_SORTING: SortingState = [
  { id: "avgangsdatum", desc: false },
  { id: "mottagare", desc: false },
];

const FILTERABLE_COLUMNS: FilterableColumn[] = [
  "avgangsdatum",
  "fraktsedeln",
  "ordernr",
  "avsandare",
  "terminal",
  "mottagare",
  "pall",
  "flm",
  "vikt",
  "summa",
];

const FILTER_LABELS: Record<FilterableColumn, string> = {
  avgangsdatum: "Avgångsdatum",
  fraktsedeln: "Fraktsedeln",
  ordernr: "Ordernr",
  avsandare: "Avsändare",
  terminal: "Terminal",
  mottagare: "Mottagare",
  pall: "Pall",
  flm: "FLM",
  vikt: "Vikt",
  summa: "Summa",
};

function multiSelectFilter(
  row: { getValue: (columnId: string) => unknown; original: HlpDistributionRow },
  columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as string[] | undefined;
  if (!selected || selected.length === 0) return true;

  const key = getFilterDisplayValue(
    row.original,
    columnId as FilterableColumn
  );
  return selected.includes(key);
}

function getFilterDisplayValue(
  row: HlpDistributionRow,
  columnId: FilterableColumn
): string {
  switch (columnId) {
    case "avgangsdatum":
      return row.avgangsdatum.trim() || EMPTY_VALUE;
    case "fraktsedeln":
      return row.fraktsedeln.trim() || EMPTY_VALUE;
    case "ordernr":
      return row.ordernr.trim() || EMPTY_VALUE;
    case "avsandare":
      return row.avsandare.trim() || EMPTY_VALUE;
    case "terminal":
      return row.terminal.trim() || EMPTY_VALUE;
    case "mottagare":
      return row.mottagare.trim() || EMPTY_VALUE;
    case "pall":
      return row.pallFormatted.trim() || EMPTY_VALUE;
    case "flm":
      return row.flmFormatted.trim() || EMPTY_VALUE;
    case "vikt":
      return row.viktFormatted.trim() || EMPTY_VALUE;
    case "summa":
      return row.summaFormatted.trim() || EMPTY_VALUE;
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
  rows: HlpDistributionRow[],
  key: FilterableColumn
): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    values.add(getFilterDisplayValue(row, key));
  }
  return sortFilterOptions(Array.from(values));
}

function rowMatchesGlobalSearch(
  row: HlpDistributionRow,
  query: string,
  comments: RowCommentMap
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const values = [
    row.avgangsdatum,
    row.fraktsedeln,
    row.ordernr,
    row.avsandare,
    row.terminal,
    row.mottagare,
    row.pallFormatted,
    row.flmFormatted,
    row.viktFormatted,
    row.summaFormatted,
    comments[row.id] ?? "",
  ];

  return values.some((value) =>
    String(value).toLowerCase().includes(normalized)
  );
}

function rowMatchesOtherColumnFilters(
  row: HlpDistributionRow,
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

export function HlpDistributionTable({
  rows,
  totalSummaFormatted,
  rowCount,
  rowStatus,
  onRowStatusChange,
  rowComments,
  onRowCommentsChange,
}: HlpDistributionTableProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    setColumnFilters([]);
    setGlobalFilter("");
    setSorting(DEFAULT_SORTING);
  }, [rows]);

  const rowStatusRef = useRef(rowStatus);
  const rowCommentsRef = useRef(rowComments);
  rowStatusRef.current = rowStatus;
  rowCommentsRef.current = rowComments;

  const setStatus = useCallback(
    (rowId: string, status: RowStatus) => {
      const next = { ...rowStatusRef.current };
      if (next[rowId] === status) {
        delete next[rowId];
      } else {
        next[rowId] = status;
      }
      onRowStatusChange(next);
    },
    [onRowStatusChange]
  );

  const setComment = useCallback(
    (rowId: string, value: string) => {
      const next = { ...rowCommentsRef.current };
      if (value.trim() === "") {
        delete next[rowId];
      } else {
        next[rowId] = value;
      }
      onRowCommentsChange(next);
    },
    [onRowCommentsChange]
  );

  const filterOptions = useMemo(() => {
    const options = {} as Record<FilterableColumn, string[]>;
    for (const key of FILTERABLE_COLUMNS) {
      const scopedRows = rows.filter(
        (row) =>
          rowMatchesGlobalSearch(row, globalFilter, rowComments) &&
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
  }, [rows, columnFilters, globalFilter, rowComments]);

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

  const columns = useMemo<ColumnDef<HlpDistributionRow>[]>(
    () => [
      {
        accessorKey: "avgangsdatum",
        header: "Avgångsdatum",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "fraktsedeln",
        header: "Fraktsedeln",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          const highlight = info.row.original.highlightFraktsedel;
          return (
            <span
              title={
                highlight ? "Delar Fraktsedel med Tillägg" : undefined
              }
              className={cn(
                "inline-block rounded-md px-2 py-0.5",
                highlight
                  ? "bg-[#eb6e08]/25 font-medium text-[#f0a35a] ring-1 ring-[#eb6e08]/40"
                  : "text-white"
              )}
            >
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "ordernr",
        header: "Ordernr",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "avsandare",
        header: "Avsändare",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[11rem] truncate" title={value}>
              {value || <span className="text-[#6a6a6a]">—</span>}
            </span>
          );
        },
      },
      {
        accessorKey: "terminal",
        header: "Terminal",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return value ? (
            value
          ) : (
            <span className="text-[#6a6a6a]">—</span>
          );
        },
      },
      {
        accessorKey: "mottagare",
        header: "Mottagare",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          if (value === "Tillägg") {
            return (
              <span className="inline-block rounded-md bg-[#eab308]/20 px-2 py-0.5 font-medium text-[#facc15] ring-1 ring-[#eab308]/40">
                Tillägg
              </span>
            );
          }
          return (
            <span className="block max-w-[11rem] truncate" title={value}>
              {value || <span className="text-[#6a6a6a]">—</span>}
            </span>
          );
        },
      },
      {
        id: "pall",
        accessorFn: (row) => row.pall ?? Number.NEGATIVE_INFINITY,
        header: "Pall",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.pallFormatted}</span>
        ),
        sortingFn: "basic",
      },
      {
        id: "flm",
        accessorFn: (row) => row.flm ?? Number.NEGATIVE_INFINITY,
        header: "FLM",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.flmFormatted}</span>
        ),
        sortingFn: "basic",
      },
      {
        id: "vikt",
        accessorFn: (row) => row.vikt ?? Number.NEGATIVE_INFINITY,
        header: "Vikt",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.viktFormatted}</span>
        ),
        sortingFn: "basic",
      },
      {
        id: "summa",
        accessorKey: "summa",
        header: "Summa",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <span className="inline-block rounded-md bg-[#22c55e]/20 px-2 py-0.5 font-medium tabular-nums text-[#4ade80] ring-1 ring-[#4ade80]/35">
            {info.row.original.summaFormatted}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row, table }) => {
          const meta = table.options.meta as ReviewTableMeta;
          return (
            <RowStatusButtons
              rowId={row.original.id}
              status={meta.rowStatus[row.original.id]}
              onChange={meta.setStatus}
            />
          );
        },
      },
      {
        id: "kommentar",
        header: "Kommentar",
        enableSorting: false,
        cell: ({ row, table }) => {
          const meta = table.options.meta as ReviewTableMeta;
          return (
            <RowCommentInput
              rowId={row.original.id}
              value={meta.rowComments[row.original.id] ?? ""}
              onChange={meta.setComment}
            />
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    meta: {
      rowStatus,
      rowComments,
      setStatus,
      setComment,
    } satisfies ReviewTableMeta,
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
      rowMatchesGlobalSearch(
        row.original,
        String(filterValue),
        rowComments
      ),
  });

  const visibleRows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const filteredSumma = filteredRows.reduce(
    (sum, row) => sum + row.original.summa,
    0
  );
  const displayTotal =
    globalFilter.trim() === "" && columnFilters.length === 0
      ? totalSummaFormatted
      : formatSwedishCurrency(filteredSumma);
  const displayCount =
    globalFilter.trim() === "" && columnFilters.length === 0
      ? rowCount
      : filteredRows.length;

  const okCount = Object.values(rowStatus).filter((s) => s === "ok").length;
  const checkCount = Object.values(rowStatus).filter(
    (s) => s === "check"
  ).length;

  const handleReset = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setSorting(DEFAULT_SORTING);
  };

  return (
    <section className="space-y-4">
      <HlpDistributionFilters
        search={globalFilter}
        onSearchChange={setGlobalFilter}
        onReset={handleReset}
        rowCount={displayCount}
        totalCount={rowCount}
        totalSummaFormatted={displayTotal}
        okCount={okCount}
        checkCount={checkCount}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Inga rader"
          description="Inga rader hittades i Excel-filen."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="h-[min(70vh,720px)] overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
            <table className="w-full min-w-[1360px] table-fixed border-collapse text-left text-xs">
              <colgroup>
                <col className="w-[7.5rem]" />
                <col className="w-[7rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[10rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[10rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[5rem]" />
                <col className="w-[7rem]" />
                <col className="w-[5rem]" />
                <col className="w-[11rem]" />
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
                      colSpan={12}
                      className="px-4 py-16 text-center text-sm text-[#b8b8b8]"
                    >
                      Ingen rad matchar din sökning eller dina filter. Prova att
                      återställa.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, index) => {
                    const status = rowStatus[row.original.id];
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t border-[#3a3a3a]",
                          status === "ok" && "bg-[#1a2e22] hover:bg-[#203528]",
                          status === "check" &&
                            "bg-[#2e2a18] hover:bg-[#35301c]",
                          !status &&
                            (index % 2 === 0 ? "bg-[#242424]" : "bg-[#202020]"),
                          !status && "hover:bg-[#2a2218]"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-2 py-2 whitespace-nowrap text-white"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
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
              {" · "}
              <span className="text-[#4ade80]">OK {okCount}</span>
              {" · "}
              <span className="text-[#eab308]">Kontroll {checkCount}</span>
            </p>
            <p className="text-sm">
              <span className="text-[#b8b8b8]">Totalt Summa: </span>
              <span className="font-semibold tabular-nums text-[#eb6e08]">
                {displayTotal}
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
