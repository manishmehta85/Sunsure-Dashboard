# SunSure Project Task Dashboard
## Deployment Guide — React + Supabase + Vercel

---

## STEP 1 — Set up Supabase (free database, 5 min)

1. Go to https://supabase.com → Sign up (free)
2. Click **"New Project"** → give it a name like `sunsure-tracker` → set a DB password → Create
3. Wait ~1 min for it to spin up
4. Go to **SQL Editor** (left sidebar) → click **"New Query"**
5. Open the file `supabase_schema.sql` from this folder, copy ALL contents, paste into the editor → click **Run**
6. You should see "Success" and your 22 projects are now seeded

### Get your Supabase keys:
- Go to **Project Settings** → **API**
- Copy:
  - **Project URL** (looks like `https://abcdefgh.supabase.co`)
  - **anon / public key** (long string starting with `eyJ...`)
- Keep these handy for Step 3

---

## STEP 2 — Upload code to GitHub (3 min)

1. Go to https://github.com → Sign up / Log in
2. Click **"New repository"** → name it `sunsure-dashboard` → Public or Private → **Create**
3. On your computer, open Terminal / Command Prompt in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sunsure-dashboard.git
git push -u origin main
```

---

## STEP 3 — Deploy to Vercel (2 min)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **"Add New Project"** → Import your `sunsure-dashboard` repo
3. Vercel will auto-detect it as a React app — no build settings needed
4. Before clicking Deploy, click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `REACT_APP_SUPABASE_URL` | your Supabase Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | your Supabase anon key |

5. Click **Deploy** → wait ~2 min
6. Vercel gives you a live URL like `https://sunsure-dashboard.vercel.app` ✅

---

## STEP 4 — Share with your team

- Share the Vercel URL with your team — they can open it in any browser
- No login needed (open access as configured)
- Everyone can create/edit tasks and add weekly updates in real time
- All data is stored in Supabase (cloud PostgreSQL) permanently

---

## Daily Use Guide

### Add a new task:
- Click a project in the sidebar → click **"+ Add Task"**
- Fill in: title, owner, priority, status, target date → Create

### Add a weekly update:
- Click any task title → a detail panel opens
- Type your update in the text box → optionally change status → **Post Update**
- Every update is timestamped and saved permanently

### View overdue tasks:
- Click **"All Tasks"** in the sidebar → filter by **"Overdue"**
- Or open any project → click the **"Overdue"** filter tab

### Add a new project:
- Click **"+ New Project"** on the Dashboard page

---

## Local Development (optional)

```bash
# Install dependencies
npm install

# Copy env file and fill in your Supabase keys
cp .env.example .env

# Start locally
npm start
# Opens at http://localhost:3000
```

---

## Folder Structure

```
project-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sidebar.js / .css
│   │   ├── TaskModal.js
│   │   ├── TaskDetailModal.js / .css
│   │   └── ProjectModal.js
│   ├── pages/
│   │   ├── Dashboard.js / .css
│   │   ├── ProjectPage.js / .css
│   │   └── AllTasks.js / .css
│   ├── lib/
│   │   └── supabase.js
│   ├── App.js / .css
│   ├── index.js
│   └── index.css
├── supabase_schema.sql   ← run this in Supabase first
├── vercel.json
├── package.json
├── .env.example
└── .gitignore
```

---

## Need to update the app later?

Just edit any file locally and run:
```bash
git add . && git commit -m "update" && git push
```
Vercel will automatically redeploy within ~1 minute.
# Sunsure-Dashboard
