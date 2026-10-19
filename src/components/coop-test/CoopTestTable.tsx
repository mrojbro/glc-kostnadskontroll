"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CoopTestGroupSummary, CoopTestRow } from "@/lib/coopTest/types";
import { cn } from "@/lib/utils";

/** Overview columns only — export keeps full headers via COOP_TEST_OUTPUT_HEADERS. */
const COLUMN_KEYS: Array<{
  key: keyof CoopTestRow;
  label: string;
  title?: string;
}> = [
  {
    key: "latestRequestedDate",
    label: "LRD",
    title: "Latest Requested Date (Unloading Location)",
  },
  { key: "originalOrder", label: "Original Order" },
  { key: "quantity", label: "Quantity" },
  { key: "loadCarrier", label: "Load Carrier" },
  {
    key: "latestRequestedTime",
    label: "LRT",
    title: "Latest Requested Time (Unloading Location)",
  },
  { key: "grossWeight", label: "Gross Weight" },
  {
    key: "transportationGroup",
    label: "TG",
    title: "Transportation Group",
  },
  {
    key: "transportationGroupDescription",
    label: "TGD",
    title: "Transportation Group (Description)",
  },
  { key: "butiksnr", label: "Butiksnr" },
  { key: "consigneeAddress", label: "Consignee Address" },
  { key: "lastningsId", label: "Lastnings-ID" },
  { key: "lastningsnamn", label: "Lastningsnamn" },
  { key: "lastningsadress", label: "Lastningsadress" },
  { key: "lastningspostnr", label: "Lastningspostnr" },
  { key: "lastningspostort", label: "Lastningspostort" },
];

interface CoopTestTableProps {
  rows: CoopTestRow[];
  summary: CoopTestGroupSummary[];
  tskIgnoredCount: number;
}

const deckClass =
  "rounded-2xl border border-[#3a3a3a] bg-[#242424] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]";

function rowMatchesGlobalSearch(row: CoopTestRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return Object.values(row).some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalized)
  );
}

export function CoopTestTable({
  rows,
  summary,
  tskIgnoredCount,
}: CoopTestTableProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesGlobalSearch(row, search)),
    [rows, search]
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={`${deckClass} flex items-center`}>
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
          <p className="text-sm text-[#b8b8b8]">Rader (output)</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#eb6e08]">
            {filteredRows.length}
            {search.trim() ? (
              <span className="text-base font-normal text-[#b8b8b8]">
                {" "}
                av {rows.length}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[#b8b8b8]">Mappad output</p>
        </article>
        <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}>
          <p className="text-sm text-[#b8b8b8]">TSK ignorerade</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#eb6e08]">
            {tskIgnoredCount}
          </p>
          <p className="mt-1 text-xs text-[#b8b8b8]">Ingår i sammanfattning</p>
        </article>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((group) => (
          <article
            key={group.transportationGroup}
            className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218]`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[#b8b8b8]">
              Transportation Group
            </p>
            <p className="mt-1 text-xl font-bold text-[#eb6e08]">
              {group.transportationGroup}
            </p>
            <p className="mt-1 text-xs text-[#b8b8b8]">
              Quantity {group.quantitySumFormatted}
              {group.tskRowCount > 0 ? (
                <>
                  {" · "}
                  <span className="text-[#f0a35a]">
                    {group.tskRowCount} TSK
                  </span>
                </>
              ) : null}
            </p>

            <div className="mt-3 space-y-1.5 border-t border-[#3a3a3a] pt-3">
              {group.loadCarriers.length === 0 ? (
                <p className="text-xs text-[#b8b8b8]">Inga rader</p>
              ) : (
                group.loadCarriers.map((carrier) => (
                  <div
                    key={carrier.loadCarrier}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-[#b8b8b8]" title={carrier.loadCarrier}>
                      {carrier.loadCarrier}
                      {carrier.tskRowCount > 0 ? (
                        <span className="text-[#f0a35a]">
                          {" "}
                          ({carrier.tskRowCount} TSK)
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-white">
                      {carrier.quantitySumFormatted}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="h-[min(70vh,720px)] overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[1600px] table-fixed border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#eb6e08]">
              <tr>
                {COLUMN_KEYS.map((column) => (
                  <th
                    key={column.key}
                    title={column.title ?? column.label}
                    className="px-2 py-2 text-left font-semibold text-white whitespace-nowrap"
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
                    colSpan={COLUMN_KEYS.length}
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
                    className={cn(
                      "border-t border-[#3a3a3a]",
                      index % 2 === 0 ? "bg-[#242424]" : "bg-[#202020]"
                    )}
                  >
                    {COLUMN_KEYS.map((column) => {
                      const value = String(row[column.key] ?? "").trim();
                      return (
                        <td
                          key={column.key}
                          className="max-w-0 overflow-hidden px-2 py-1 text-white"
                          title={value || undefined}
                        >
                          <span className="block truncate">
                            {value || "—"}
                          </span>
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
            rader · blanka kolumner lämnas tomma i export
          </p>
        </div>
      </div>
    </section>
  );
}
