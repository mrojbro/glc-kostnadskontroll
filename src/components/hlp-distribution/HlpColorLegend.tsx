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

const MANUAL_ADJUSTMENT_NOTES = [
  <>
    <strong className="font-semibold text-white">Linas</strong> kommer endast
    att ha fel pris på{" "}
    <strong className="font-semibold text-white">Skövde Slakteri</strong>, där{" "}
    <strong className="font-semibold text-white">HLP</strong> däremot har rätt
    pris. Eftersom <strong className="font-semibold text-white">HLP</strong> inte
    kommer kunna boka detta korrekt justerar jag priset manuellt.
  </>,
  <>
    Det är ungefär samma situation med{" "}
    <strong className="font-semibold text-white">Mixum</strong>-dragningarna, där
    de ofta bokar fel antal pallplatser. Därför brukar jag justera antalet
    pallplatser manuellt så att priset blir rätt.
  </>,
  <>
    De kan exempelvis boka 8 pall men bara ange 1 pallplats. Då ändrar jag det
    till 8 pall och 8 pallplatser för att få korrekt debitering.
  </>,
] as const;

const CLOSING_NOTE =
  "Det är ingen större idé att fortsätta påtala behovet av förändringar för dem, eftersom vi redan vet att det inte kommer att ske. Därför är det enklare att vi hanterar dessa avvikelser manuellt.";

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
      <div className="mt-3 space-y-2 border-t border-[#3a3a3a] pt-3">
        {MANUAL_ADJUSTMENT_NOTES.map((paragraph, index) => (
          <p
            key={index}
            className="text-xs leading-relaxed text-[#b8b8b8]"
          >
            {paragraph}
          </p>
        ))}
        <p className="text-xs font-bold leading-relaxed text-white">
          {CLOSING_NOTE}
        </p>
      </div>
    </div>
  );
}
