# Wealth Dashboard

Personal wealth tracking (Next.js + Prisma + PostgreSQL).

## Local development

**Postgres required** (SQLite is not used).

```bash
npm install
npm run db:up          # Docker Postgres (optional if you already have Postgres)
cp .env.example .env   # set DATABASE_URL, AUTH_SECRET, AUTH_URL, AUTH_GOOGLE_*
npx prisma migrate deploy
npm run dev
```

After the first Google sign-in, optionally run `SEED_FOR_EMAIL=your@gmail.com npm run db:seed` for default asset categories (see below).

Open [http://localhost:3000](http://localhost:3000). You are redirected to `/login` until you sign in with **Google**.

### Authentication (Google OAuth)

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**, create an **OAuth 2.0 Client ID** (Web application).
2. Under **Authorized redirect URIs**, add exactly:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Staging: `https://<your-staging-host>/api/auth/callback/google`
   - Production: `https://<your-prod-host>/api/auth/callback/google`
3. Copy **Client ID** and **Client secret** into `.env` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
4. Set `AUTH_SECRET` (e.g. `openssl rand -base64 32`) and `AUTH_URL` to your app’s public origin (no trailing slash), e.g. `http://localhost:3000`.

Optional: `AUTH_GMAIL_ONLY=true` rejects sign-in unless the Google account email ends with `@gmail.com`.

### Default asset categories (seed)

Categories are **per user**. After you sign in once (so a `User` row exists), run:

```bash
SEED_FOR_EMAIL=you@gmail.com npm run db:seed
```

If `SEED_FOR_EMAIL` is unset, the seed script skips category creation and prints a short message.

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

3. In Railway → your **production** web service → **Settings** → **Source**: connect the same GitHub repo and branch **`main`**. Turn **on** automatic deployments for that branch (default when connected).
4. After the first push, Railway builds from Git; **pushes to `main` deploy production**. For day-to-day work, follow **Staging → production** in the [Default release order](#default-release-order-staging-first-then-production) section below (push `staging` first, test, then push `main`).

## Staging (Git branch + Railway)

Goal: a **`staging`** branch on GitHub and a **separate Railway service** (or environment) that deploys only when `staging` updates.

### Default release order: staging first, then production

**Always exercise changes on staging before updating production** (Railway URL for the staging service). Production should track **`main`**; staging should track **`staging`**.

1. **Commit locally** on `main` (or merge your feature branch into `main` locally first).
2. **Push only `staging`** so Railway staging redeploys — **do not push `main` yet** (that would deploy production immediately if it watches `main`):

   ```bash
   git checkout main
   git push origin HEAD:staging
   ```

3. Open your **staging** app URL in Railway, smoke-test (login, critical flows, migrations if any).
4. When it looks good, **ship to production**:

   ```bash
   git push origin main
   ```

**If `main` is already up to date on GitHub** and you only need staging to match it (e.g. after a teammate merged), use:

```bash
npm run staging:sync
```

That merges remote `main` into `staging` and pushes `staging`; it does **not** push `main`.

**Avoid:** pushing `main` before you have validated the same commit on staging, unless it is an emergency hotfix you accept skipping staging for.

### One-time — GitHub

Create the branch (from current `main`) and push:

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b staging
git push -u origin staging
```

After that, updates to staging usually come by merging `main` (see below).

### One-time — Railway

1. Open your Railway **project** → **New** → **GitHub Repo** (or duplicate the production service).
2. Name it e.g. **wealth-dashboard-staging**.
3. In the service **Settings** → **Source** (or **Deploy**): connect the **same repo**, set **branch** to **`staging`** (not `main`). Enable automatic deploys on push.
4. Add **PostgreSQL** for staging (new database plugin — do not share production DB). Set **`DATABASE_URL`** on the staging service to that database (variable reference is fine).
5. Copy auth env vars from production as needed (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`). Use **separate** Google OAuth clients (or extra redirect URIs) per environment so each `AUTH_URL` matches the service URL.

When you **push to `staging`**, Railway builds and runs `railway.toml`’s start command (`prisma migrate deploy` + `next start`). Run seed once against staging if you need data: `railway run --service <staging> npm run db:seed`.

### Every release to staging (merge main → staging)

From the repo root:

```bash
npm run staging:sync
```

This runs `scripts/push-staging.sh`: updates `main`, merges `main` into `staging`, and **`git push origin staging`**, which triggers the staging deploy on Railway.

Manual equivalent:

```bash
git checkout main && git pull
git checkout staging && git merge main --no-edit && git push origin staging
git checkout main
```

### CI (optional)

To run **`lint` + `build`** on every push to **`staging`**, copy the template into place and commit:

```bash
mkdir -p .github/workflows
cp scripts/staging-ci.github-actions.yml.example .github/workflows/staging-ci.yml
git add .github/workflows/staging-ci.yml && git commit -m "ci: staging workflow" && git push
```

That push needs a GitHub token with the **`workflow`** scope (or use GitHub Desktop). Until then, Railway still deploys from **`staging`**; you just skip GitHub Actions.

## Deploy on Railway

1. Create a **new project** → add **PostgreSQL** → add a service from **this GitHub repo** (or deploy with CLI).
2. In the **web service**, set `DATABASE_URL` to reference Postgres (Railway can inject `${{ Postgres.DATABASE_URL }}` when you link the database).
3. Set **`AUTH_SECRET`**, **`AUTH_URL`** (public Railway URL, no trailing slash), **`AUTH_GOOGLE_ID`**, **`AUTH_GOOGLE_SECRET`**, and add the matching **`/api/auth/callback/google`** redirect URI in Google Cloud for that URL.
4. **Build command:** `npx prisma generate && npm run build` (default Nixpacks often runs `npm run build` — already includes `prisma generate`).
5. **Start command:** `npx prisma migrate deploy && npm run start`
6. After first deploy, sign in once with Google, then optionally seed categories for your account:

   ```bash
   SEED_FOR_EMAIL=you@gmail.com railway run npm run db:seed
   ```

## CLI quick link

```bash
railway login
cd wealth-dashboard
railway link    # pick workspace + project
```

Each folder’s `.railway/` remembers which Railway project it uses.
