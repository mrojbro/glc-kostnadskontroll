"use client";

import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DaviesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  rowCount: number;
  totalCount: number;
  totalIntakterFormatted: string;
}

const deckClass =
  "rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.25)]";

export function DaviesFilters({
  search,
  onSearchChange,
  onReset,
  rowCount,
  totalCount,
  totalIntakterFormatted,
}: DaviesFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <article className={`${deckClass} border-[#eb6e08]/45 bg-[#2a2218] p-5`}>
        <p className="text-sm text-[#b8b8b8]">Totalt Intäkter</p>
        <p className="mt-2 text-xl font-bold tabular-nums text-[#eb6e08]">
          {totalIntakterFormatted}
        </p>
        <p className="mt-1 text-xs text-[#b8b8b8]">
          {rowCount} av {totalCount} rader
        </p>
      </article>

      <button
        type="button"
        onClick={onReset}
        className={`${deckClass} flex w-full items-center justify-center gap-2 p-5 text-base font-medium text-white transition-colors hover:border-[#eb6e08] hover:bg-[#2a2218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08] sm:col-span-2 xl:col-span-1`}
      >
        <RotateCcw className="size-5" aria-hidden />
        Återställ
      </button>
    </div>
  );
}
