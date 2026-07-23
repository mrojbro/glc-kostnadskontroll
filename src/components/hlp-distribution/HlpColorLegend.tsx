const LEGEND_ITEMS = [
  {
    sampleClass:
      "bg-[#eb6e08]/25 text-[#f0a35a] ring-1 ring-[#eb6e08]/40",
    sampleText: "Fraktsedeln",
    description: "Mycket troligt en tilläggsrad.",
  },
  {
    sampleClass:
      "bg-[#eab308]/20 text-[#facc15] ring-1 ring-[#eab308]/40",
    sampleText: "Tillägg",
    description: "Tillägg med blank mottagare.",
  },
  {
    sampleClass:
      "bg-[#38bdf8]/20 text-[#7dd3fc] ring-1 ring-[#38bdf8]/40",
    sampleText: "Mottagare",
    description: "Extra koll på priset.",
  },
  {
    sampleClass:
      "bg-[#eab308]/20 text-[#facc15] ring-1 ring-[#eab308]/40",
    sampleText: "Kontroll",
    description: "Tänkbart en rättning.",
  },
] as const;

export function HlpColorLegend() {
  return (
    <div className="rounded-2xl border border-[#3a3a3a] bg-[#242424] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#b8b8b8]">
        Färgförklaring
      </p>
      <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.sampleText} className="flex items-start gap-2.5">
            <span
              className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${item.sampleClass}`}
            >
              {item.sampleText}
            </span>
            <p className="text-xs leading-snug text-[#b8b8b8]">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
