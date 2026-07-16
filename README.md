# GLC Kostnadskontroll

Webbapplikation för att ladda upp fakturaunderlag (Excel), filtrera och formatera fakturarader, samt exportera resultatet till en ny Excel-fil.

## Kom igång

```bash
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Funktioner

- Uppladdning via drag-and-drop eller filväljare
- Validering av arbetsblad (`Invoice basis summary`, `Invoice basis`) och obligatoriska kolumner
- Sammanfattning från cellerna C2, C10–C13 / E10–E13
- Filtrering av Subtotal- och tilläggsrader
- Sökbar och sorterbar tabell med svensk formatering
- Export till Excel (`Sammanfattning` + `Kostnadskontroll`)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui, SheetJS (`xlsx`), TanStack Table
