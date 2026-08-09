# AGENTS.md

## Required workflow (always, in this order)

1. **Pull first** from GitHub: `git pull origin master` (or `git fetch` + rebase) before any work.
   The repo is edited concurrently by multiple AI tools (Antigravity and Opencode) — never assume
   local state is current.
2. Make changes.
3. **Deploy to Cloudflare with Wrangler** (if the change affects the deployed app):
   - Frontend (Pages): `npm run build:web`, then `npx wrangler pages deploy apps/web/dist`
   - API (Workers): `npm run deploy:worker` (deploys `apps/worker` via `wrangler.toml`)
4. **Push back to GitHub**: `git add -A && git commit && git push origin master`.

If no Cloudflare deployment is needed (docs, config, etc.), skip step 3 and push to GitHub.

## Project layout

- `apps/web` — React + Vite + Tailwind + TanStack Router/Query + react-pageflip (Cloudflare Pages)
- `apps/worker` — Hono Worker with D1 (`storybook_pages` table) + R2 bindings (see `wrangler.toml`)
- Repo: https://github.com/lingtuka-design/family.git (branch `master`)

## Local commands

- `npm install` (first time)
- `npm run db:apply` — apply D1 schema locally (miniflare)
- `npm run db:apply:prod` — apply D1 schema to remote
- `npm run dev` — Vite (:5173) + Worker (:8787) together
- `npm run typecheck` — typecheck both apps
- `npm run build:web` — production build (output: `apps/web/dist`)

## Gotchas

- `react-pageflip` requires React 18 — do not upgrade to React 19.
- `VITE_API_BASE` must be set to the deployed Worker URL when building for production.
- Git identity is configured locally in this repo (lingtuka-design).
