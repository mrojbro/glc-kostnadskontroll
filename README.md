# GLC Kostnadskontroll

Webbapplikation för att ladda upp fakturaunderlag (Excel), filtrera och formatera fakturarader, samt exportera resultatet till en ny Excel-fil.

## Live site

**https://mrojbro.github.io/glc-kostnadskontroll/**

Enable Pages if needed: **Settings → Pages → Source: GitHub Actions**.

## Kom igång

```bash
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Funktioner

- Uppladdning via drag-and-drop eller filväljare
- Validering av arbetsblad (`Invoice basis summary`, `Invoice basis`) och obligatoriska kolumner
- Sammanfattning, filtrering, sök/sortering och statusmarkering (OK / Kontroll)
- Export till Excel (`Sammanfattning` + `Kostnadskontroll`)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui, SheetJS (`xlsx`), TanStack Table

## Deploy

Push to `master` builds a static export and deploys to GitHub Pages via `.github/workflows/deploy-pages.yml`.
