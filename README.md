# Amul Fresh Express

Vite + React + Tailwind + Framer Motion + Supabase. Storefront at `/`, admin at `/admin`.

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste `supabase/migrations/001_amul_schema.sql` → Run.
3. Project Settings → API → copy the Project URL and the anon public key.

## 2. Run locally
```
cp .env.example .env     # fill in both values
npm install
npm run dev
```

## 3. Deploy on Vercel
Push to GitHub → Vercel → Import → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables → Deploy. `vercel.json` already handles the `/admin` route.

## Admin PIN
Default PIN is `1234`. Change it before going live (SQL Editor):
```
update admin_secrets set pin_hash = extensions.crypt('YOUR-NEW-PIN', extensions.gen_salt('bf'));
```
The PIN is checked inside the database on every admin action, so the anon key alone cannot read orders or edit products.

## Images
Put product images in `public/images/<slug>.png` (slug as shown in the products table), or paste an Image URL in Admin. If neither loads, a branded initial placeholder shows.
