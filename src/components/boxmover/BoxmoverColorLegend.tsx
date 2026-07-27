import { cn } from "@/lib/utils";
import type { BoxmoverRow } from "@/lib/boxmover/types";

export type BoxmoverLegendCounts = {
  klarFaktJa: number;
  klarFaktNej: number;
  orderstatusOk: number;
  orderstatusBad: number;
  intakterOk: number;
  intakterBad: number;
  tgTbOk: number;
  tgTbBad: number;
};

export type BoxmoverLegendFilterKey = keyof BoxmoverLegendCounts;

export function rowMatchesBoxmoverLegend(
  row: BoxmoverRow,
  key: BoxmoverLegendFilterKey
): boolean {
  const tgNegative = row.tg !== null && row.tg < 0;
  const tbNegative = row.tb !== null && row.tb < 0;
  const tgTbBad = tgNegative || tbNegative;

  switch (key) {
    case "klarFaktJa":
      return row.klarFakturering;
    case "klarFaktNej":
      return !row.klarFakturering;
    case "orderstatusOk":
      return row.orderstatusOk;
    case "orderstatusBad":
      return !row.orderstatusOk;
    case "intakterOk":
      return row.intakterOk;
    case "intakterBad":
      return !row.intakterOk;
    case "tgTbOk":
      return !tgTbBad;
    case "tgTbBad":
      return tgTbBad;
  }
}

const LEGEND_GROUPS: {
  sampleClass: string;
  sampleText: string;
  description: string;
  countKey: BoxmoverLegendFilterKey;
}[][] = [
  [
    {
      sampleClass: "text-[#4ade80]",
      sampleText: "KlarFakt Ja",
      description: "Ordern är markerad som klar för fakturering.",
      countKey: "klarFaktJa",
    },
    {
      sampleClass: "text-[#fca5a5]",
      sampleText: "KlarFakt Nej",
      description: "Ordern är inte klar för fakturering.",
      countKey: "klarFaktNej",
    },
  ],
  [
    {
      sampleClass: "text-[#4ade80]",
      sampleText: "Orderstatus OK",
      description: "Avräknad, Fakturerad eller Prissatt.",
      countKey: "orderstatusOk",
    },
    {
      sampleClass: "text-[#fca5a5]",
      sampleText: "Orderstatus",
      description: "All annan orderstatus behöver koll.",
      countKey: "orderstatusBad",
    },
  ],
  [
    {
      sampleClass: "text-[#4ade80]",
      sampleText: "Intäkter > 0",
      description: "Intäkt finns på raden.",
      countKey: "intakterOk",
    },
    {
      sampleClass: "text-[#fca5a5]",
      sampleText: "Intäkter 0",
      description: "Ingen intäkt — behöver koll.",
      countKey: "intakterBad",
    },
  ],
  [
    {
      sampleClass: "text-[#4ade80]",
      sampleText: "TG / TB ≥ 0",
      description: "Noll eller positivt — ser bra ut.",
      countKey: "tgTbOk",
    },
    {
      sampleClass: "text-[#fca5a5]",
      sampleText: "TG / TB −",
      description: "Negativt värde — behöver koll.",
      countKey: "tgTbBad",
    },
  ],
];

interface BoxmoverColorLegendProps {
  counts: BoxmoverLegendCounts;
  activeFilter: BoxmoverLegendFilterKey | null;
  onFilterChange: (key: BoxmoverLegendFilterKey | null) => void;
}

export function BoxmoverColorLegend({
  counts,
  activeFilter,
  onFilterChange,
}: BoxmoverColorLegendProps) {
  return (
    <div className="rounded-2xl border border-[#3a3a3a] bg-[#242424] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#b8b8b8]">
        Färgförklaring
        <span className="ml-2 font-normal normal-case tracking-normal">
          — klicka för att filtrera
        </span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LEGEND_GROUPS.map((group) => (
          <ul key={group[0].sampleText} className="flex flex-col gap-2.5">
            {group.map((item) => {
              const isActive = activeFilter === item.countKey;
              return (
                <li key={item.sampleText} className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange(isActive ? null : item.countKey)
                    }
                    aria-pressed={isActive}
                    className={cn(
                      "inline-block shrink-0 text-left text-xs font-medium tabular-nums underline-offset-2 transition-opacity hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]/60",
                      item.sampleClass,
                      isActive && "underline opacity-100",
                      !isActive && activeFilter !== null && "opacity-50"
                    )}
                  >
                    {item.sampleText} - {counts[item.countKey]}
                  </button>
                  <p className="text-xs leading-snug text-[#b8b8b8]">
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </div>
  );
}
