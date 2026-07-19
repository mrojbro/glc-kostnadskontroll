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
import { EmptyState } from "@/components/EmptyState";
import { TableFilters } from "@/components/TableFilters";
import { formatSwedishCurrency } from "@/lib/formatters";
import type { CostControlRow, RowStatus, RowStatusMap } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterableColumn = "datum" | "butiksnr" | "butiksnamn" | "postort";

interface CostControlTableProps {
  rows: CostControlRow[];
  totalSekFormatted: string;
  rowCount: number;
  rowStatus: RowStatusMap;
  onRowStatusChange: (next: RowStatusMap) => void;
}

const DEFAULT_SORTING: SortingState = [
  { id: "datum", desc: false },
  { id: "butiksnamn", desc: false },
];

const FILTERABLE_COLUMNS: FilterableColumn[] = [
  "datum",
  "butiksnr",
  "butiksnamn",
  "postort",
];

function multiSelectFilter(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as string[] | undefined;
  if (!selected || selected.length === 0) return true;

  const raw = String(row.getValue(columnId) ?? "").trim();
  const key = raw === "" ? EMPTY_VALUE : raw;
  return selected.includes(key);
}

function uniqueColumnOptions(
  rows: CostControlRow[],
  key: FilterableColumn
): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const raw = String(row[key] ?? "").trim();
    values.add(raw === "" ? EMPTY_VALUE : raw);
  }

  return Array.from(values).sort((a, b) => {
    if (a === EMPTY_VALUE) return -1;
    if (b === EMPTY_VALUE) return 1;
    return a.localeCompare(b, "sv");
  });
}

export function CostControlTable({
  rows,
  totalSekFormatted,
  rowCount,
  rowStatus,
  onRowStatusChange,
}: CostControlTableProps) {
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

  const filterOptions = useMemo(
    () => ({
      datum: uniqueColumnOptions(rows, "datum"),
      butiksnr: uniqueColumnOptions(rows, "butiksnr"),
      butiksnamn: uniqueColumnOptions(rows, "butiksnamn"),
      postort: uniqueColumnOptions(rows, "postort"),
    }),
    [rows]
  );

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

  const columns = useMemo<ColumnDef<CostControlRow>[]>(
    () => [
      {
        accessorKey: "foNummer",
        header: "FO-Nummer",
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[6.5rem] truncate" title={value}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "typ",
        header: "Typ",
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "datum",
        header: "Datum",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          if (!value) {
            return (
              <span className="inline-block rounded-md bg-[#7f1d1d]/55 px-2 py-0.5 font-medium text-[#fca5a5] ring-1 ring-[#f87171]/40">
                Saknas
              </span>
            );
          }
          return value;
        },
      },
      {
        accessorKey: "butiksnr",
        header: "Butiksnr",
        filterFn: multiSelectFilter,
        cell: (info) => info.getValue<string>(),
      },
      {
        accessorKey: "butiksnamn",
        header: "Butiksnamn",
        filterFn: multiSelectFilter,
        cell: (info) => {
          const value = info.getValue<string>();
          return (
            <span className="block max-w-[11rem] truncate" title={value}>
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
        id: "pall",
        accessorFn: (row) => row.pall ?? Number.NEGATIVE_INFINITY,
        header: "Pall",
        cell: (info) => (
          <span className="inline-block rounded-md bg-[#eb6e08]/18 px-2 py-0.5 font-medium tabular-nums text-[#f0a35a]">
            {info.row.original.pallFormatted}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "rpu",
        accessorFn: (row) => row.rpu ?? Number.NEGATIVE_INFINITY,
        header: "RPU",
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.rpuFormatted}</span>
        ),
        sortingFn: "basic",
      },
      {
        id: "sek",
        accessorKey: "sek",
        header: "SEK",
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.sekFormatted}</span>
        ),
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
    ],
    [rowStatus, setStatus]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
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
        row.original.foNummer,
        row.original.typ,
        row.original.datum,
        row.original.butiksnr,
        row.original.butiksnamn,
        row.original.postort,
        row.original.pallFormatted,
        row.original.rpuFormatted,
        row.original.sekFormatted,
      ];

      return values.some((value) =>
        String(value).toLowerCase().includes(query)
      );
    },
  });

  const visibleRows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const filteredRowCount = filteredRows.length;
  const filteredTotalSek = filteredRows.reduce(
    (sum, row) => sum + row.original.sek,
    0
  );
  const displayTotal =
    globalFilter.trim() === "" && columnFilters.length === 0
      ? totalSekFormatted
      : formatSwedishCurrency(filteredTotalSek);
  const displayCount =
    globalFilter.trim() === "" && columnFilters.length === 0
      ? rowCount
      : filteredRowCount;

  const typSummary = useMemo(() => {
    const tracked = ["ZCDC1", "ZCDC3"] as const;
    const counts: Record<(typeof tracked)[number], number> = {
      ZCDC1: 0,
      ZCDC3: 0,
    };

    for (const row of filteredRows) {
      const typ = row.original.typ.trim().toUpperCase();
      if (typ === "ZCDC1" || typ === "ZCDC3") {
        counts[typ] += 1;
      }
    }

    const total = filteredRowCount || 1;

    return tracked.map((typ) => ({
      typ,
      count: counts[typ],
      percent: (counts[typ] / total) * 100,
    }));
  }, [filteredRows, filteredRowCount]);

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
      <TableFilters
        search={globalFilter}
        onSearchChange={setGlobalFilter}
        onReset={handleReset}
        typSummary={typSummary}
        okCount={okCount}
        checkCount={checkCount}
        statusTotal={filteredRowCount}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Inga fakturarader"
          description="Inga rader återstod efter filtrering. Kontrollera att arbetsboken innehåller giltiga fakturarader."
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="Inga träffar"
          description="Ingen rad matchar din sökning eller dina filter. Prova att rensa filtren."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="max-h-[min(70vh,720px)] overflow-x-auto overflow-y-scroll [scrollbar-gutter:stable]">
            <table className="w-full min-w-[1000px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[7rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[8rem]" />
                <col className="w-[6rem]" />
                <col className="w-[11rem]" />
                <col className="w-[8rem]" />
                <col className="w-[5rem]" />
                <col className="w-[5rem]" />
                <col className="w-[7.5rem]" />
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
                          className="px-3 py-3 font-semibold text-white whitespace-nowrap"
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : "none"
                          }
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center gap-1">
                              {canSort ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md py-0.5 -ml-0 cursor-pointer hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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
                                  label={String(
                                    header.column.columnDef.header ?? columnId
                                  )}
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
                  const missingDatum = !row.original.datum;
                  const status = rowStatus[row.original.id];
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-t border-[#3a3a3a]",
                        status === "ok" && "bg-[#1a2e22] hover:bg-[#203528]",
                        status === "check" && "bg-[#2e2a18] hover:bg-[#35301c]",
                        !status &&
                          missingDatum &&
                          "bg-[#2a1818] hover:bg-[#321c1c]",
                        !status &&
                          !missingDatum &&
                          (index % 2 === 0 ? "bg-[#242424]" : "bg-[#202020]"),
                        !status && !missingDatum && "hover:bg-[#2a2218]"
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
              av{" "}
              <span className="font-medium text-white">{rowCount}</span>{" "}
              rader
              {" · "}
              <span className="text-[#4ade80]">
                OK {Object.values(rowStatus).filter((s) => s === "ok").length}
              </span>
              {" · "}
              <span className="text-[#eab308]">
                Kontroll{" "}
                {Object.values(rowStatus).filter((s) => s === "check").length}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-[#b8b8b8]">Totalt SEK: </span>
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
