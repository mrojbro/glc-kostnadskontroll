"use client";

import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface TypSummaryItem {
  typ: string;
  count: number;
  percent: number;
}

interface TableFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  typSummary: TypSummaryItem[];
  okCount: number;
  checkCount: number;
  statusTotal: number;
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

const deckClass =
  "rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]";

export function TableFilters({
  search,
  onSearchChange,
  onReset,
  typSummary,
  okCount,
  checkCount,
  statusTotal,
}: TableFiltersProps) {
  const divisor = statusTotal > 0 ? statusTotal : 1;
  const okPercent = (okCount / divisor) * 100;
  const checkPercent = (checkCount / divisor) * 100;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1 — Search */}
      <div className={`${deckClass} flex items-center p-5`}>
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b8b8b8]"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Sök i alla kolumner…"
            className="h-10 border-[#3a3a3a] bg-[#202020] pl-9 text-white placeholder:text-[#b8b8b8] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
          />
        </div>
      </div>

      {/* 2 — Typ summary, one deck split in half */}
      <div className={`${deckClass} grid grid-cols-2 divide-x divide-[#3a3a3a]`}>
        {typSummary.map((item) => (
          <article key={item.typ} className="flex flex-col justify-center p-4">
            <p className="text-sm font-medium text-[#eb6e08]">{item.typ}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-white">
              {item.count}
              <span className="ml-1 text-sm font-normal text-[#b8b8b8]">st</span>
            </p>
            <p className="mt-0.5 text-sm tabular-nums text-[#b8b8b8]">
              {formatPercent(item.percent)}%
            </p>
          </article>
        ))}
      </div>

      {/* 3 — OK + Kontroll counts */}
      <div className={`${deckClass} grid grid-cols-2 divide-x divide-[#3a3a3a]`}>
        <article className="flex flex-col justify-center p-4">
          <p className="text-sm font-medium text-[#4ade80]">OK</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-white">
            {okCount}
            <span className="ml-1 text-sm font-normal text-[#b8b8b8]">st</span>
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-[#b8b8b8]">
            {formatPercent(okPercent)}%
          </p>
        </article>
        <article className="flex flex-col justify-center p-4">
          <p className="text-sm font-medium text-[#eab308]">Kontroll</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-white">
            {checkCount}
            <span className="ml-1 text-sm font-normal text-[#b8b8b8]">st</span>
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-[#b8b8b8]">
            {formatPercent(checkPercent)}%
          </p>
        </article>
      </div>

      {/* 4 — Reset */}
      <button
        type="button"
        onClick={onReset}
        className={`${deckClass} flex w-full items-center justify-center gap-2 p-5 text-base font-medium text-white transition-colors hover:border-[#eb6e08] hover:bg-[#2a2218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]`}
      >
        <RotateCcw className="size-5" aria-hidden />
        Återställ
      </button>
    </div>
  );
}
