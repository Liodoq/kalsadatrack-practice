# KalsadaTrack

A crowdsourced map of unfinished roadworks across Metro Manila (NCR). Commuters pin a roadwork, the community confirms it is still unfinished, and everyone rates the inconvenience. Cities are ranked by data.

> Practice build for the AppBuildersPH hackathon (Oct 2026). A neutral commuter status tool: reports hold observable facts only.

## Features

- **Map:** pins for every public report, city and status filters (Unfinished, Resumed, Reported finished), a preview card with a live "days unfinished" counter.
- **Submit report:** map pin (or "use my location"), city, street, date first noticed, optional factual description, 1–3 photos (5 MB max, EXIF stripped in the browser), warning when a similar report exists within 50 m.
- **Report details:** photo gallery, confirmations ("still unfinished", once per user per day, Verified at 3 people), 1–5 inconvenience rating (one per user, editable), flagging.
- **City rankings:** by active reports or average inconvenience.
- **Admin:** flagged-report table and all-reports table; hide, restore, delete, change status, dismiss flags; loading, error, and empty states.
- **Server-side rules:** Postgres triggers reject future dates and locations outside NCR (HTTP 400), Row Level Security on every table.

## Tech stack

React 19 + Vite + TypeScript · react-router-dom · Leaflet / react-leaflet (OpenStreetMap tiles) · Supabase (Postgres, Auth, Storage, RLS) · Vercel

## Setup

1. `npm install`
2. Create `.env.local` in this folder (it is git-ignored):
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. In Supabase **SQL Editor**, run the files in `supabase/migrations/` in order:

   | File | Purpose |
   |---|---|
   | 0001_tables.sql | Tables and indexes |
   | 0002_profile_trigger.sql | Auto-create profile on sign-up |
   | 0003_rls.sql | Row Level Security + `is_admin()` |
   | 0004_storage.sql | `report-photos` bucket and policies |
   | 0005_seed_cities.sql | 17 NCR cities |
   | 0006_verify.sql | Checks (all rows `ok = true`) |
   | 0007_rules.sql | Date/NCR checks, verification, photo limit |
   | 0008_views.sql | `report_summaries`, `city_rankings`, `flagged_reports` |
   | 0009_make_admin.sql | Run after signing up (edit the email) |
   | 0010_demo_data.sql | 18 demo reports (after 0009) |

4. For quick testing, turn off **Authentication → Providers → Email → Confirm email**, or confirm via the email link.
5. `npm run dev` and open http://localhost:5173

## Deploy (Vercel)

Import the repo, set **Root Directory** to `kalsadatrack-practice`, add the two `VITE_` env variables, deploy. `vercel.json` rewrites all routes to `index.html`. In Supabase **Authentication → URL Configuration**, add the Vercel URL as the Site URL.

## Privacy and safety

- Public profiles show a display name only. Data collected: email, display name, reports, photos, confirmations, ratings, flags.
- Photos are re-encoded in the browser, which removes EXIF (GPS, device, time).
- The form has no fields for naming officials, contractors, or individuals.

## Open-source libraries

- **Libraries:** @supabase/supabase-js, react, react-dom, react-router-dom, leaflet, react-leaflet, Vite, TypeScript, oxlint.
- **Map:** © OpenStreetMap contributors.
