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
