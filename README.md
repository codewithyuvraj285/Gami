# PARQH Admin

Admin dashboard for PARQH. React + Vite + TypeScript + Tailwind, talking directly to Supabase (Auth, Postgres, Storage, RLS). No server of its own, so it deploys as a static site on GitHub Pages.

## Modules
Dashboard · Orders (status timeline, tracking, cancel, return/refund) · Delivery · Leads & inquiries (CRM, follow-ups, WhatsApp, convert to order) · Customers · Products (photos, variants, publish/draft) · Categories · Inventory (stock in/out/adjust, history) · Coupons · Website content (banners, about, contact, social) · Reports (sales, product performance, lead conversion, CSV export) · Settings (brand, GST, shipping, COD, low-stock, admin users).

## Run locally
1. Set up Supabase first (see `../DOCUMENTATION/SETUP.md`).
2. `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev`

## Deploy to GitHub Pages
1. Push this folder to its own GitHub repo (branch `main`).
2. Repo → Settings → Secrets and variables → Actions → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Repo → Settings → Pages → Source: **GitHub Actions**. Every push to `main` deploys.

The app uses hash routing (`/#/orders`), so it works under any repo path.

## Security
Only the anon key is used. All admin rights come from the `admin_users` table and Row Level Security in `SUPABASE/01_schema.sql`; a logged-in non-admin sees nothing.
