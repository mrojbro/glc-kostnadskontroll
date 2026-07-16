import { formatSwedishCurrency } from "@/lib/formatters";
import type { InvoiceSummary } from "@/lib/types";

interface SummaryCardsProps {
  summary: InvoiceSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const items = [
    { id: "freight-by-rpu", ...summary.freightByRpu },
    { id: "shunting", ...summary.shunting },
    { id: "fuel-surcharge", ...summary.fuelSurcharge },
    { id: "adjustment", ...summary.adjustment },
  ];

  const totalSek =
    summary.freightByRpu.value +
    summary.shunting.value +
    summary.fuelSurcharge.value +
    summary.adjustment.value;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-[#3a3a3a] bg-[#242424] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          >
            <p className="text-sm text-[#b8b8b8]">{item.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-white">
              {item.formattedValue}
            </p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-[#eb6e08]/45 bg-[#2a2218] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)] sm:flex sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[#b8b8b8]">Totalt SEK</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-[#eb6e08] sm:mt-0">
          {formatSwedishCurrency(totalSek)}
        </p>
      </article>
    </div>
  );
}
