# Wealth Dashboard

Personal wealth tracking (Next.js + Prisma + PostgreSQL).

## Local development

**Postgres required** (SQLite is not used).

```bash
npm install
npm run db:up          # Docker Postgres (optional if you already have Postgres)
cp .env.example .env   # edit DATABASE_URL if needed
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Import holdings from CSV (Assets)

Export your holdings from Groww (or any broker) as **CSV** (UTF-8). On **Assets**, use **Import from CSV**: pick a category (e.g. **Mutual Funds**), optionally check **Replace all assets in this category** to clear that category before import, then choose the file.

The importer looks for a **name** column (e.g. `scheme name`, `scheme`, `fund name`, `name`, `instrument`) and a **value** column (e.g. `current value`, `market value`, `value`, `amount`). Optional columns `folio`, `isin`, `units`, `nav` are appended to **notes** when present. If headers differ, rename them in the CSV or adjust the mapping in code (`lib/csv-holdings.ts`).

**Append** mode (replace unchecked) adds new rows; re-importing the same file can duplicate. **Replace** mode deletes every asset in the selected category first, then inserts from the file.

## Loan amortisation CSV / Excel (Debts)

After creating a loan, upload a schedule from **Debts**. Required columns (flexible header names — see `lib/loanParser.ts`): a **date** column (`due date`, `month`, `date`, etc.) and an **outstanding balance** column (`balance`, `outstanding`, etc.). Optional: EMI, principal, interest.

Dates supported include `YYYY-MM-DD`, `MM/YYYY`, `YYYY-MM`, and **slash dates** `M/D/YYYY` or `D/M/YYYY` (e.g. `04/01/2026` as month/day/year for monthly EMIs). If both day and month are ≤ 12, **month-first (US-style)** is assumed. Export from Google Sheets as **CSV** or **Excel** (`.xlsx`).

**Outstanding today:** the app uses the last schedule row **on or before the current calendar month**. If every row is still in the future, it shows the loan **principal** you entered until the first schedule month arrives (so it is not stuck at ₹0).

## Git + auto-deploy on Railway

1. Create a **new empty repo** on GitHub (no README/license) named e.g. `wealth-dashboard`.
2. In this folder:

   ```bash
   git remote add origin https://github.com/YOUR_USER/wealth-dashboard.git
   git branch -M main
   git push -u origin main
   ```

3. In Railway → your **web** service → **Settings** → **Source**: connect the same GitHub repo and branch (`main`). Turn **on** automatic deployments for that branch (default when connected).
4. After the first push, Railway builds from Git; later pushes to `main` redeploy automatically. You can still use `railway up` for ad-hoc uploads, but Git is the source of truth for auto-deploy.

## Deploy on Railway

1. Create a **new project** → add **PostgreSQL** → add a service from **this GitHub repo** (or deploy with CLI).
2. In the **web service**, set `DATABASE_URL` to reference Postgres (Railway can inject `${{ Postgres.DATABASE_URL }}` when you link the database).
3. **Build command:** `npx prisma generate && npm run build` (default Nixpacks often runs `npm run build` — already includes `prisma generate`).
4. **Start command:** `npx prisma migrate deploy && npm run start`
5. After first deploy, run seed once (Railway shell or local with prod URL):

   ```bash
   railway run npm run db:seed
   ```

## CLI quick link

```bash
railway login
cd wealth-dashboard
railway link    # pick workspace + project
```

Each folder’s `.railway/` remembers which Railway project it uses.
