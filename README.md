# GLC Kostnadskontroll

Portal för kostnadskontroll per distribution. Ladda upp fakturaunderlag (Excel), filtrera och formatera fakturarader, och exportera resultatet.

## Live site

**https://mrojbro.github.io/glc-kostnadskontroll/**

Enable Pages if needed: **Settings → Pages → Source: GitHub Actions**.

## Kom igång

```bash
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Distributioner

| Portal | Status |
|--------|--------|
| HLP Distribution | Aktiv |
| Coop Distribution | Aktiv |
| Coop Frukt | Aktiv |
| 3054 Davies | Aktiv |
| 3058 Boxmover | Kommer snart |
| 3028 Närkefrakt | Kommer snart |
| 2215 Krickos | Kommer snart |

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui, SheetJS (`xlsx`), TanStack Table

## Deploy

Push to `master` builds a static export and deploys to GitHub Pages via `.github/workflows/deploy-pages.yml`.
