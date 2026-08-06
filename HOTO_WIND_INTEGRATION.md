# Wind layout for the SunSure portal

Adds a **layout choice** to projects. When you create a project you pick:

- **Normal layout** → your existing task list (unchanged).
- **Wind layout** → the HOTO milestone tracker (WTG locations across the 20 land/HOTO
  gates: WRA → Farmer Consent → SPOCA → Pre ATL/ATS → 11E → … → HOTO).

A wind project opens the tracker inside your portal (same sidebar, behind your login),
editable for admin/editor and read-only for viewer. A **default Wind project “Bijapur”**
is seeded from the v3 workbook so it works out of the box.

## Files → where they go

| Bundle file | Destination in your repo |
|---|---|
| `public/hoto-dashboard.html` | `public/hoto-dashboard.html` |
| `src/components/ProjectModal.js` | replace `src/components/ProjectModal.js` |
| `src/pages/ProjectPage.js` | replace `src/pages/ProjectPage.js` |
| `supabase/hoto_migration.sql` | run in Supabase SQL editor (first) |
| `supabase/hoto_seed.sql` | run in Supabase SQL editor (second) |

## Steps
1. **Supabase** → run `hoto_migration.sql` (adds `projects.layout`, creates
   `hoto_locations`), then `hoto_seed.sql` (default Bijapur wind project + 58 locations).
2. **Dashboard file** → copy `public/hoto-dashboard.html` into `public/`, and paste your
   `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` values into the two constants
   near the top of its `<script>` (same values your app uses).
3. **React** → replace `ProjectModal.js` and `ProjectPage.js` with the versions here.
   No changes needed to `App.js`, `Sidebar.js`, or routing — wind projects reuse the
   existing `/project/:id` route and just render differently.
4. **Deploy** → commit & push (Vercel serves `/hoto-dashboard.html` directly; the SPA
   rewrite doesn’t touch real files).

Open the portal → you’ll see **Bijapur** in the project list → it opens the wind tracker.
Create a new project → choose **Wind layout** → it opens an empty tracker; use its
**Import CSV/JSON** to load that farm’s WTG list (or add locations there).

## How it fits together
- `ProjectModal` writes `layout: 'normal' | 'wind'` on the `projects` row.
- `ProjectPage` reads it: `wind` → renders
  `/hoto-dashboard.html?embed=1&project=<name>` (adds `&readonly=1` for viewers);
  `normal` → your task table as before.
- The wind dashboard is **locked to that project** via the `project=` param (its own
  project switcher is hidden) and reads/writes `hoto_locations` where `project = <name>`,
  so the portal project name must match the `project` value in `hoto_locations`
  (the seed uses `Bijapur`).

## Notes
- **New wind projects start empty** (no `hoto_locations` rows yet) — import a CSV/JSON
  from inside the tracker to populate them.
- **Height:** the iframe is `100vh`. If your `.app-main` adds top padding, change the
  style in `ProjectPage.js` to `height: calc(100vh - <padding>)`.
- **Security:** `hoto_locations` uses an open policy to match your current anon-client
  model. If you move the portal onto Supabase Auth later, I can switch it to role-based
  policies keyed to `user_roles`.
- Data came from `HOTO_Tracker_Bijapur (v3)`, Sheet1: the 16 sheet milestones plus the
  four earlier gates (seeded Done where 11E is already reached, else Pending — editable).
