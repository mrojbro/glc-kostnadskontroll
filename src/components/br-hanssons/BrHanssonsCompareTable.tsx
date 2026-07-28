"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BrHanssonsCompareResult,
  BrHanssonsCompareRow,
  BrHanssonsCompareStatus,
} from "@/lib/brHanssons/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<BrHanssonsCompareStatus, string> = {
  changed: "Ändrad",
  only15: "Endast 15:00",
  only21: "Endast 21:00",
  unchanged: "Oförändrad",
};

const STATUS_CLASS: Record<BrHanssonsCompareStatus, string> = {
  changed: "text-[#fca5a5]",
  only15: "text-[#f0a35a]",
  only21: "text-[#93c5fd]",
  unchanged: "text-[#b8b8b8]",
};

interface BrHanssonsCompareTableProps {
  data: BrHanssonsCompareResult;
}

type TimeSlot = "15:00" | "21:00";

interface DisplayLine {
  key: string;
  pairId: string;
  isFirst: boolean;
  isLast: boolean;
  pairIndex: number;
  status: BrHanssonsCompareStatus;
  datum: string;
  sedelnummer: string;
  markning: string;
  angoringNamn: string;
  angoringPostort: string;
  tid: TimeSlot;
  vikt: string;
  pall: string;
  kolli: string;
  viktChanged: boolean;
  pallChanged: boolean;
  kolliChanged: boolean;
}

export function BrHanssonsCompareTable({ data }: BrHanssonsCompareTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [klarIds, setKlarIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setKlarIds(new Set());
  }, [data]);

  const visiblePairs = useMemo(() => {
    if (showAll) return data.rows;
    return data.rows.filter((row) => row.status === "changed");
  }, [data.rows, showAll]);

  const lines = useMemo(
    () => visiblePairs.flatMap((row, pairIndex) => toDisplayLines(row, pairIndex)),
    [visiblePairs]
  );

  const toggleKlar = (pairId: string) => {
    setKlarIds((prev) => {
      const next = new Set(prev);
      if (next.has(pairId)) next.delete(pairId);
      else next.add(pairId);
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Kollinslag skiljer"
          value={data.changedCount}
          className="text-[#fca5a5]"
        />
        <StatCard
          label="Endast 15:00"
          value={data.only15Count}
          className="text-[#f0a35a]"
        />
        <StatCard
          label="Endast 21:00"
          value={data.only21Count}
          className="text-[#93c5fd]"
        />
        <StatCard
          label="Oförändrade"
          value={data.unchangedCount}
          className="text-[#b8b8b8]"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#b8b8b8]">
          Jämför per <span className="text-white">Angöring namn - sista</span>.
          Visar{" "}
          <span className="text-white">{visiblePairs.length}</span> av{" "}
          <span className="text-white">{data.rowCount}</span> angöringar
          med skiljande Kollinslag
          {showAll ? " (alla statusar)" : ""}.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#b8b8b8]">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="size-4 rounded border-[#3a3a3a] bg-[#202020] accent-[#eb6e08]"
          />
          Visa alla
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="h-[min(70vh,720px)] overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[7rem]" />
              <col className="w-[7rem]" />
              <col className="w-[6.5rem]" />
              <col className="w-[6rem]" />
              <col className="w-[14rem]" />
              <col className="w-[7rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-[9rem]" />
              <col className="w-[5rem]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#eb6e08]">
              <tr>
                <th className="px-2 py-2.5 font-semibold text-white">Status</th>
                <th className="px-2 py-2.5 font-semibold text-white">Datum</th>
                <th className="px-2 py-2.5 font-semibold text-white">
                  Sedelnummer
                </th>
                <th className="px-2 py-2.5 font-semibold text-white">Märkning</th>
                <th className="px-2 py-2.5 font-semibold text-white">
                  Angöring namn
                </th>
                <th className="px-2 py-2.5 font-semibold text-white">
                  Angöring postort
                </th>
                <th className="px-2 py-2.5 font-semibold text-white">Tid</th>
                <th className="px-2 py-2.5 text-right font-semibold text-white">
                  Vikt
                </th>
                <th className="px-2 py-2.5 text-right font-semibold text-white">
                  Pall
                </th>
                <th className="px-2 py-2.5 font-semibold text-white">Kolli</th>
                <th className="px-2 py-2.5 font-semibold text-white">Klar</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-16 text-center text-sm text-[#b8b8b8]"
                  >
                    Inga Kollinslag-skillnader att visa. Markera &quot;Visa
                    alla&quot; för övriga rader.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const isKlar = klarIds.has(line.pairId);
                  return (
                    <tr
                      key={line.key}
                      className={cn(
                        line.isFirst
                          ? "border-t-2 border-[#4a4a4a]"
                          : "border-t border-[#323232]",
                        isKlar
                          ? line.isFirst
                            ? "bg-[#1a3a24]"
                            : "bg-[#163020]"
                          : pairBackground(
                              line.status,
                              line.pairIndex,
                              line.isFirst
                            )
                      )}
                    >
                      <td
                        className={cn(
                          "px-2 py-1.5 whitespace-nowrap font-medium",
                          isKlar
                            ? "text-[#86efac]"
                            : STATUS_CLASS[line.status]
                        )}
                      >
                        {line.isFirst ? STATUS_LABELS[line.status] : ""}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-white">
                        {line.isFirst ? line.datum || "—" : ""}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-white">
                        {line.isFirst ? line.sedelnummer || "—" : ""}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-white">
                        {line.isFirst ? line.markning || "—" : ""}
                      </td>
                      <td
                        className="px-2 py-1.5 whitespace-nowrap text-white"
                        title={line.isFirst ? line.angoringNamn : undefined}
                      >
                        {line.isFirst ? (
                          <span className="block max-w-[13rem] truncate">
                            {line.angoringNamn || "—"}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-white">
                        {line.isFirst ? line.angoringPostort || "—" : ""}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 whitespace-nowrap font-medium",
                          isKlar ? "text-[#86efac]" : "text-[#eb6e08]"
                        )}
                      >
                        {line.tid}
                      </td>
                      <ValueCell
                        value={line.vikt}
                        changed={!isKlar && line.viktChanged}
                        align="right"
                      />
                      <ValueCell
                        value={line.pall}
                        changed={!isKlar && line.pallChanged}
                        align="right"
                      />
                      <ValueCell
                        value={line.kolli}
                        changed={!isKlar && line.kolliChanged}
                      />
                      <td className="px-2 py-1.5">
                        {line.isFirst ? (
                          <button
                            type="button"
                            aria-pressed={isKlar}
                            onClick={() => toggleKlar(line.pairId)}
                            className={cn(
                              "box-border h-7 min-w-[3.25rem] rounded-md border px-2.5 text-xs font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]/50",
                              isKlar
                                ? "border-[#22c55e] bg-[#22c55e] text-[#052e16] hover:border-[#16a34a] hover:bg-[#16a34a]"
                                : "border-[#3a3a3a] bg-[#202020] text-[#b8b8b8] hover:border-[#4ade80] hover:text-white"
                            )}
                          >
                            Klar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function toDisplayLines(
  row: BrHanssonsCompareRow,
  pairIndex: number
): DisplayLine[] {
  const base = {
    pairId: row.id,
    pairIndex,
    status: row.status,
    datum: row.datum,
    sedelnummer: row.sedelnummer,
    markning: row.markning,
    angoringNamn: row.angoringNamn,
    angoringPostort: row.angoringPostort,
    viktChanged: row.viktChanged,
    pallChanged: row.pallplatsChanged,
    kolliChanged: row.kollinslagChanged,
  };

  const show15 = row.status !== "only21";
  const show21 = row.status !== "only15";

  const slots: Array<{
    tid: TimeSlot;
    vikt: string;
    pall: string;
    kolli: string;
  }> = [];

  if (show15) {
    slots.push({
      tid: "15:00",
      vikt: row.vikt15Formatted || "—",
      pall: row.pallplats15Formatted || "—",
      kolli: row.kollinslag15 || "—",
    });
  }

  if (show21) {
    slots.push({
      tid: "21:00",
      vikt: row.vikt21Formatted || "—",
      pall: row.pallplats21Formatted || "—",
      kolli: row.kollinslag21 || "—",
    });
  }

  return slots.map((slot, index) => ({
    ...base,
    ...slot,
    key: `${row.id}-${slot.tid}`,
    isFirst: index === 0,
    isLast: index === slots.length - 1,
  }));
}

function pairBackground(
  status: BrHanssonsCompareStatus,
  pairIndex: number,
  isFirst: boolean
): string {
  if (status === "changed") {
    return isFirst ? "bg-[#2a1818]" : "bg-[#241616]";
  }
  if (status === "only15") return "bg-[#2a2218]";
  if (status === "only21") return "bg-[#18222a]";
  return pairIndex % 2 === 0
    ? isFirst
      ? "bg-[#242424]"
      : "bg-[#222222]"
    : isFirst
      ? "bg-[#202020]"
      : "bg-[#1e1e1e]";
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#3a3a3a] bg-[#242424] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <p className={cn("text-sm font-medium", className)}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
        <span className="ml-1 text-sm font-normal text-[#b8b8b8]">st</span>
      </p>
    </div>
  );
}

function ValueCell({
  value,
  changed,
  align = "left",
}: {
  value: string;
  changed: boolean;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "px-2 py-1.5 whitespace-nowrap font-normal tabular-nums",
        align === "right" ? "text-right" : "text-left",
        changed ? "text-[#fca5a5]" : "text-white"
      )}
      title={value}
    >
      <span className="block max-w-[8.5rem] truncate">{value}</span>
    </td>
  );
}
