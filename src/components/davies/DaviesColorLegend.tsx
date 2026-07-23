export type DaviesLegendCounts = {
  klarFaktJa: number;
  klarFaktNej: number;
  orderstatusOk: number;
  orderstatusBad: number;
  intakterOk: number;
  intakterBad: number;
  tgTbOk: number;
  tgTbBad: number;
};

const LEGEND_GROUPS: {
  sampleClass: string;
  sampleText: string;
  description: string;
  countKey: keyof DaviesLegendCounts;
}[][] = [
  [
    {
      sampleClass:
        "bg-[#22c55e]/20 text-[#4ade80] ring-1 ring-[#4ade80]/35",
      sampleText: "KlarFakt Ja",
      description: "Ordern är markerad som klar för fakturering.",
      countKey: "klarFaktJa",
    },
    {
      sampleClass:
        "bg-[#ef4444]/20 text-[#fca5a5] ring-1 ring-[#ef4444]/40",
      sampleText: "KlarFakt Nej",
      description: "Ordern är inte klar för fakturering.",
      countKey: "klarFaktNej",
    },
  ],
  [
    {
      sampleClass:
        "bg-[#22c55e]/20 text-[#4ade80] ring-1 ring-[#4ade80]/35",
      sampleText: "Orderstatus OK",
      description: "Avräknad, Fakturerad eller Prissatt.",
      countKey: "orderstatusOk",
    },
    {
      sampleClass:
        "bg-[#ef4444]/20 text-[#fca5a5] ring-1 ring-[#ef4444]/40",
      sampleText: "Orderstatus",
      description: "All annan orderstatus behöver koll.",
      countKey: "orderstatusBad",
    },
  ],
  [
    {
      sampleClass:
        "bg-[#22c55e]/20 text-[#4ade80] ring-1 ring-[#4ade80]/35",
      sampleText: "Intäkter > 0",
      description: "Intäkt finns på raden.",
      countKey: "intakterOk",
    },
    {
      sampleClass:
        "bg-[#ef4444]/20 text-[#fca5a5] ring-1 ring-[#ef4444]/40",
      sampleText: "Intäkter 0",
      description: "Ingen intäkt — behöver koll.",
      countKey: "intakterBad",
    },
  ],
  [
    {
      sampleClass:
        "bg-[#22c55e]/20 text-[#4ade80] ring-1 ring-[#4ade80]/35",
      sampleText: "TG / TB ≥ 0",
      description: "Noll eller positivt — ser bra ut.",
      countKey: "tgTbOk",
    },
    {
      sampleClass:
        "bg-[#ef4444]/20 text-[#fca5a5] ring-1 ring-[#ef4444]/40",
      sampleText: "TG / TB −",
      description: "Negativt värde — behöver koll.",
      countKey: "tgTbBad",
    },
  ],
];

interface DaviesColorLegendProps {
  counts: DaviesLegendCounts;
}

export function DaviesColorLegend({ counts }: DaviesColorLegendProps) {
  return (
    <div className="rounded-2xl border border-[#3a3a3a] bg-[#242424] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#b8b8b8]">
        Färgförklaring
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LEGEND_GROUPS.map((group) => (
          <ul key={group[0].sampleText} className="flex flex-col gap-2.5">
            {group.map((item) => (
              <li key={item.sampleText} className="flex items-start gap-2.5">
                <span
                  className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${item.sampleClass}`}
                >
                  {item.sampleText} - {counts[item.countKey]}
                </span>
                <p className="text-xs leading-snug text-[#b8b8b8]">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
