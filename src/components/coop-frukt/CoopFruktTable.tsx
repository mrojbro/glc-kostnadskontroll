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
import { CoopFruktFilters } from "@/components/coop-frukt/CoopFruktFilters";
import { EmptyState } from "@/components/EmptyState";
import { formatSwedishCurrency } from "@/lib/formatters";
import type { CoopFruktRow } from "@/lib/coopFrukt/types";
import type { RowCommentMap, RowStatus, RowStatusMap } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterableColumn =
  | "avgangsdatum"
  | "vecka"
  | "frs"
  | "ekipage"
  | "terminal"
  | "butiksnamn"
  | "postort"
  | "vikt"
  | "pris"
  | "summa";

interface CoopFruktTableProps {
  rows: CoopFruktRow[];
  totalSummaFormatted: string;
  rowCount: number;
  rowStatus: RowStatusMap;
  onRowStatusChange: (next: RowStatusMap) => void;
  rowComments: RowCommentMap;
  onRowCommentsChange: (next: RowCommentMap) => void;
}

const DEFAULT_SORTING: SortingState = [
  { id: "avgangsdatum", desc: false },
  { id: "butiksnamn", desc: false },
];

const FILTERABLE_COLUMNS: FilterableColumn[] = [
  "avgangsdatum",
  "vecka",
  "frs",
  "ekipage",
  "terminal",
  "butiksnamn",
  "postort",
  "vikt",
  "pris",
  "summa",
];

const FILTER_LABELS: Record<FilterableColumn, string> = {
  avgangsdatum: "Avgångsdatum",
  vecka: "Vecka",
  frs: "FRS",
  ekipage: "Ekipage",
  terminal: "Terminal",
  butiksnamn: "Butiksnamn",
  postort: "Postort",
  vikt: "Vikt",
  pris: "Pris",
  summa: "Summa",
};

function multiSelectFilter(
  row: { getValue: (columnId: string) => unknown; original: CoopFruktRow },
  columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as string[] | undefined;
  if (!selected || selected.length === 0) return true;

  const key = getFilterDisplayValue(row.original, columnId as FilterableColumn);
  return selected.includes(key);
}

function getFilterDisplayValue(
  row: CoopFruktRow,
  columnId: FilterableColumn
): string {
  switch (columnId) {
    case "avgangsdatum":
      return row.avgangsdatum.trim() || EMPTY_VALUE;
    case "vecka":
      return row.vecka.trim() || EMPTY_VALUE;
    case "frs":
      return row.frs.trim() || EMPTY_VALUE;
    case "ekipage":
      return row.ekipage.trim() || EMPTY_VALUE;
    case "terminal":
      return row.terminal.trim() || EMPTY_VALUE;
    case "butiksnamn":
      return row.butiksnamn.trim() || EMPTY_VALUE;
    case "postort":
      return row.postort.trim() || EMPTY_VALUE;
    case "vikt":
      return row.viktFormatted.trim() || EMPTY_VALUE;
    case "pris":
      return row.prisFormatted.trim() || EMPTY_VALUE;
    case "summa":
      return row.summaFormatted.trim() || EMPTY_VALUE;
    default:
      return EMPTY_VALUE;
  }
}

function uniqueColumnOptions(
  rows: CoopFruktRow[],
  key: FilterableColumn
): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    values.add(getFilterDisplayValue(row, key));
  }
  return Array.from(values).sort((a, b) => {
    if (a === EMPTY_VALUE) return -1;
    if (b === EMPTY_VALUE) return 1;
    return a.localeCompare(b, "sv", { numeric: true });
  });
}

export function CoopFruktTable({
  rows,
  totalSummaFormatted,
  rowCount,
  rowStatus,
  onRowStatusChange,
  rowComments,
  onRowCommentsChange,
}: CoopFruktTableProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    setColumnFilters([]);
    setGlobalFilter("");
    setSorting(DEFAULT_SORTING);
  }, [rows]);

  const setStatus = useCallback(
    (rowId: string, status: RowStatus) => {
      const next = { ...rowStatus };
      if (next[rowId] === status) {
        delete next[rowId];
      } else {
        next[rowId] = status;
      }
      onRowStatusChange(next);
    },
    [onRowStatusChange, rowStatus]
  );

  const setComment = useCallback(
    (rowId: string, value: string) => {
      const next = { ...rowComments };
      if (value.trim() === "") {
        delete next[rowId];
      } else {
        next[rowId] = value;
      }
      onRowCommentsChange(next);
    },
    [onRowCommentsChange, rowComments]
  );

  const filterOptions = useMemo(() => {
    const options = {} as Record<FilterableColumn, string[]>;
    for (const key of FILTERABLE_COLUMNS) {
      options[key] = uniqueColumnOptions(rows, key);
    }
    return options;
  }, [rows]);

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

  const columns = useMemo<ColumnDef<CoopFruktRow>[]>(
    () => [
      {
        accessorKey: "avgangsdatum",
        header: "Avgångsdatum",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "vecka",
        header: "Vecka",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "frs",
        header: "FRS",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "ekipage",
        header: "Ekipage",
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
        accessorKey: "butiksnamn",
        header: "Butiksnamn",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[12rem] truncate" title={value}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "postort",
        header: "Postort",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
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
        id: "pris",
        accessorFn: (row) => row.pris ?? Number.NEGATIVE_INFINITY,
        header: "Pris",
        filterFn: multiSelectFilter,
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.prisFormatted}</span>
        ),
        sortingFn: "basic",
      },
      {
        id: "summa",
        accessorKey: "summa",
        header: "Summa",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const matches = info.row.original.summaMatches;
          return (
            <span
              className={cn(
                "inline-block rounded-md px-2 py-0.5 font-medium tabular-nums",
                matches
                  ? "bg-[#22c55e]/20 text-[#4ade80] ring-1 ring-[#4ade80]/35"
                  : "text-[#f0a35a]"
              )}
            >
              {info.row.original.summaFormatted}
            </span>
          );
        },
        sortingFn: "basic",
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => {
          const status = rowStatus[row.original.id];
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title="OK"
                aria-label="Markera som OK"
                aria-pressed={status === "ok"}
                onClick={() => setStatus(row.original.id, "ok")}
                className={cn(
                  "size-7 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]",
                  status === "ok"
                    ? "border-[#4ade80] bg-[#22c55e] shadow-[0_0_0_2px_rgba(34,197,94,0.35)]"
                    : "border-[#3a3a3a] bg-[#1a3a24] hover:border-[#4ade80] hover:bg-[#22c55e]/40"
                )}
              />
              <button
                type="button"
                title="Kontrollera"
                aria-label="Markera för kontroll"
                aria-pressed={status === "check"}
                onClick={() => setStatus(row.original.id, "check")}
                className={cn(
                  "size-7 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]",
                  status === "check"
                    ? "border-[#facc15] bg-[#eab308] shadow-[0_0_0_2px_rgba(234,179,8,0.35)]"
                    : "border-[#3a3a3a] bg-[#3a3218] hover:border-[#facc15] hover:bg-[#eab308]/40"
                )}
              />
            </div>
          );
        },
      },
      {
        id: "kommentar",
        header: "Kommentar",
        enableSorting: false,
        cell: ({ row }) => (
          <input
            type="text"
            value={rowComments[row.original.id] ?? ""}
            onChange={(e) => setComment(row.original.id, e.target.value)}
            placeholder="Skriv kommentar…"
            className="h-8 w-full min-w-[8rem] rounded-md border border-[#3a3a3a] bg-[#202020] px-2 text-xs text-white placeholder:text-[#6a6a6a] outline-none focus:border-[#eb6e08] focus:ring-1 focus:ring-[#eb6e08]/40"
          />
        ),
      },
    ],
    [rowComments, rowStatus, setComment, setStatus]
  );

  const table = useReactTable({
    data: rows,
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
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase();
      if (!query) return true;

      const values = [
        row.original.avgangsdatum,
        row.original.vecka,
        row.original.frs,
        row.original.ekipage,
        row.original.terminal,
        row.original.butiksnamn,
        row.original.postort,
        row.original.viktFormatted,
        row.original.prisFormatted,
        row.original.summaFormatted,
        rowComments[row.original.id] ?? "",
      ];

      return values.some((value) =>
        String(value).toLowerCase().includes(query)
      );
    },
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
      <CoopFruktFilters
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
          description="Inga rader hittades i arbetsbladet Grunddata."
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="Inga träffar"
          description="Ingen rad matchar din sökning eller dina filter. Prova att återställa."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="max-h-[min(70vh,720px)] overflow-x-auto overflow-y-scroll [scrollbar-gutter:stable]">
            <table className="w-full min-w-[1280px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[7rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[6rem]" />
                <col className="w-[5.5rem]" />
                <col className="w-[5.5rem]" />
                <col className="w-[11rem]" />
                <col className="w-[7rem]" />
                <col className="w-[5rem]" />
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
                          className="px-3 py-3 font-semibold text-white whitespace-nowrap"
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center gap-1">
                              {canSort ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md py-0.5 cursor-pointer hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {sorted === "asc" ? (
                                    <ArrowUp className="size-3.5" aria-hidden />
                                  ) : sorted === "desc" ? (
                                    <ArrowDown
                                      className="size-3.5"
                                      aria-hidden
                                    />
                                  ) : (
                                    <ArrowUpDown
                                      className="size-3.5 opacity-70"
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
                {visibleRows.map((row, index) => {
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
                          className="px-3 py-2.5 whitespace-nowrap text-white"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
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
