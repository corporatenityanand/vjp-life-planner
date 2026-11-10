# VJP Life Planner

A daily planner for Finance, Fitness and Family: Top 3 for the day, the contracts Projects tracker, goals, a focus timer, a quit tracker and a weekly review.

It's one static page (`index.html`) hosted on GitHub Pages. Your data lives in **your Google Sheet**, which a small Apps Script (`apps-script/Code.gs`) reads and writes. Nothing is stored in this repository.

## Setup (once)

1. **Sheet script.** Open the Google Sheet "VJP Life Planner Data", then go to Extensions → Apps Script. Replace everything in `Code.gs` with `apps-script/Code.gs` from this repo, and set `TOKEN` to your secret. Click Save.
2. **Deploy.** Choose Deploy → New deployment → type **Web app**. Set Execute as **Me** and Who has access **Anyone**, then click Deploy and approve the permissions. Copy the **Web app URL** (it ends in `/exec`).
3. **Website.** On GitHub, go to Settings → Pages and set Source to *Deploy from a branch*, Branch `main`, folder `/ (root)`. The site goes live at `https://<user>.github.io/<repo>/`.
4. **Connect.** Open the site and go to the **Review** tab. At the bottom, paste the Web app URL and the token, then click *Connect Sheet*. Do this once on each device.

## Saving

- **Save** (top right) pushes every change to the Sheet and tells you whether it worked, or what went wrong.
- It also autosaves 2.5 seconds after you stop typing.
- Unsaved changes are kept in the browser until the Sheet confirms them, so a refresh never loses an edit.

## Changing the script later

After you edit `Code.gs`, go to Deploy → Manage deployments → edit (pencil icon) → Version: *New version* → Deploy. That keeps the same URL.

## Data format

Tab `Store`: one row per record. The columns are `key`, `updated` and the JSON, which is split across columns C onward when it's long. Records: `settings`, `projects`, `goals`, `vices`, `weeks`, `fitlog`, `famlog`, `tasks-YYYY-MM`, `tasks-someday`, `focus-YYYY-MM`.


## Version 2 (React + shadcn/ui)

The site at the repo root is now built from `app/` (Vite, React, Tailwind, shadcn/ui components in `app/src/components/ui`).
It uses the same Google Sheet and Apps Script as v1, so nothing changes on the Sheet side.

- Develop: `cd app && npm install && npm run dev`
- Publish: `cd app && npm run deploy` (type-checks, builds, copies `index.html` + `assets/` to the repo root), then commit and push.
- v1 is kept at `legacy.html` for Fitness and Family until those are rebuilt.

Data model added in v2: `work` (companies, functions, goals per year/month/week, sales orders), `net` (networking meetings);
tasks gain `company`, `fn`, `order`, `week`. On first load v2 moves the v1 `projects` sites into sales orders and their open items into tasks
(the `projects` record is left untouched as a backup).
