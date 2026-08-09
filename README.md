# 📖 Family Storybook (Living Storybook)

An online, responsive flipbook where you can keep adding pages as your children grow.
Built with **React + Vite + TypeScript + Tailwind** (frontend), **Hono on Cloudflare Workers**
(API), **D1** (SQLite database), **R2** (image storage) and **Cloudflare Zero Trust / Access**
(protects the `/admin` route with Google login).

## Architecture

```
Browser
 ├── /            Home page — avatar per child ("Vena's Book", "Kimi's Book")
 ├── /book/vena   Flipbook viewer (react-pageflip) — 2-page spread on desktop,
 │                single stacked page on mobile; images lazy-loaded near the current spread
 └── /admin       Mini-CMS form — protected at the network level by Cloudflare Access
                       │
                       ▼  (REST /api)
              Cloudflare Worker (Hono)   ──► D1 (storybook_pages)
                       │
                       └──► R2 (PNG images, streamed back via /api/images/:key)
```

## Folder structure

```
Family book/
├── package.json                  # npm workspaces root (web + worker)
├── README.md
├── apps/
│   ├── web/                      # React + Vite + TS + Tailwind (Cloudflare Pages)
│   │   ├── index.html
│   │   ├── vite.config.ts        # dev proxy /api → local worker (:8787)
│   │   ├── tailwind.config.js
│   │   └── src/
│   │       ├── main.tsx          # TanStack Query + Router providers
│   │       ├── router.tsx        # route tree (/, /book/$childId, /admin)
│   │       ├── types.ts
│   │       ├── api/client.ts     # fetchPages / fetchChildren / addPage
│   │       ├── routes/
│   │       │   ├── __root.tsx    # layout route
│   │       │   ├── home.tsx      # landing page with child avatars
│   │       │   ├── book.tsx      # /book/$childId wrapper
│   │       │   └── admin.tsx     # /admin wrapper
│   │       └── components/
│   │           ├── Flipbook.tsx  # responsive react-pageflip viewer + lazy images
│   │           └── AdminForm.tsx # mini-CMS form
│   └── worker/                   # Cloudflare Worker (Hono)
│       ├── wrangler.toml         # D1 + R2 bindings
│       ├── schema.sql            # D1 table
│       └── src/index.ts          # /api/health, /api/children, /api/pages,
│                                 # /api/images/:key, POST /api/pages
```

## 1. Install

```bash
npm install
```

## 2. Local development

```bash
npm run db:apply      # create the D1 table in local dev (miniflare SQLite)
npm run dev           # starts both: Vite on :5173 + Worker on :8787
```

Open http://localhost:5173 — `/api/*` is proxied to the local worker automatically.
Add a page at http://localhost:5173/admin.

## 3. Cloudflare setup (one time)

```bash
npx wrangler login

# D1 database
npx wrangler d1 create family-storybook
# → copy the returned database_id into apps/worker/wrangler.toml (replace the placeholder)

# R2 bucket
npx wrangler r2 bucket create family-storybook-images
```

Then apply the schema to the **remote** database:

```bash
npm run db:apply:prod
```

## 4. Protect /admin with Cloudflare Zero Trust (Google login)

The `/admin` route is protected at the network level — the app itself contains no
auth code, the firewall blocks access before any page loads.

1. Cloudflare dashboard → **Zero Trust** → **Access → Applications** → **Add an application**.
2. Type **Self-hosted**; domain: `<your-project>.pages.dev`; path: `admin`.
3. **Add a policy**: policy name "Family admins", action **Allow**, session duration e.g. 1 week.
4. Under *Rules*: Include → **Emails** → type the Google accounts allowed to manage the book
   (e.g. `you@example.com`).
5. *Authentication methods*: enable **Google** (Add → One-time PIN works too, but Google
   OIDC gives the requested login-with-Google experience; Zero Trust guides you through
   setting up Google as an IdP in **Settings → Authentication**).

Visitors hitting `/admin*` now see the Access login screen. The rest of the site stays public.

> Optional extra layer: protect the Worker's write endpoint with a secret token.
> `npx wrangler secret put ADMIN_TOKEN` (set it on the worker), then build the site with
> `VITE_ADMIN_TOKEN` set to the same value. The admin form sends it as `x-admin-token`.
> If the secret is not set, writes are open (fine when only Access-authorized users
> reach the admin UI).

## 5. Deploy

```bash
# 1) Worker API
npm run deploy:worker                       # → https://family-storybook-api.inkhel.workers.dev

# 2) Frontend (the repo's apps/web/.env.production already sets VITE_API_BASE)
npm run build:web
npx wrangler pages deploy apps/web/dist --project-name family-storybook --branch main
# --branch main is REQUIRED: it is the project's production branch, otherwise the
# deployment only reaches a preview URL and https://family-storybook.pages.dev stays 404.
```

Windows PowerShell example:

```powershell
$env:VITE_API_BASE = "https://family-storybook-api.<account>.workers.dev"
npm run build:web
npx wrangler pages deploy apps/web/dist
```

Re-deploy the frontend whenever you change the storybook UI; the Worker and database
persist independently.

## Database schema

```sql
CREATE TABLE storybook_pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  child_name  TEXT NOT NULL,                       -- "Vena", "Kimi", ...
  page_number INTEGER NOT NULL,                    -- order inside the book
  image_url   TEXT NOT NULL,                       -- R2 key served via /api/images/:key
  story_text  TEXT NOT NULL DEFAULT '',
  bg_color    TEXT NOT NULL DEFAULT '#F0F8FF',     -- page background hex
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API reference

| Method | Path                    | Description                                       |
| ------ | ----------------------- | ------------------------------------------------- |
| GET    | `/api/health`           | Liveness check                                    |
| GET    | `/api/children`         | `[{ name, pageCount }]` for the admin dropdown    |
| GET    | `/api/pages?child=vena` | Pages of one child, ordered by `page_number`      |
| GET    | `/api/pages`            | All pages (admin panel)                           |
| GET    | `/api/images/:key`      | Streams an image straight from R2 (1-year cache)  |
| POST   | `/api/pages`            | New page: multipart `image` (PNG/JPG/WebP/GIF), `child_name`, `title`, `story_text`, `bg_color` |
| PUT    | `/api/pages/:id`        | Update a page (all fields optional; `image` replaces the picture) |
| DELETE | `/api/pages/:id`        | Delete a page (also removes its image from R2)    |
| GET    | `/api/covers`           | Book covers with page counts (home page)          |
| POST   | `/api/covers`           | Add a cover: multipart `image` + `child_name`     |
| PUT    | `/api/covers/:id`       | Update a cover (name and/or image)                |
| DELETE | `/api/covers/:id`       | Delete a cover (also removes its image from R2)   |

## Notes

- **Home page**: book covers in the standard portrait 2:3 ratio, three per row on desktop.
  Children without a cover yet get a gradient placeholder. A dashed "Add a book cover" card
  links straight to the admin section (`/admin#covers`). Clicking a cover opens the book.
- **Responsive flipbook**: each page is a post-style page - a 3:2 cover photo at the top
  (any image format is auto-cropped to fit), the heading title below it, the story content
  beneath that, and the page number pinned to the bottom. Desktop shows a 2-page spread
  (two complete pages side by side); below 768px a single page per screen. The book remounts
  on layout changes so page sizes stay correct.
- `react-pageflip` requires `react@18` — do not upgrade React to 19 in this project.
