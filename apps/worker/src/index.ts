import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";

type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
  ADMIN_TOKEN?: string;
};

type StoryPage = {
  id: number;
  child_name: string;
  page_number: number;
  image_url: string;
  story_text: string;
  bg_color: string;
  created_at: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin ?? "*",
    allowHeaders: ["*"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

/**
 * Guard for write endpoints. If the ADMIN_TOKEN secret is not set,
 * the API is considered open (rely on Cloudflare Access on the /admin UI).
 */
function adminOnly(c: Context<{ Bindings: Bindings }>): Response | null {
  const expected = c.env.ADMIN_TOKEN;
  if (!expected) return null;
  if (c.req.header("x-admin-token") === expected) return null;
  return c.json({ error: "Unauthorized" }, 401);
}

app.get("/api/health", (c) => c.json({ ok: true }));

/** List of children with page counts - used by the landing page. */
app.get("/api/children", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT child_name AS name, COUNT(*) AS pageCount
     FROM storybook_pages
     GROUP BY child_name
     ORDER BY MIN(page_number) ASC`
  ).all<{ name: string; pageCount: number }>();
  return c.json(results);
});

/** All pages of one child's book, ordered. ?child=vena */
app.get("/api/pages", async (c) => {
  const child = (c.req.query("child") ?? "").trim().toLowerCase();
  if (!child) return c.json({ error: "Missing 'child' query parameter" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM storybook_pages
     WHERE LOWER(child_name) = ?
     ORDER BY page_number ASC`
  )
    .bind(child)
    .all<StoryPage>();
  return c.json(results);
});

/** Stream images straight out of R2 (immutable, cached for a year). */
app.get("/api/images/:key{.*}", async (c) => {
  const key = c.req.param("key");
  if (!key) return c.text("Not found", 404);

  const object = await c.env.IMAGES.get(key);
  if (!object) return c.text("Not found", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

/** Upload a new page: multipart form with image, child_name, story_text, bg_color. */
app.post("/api/pages", async (c) => {
  const forbidden = adminOnly(c);
  if (forbidden) return forbidden;

  const body = await c.req.parseBody();

  const childName = String(body["child_name"] ?? "").trim();
  const storyText = String(body["story_text"] ?? "").trim();
  const rawBg = String(body["bg_color"] ?? "");
  const bgColor = /^#[0-9a-fA-F]{6}$/.test(rawBg) ? rawBg.toUpperCase() : "#F0F8FF";
  const image = body["image"];

  if (!childName) return c.json({ error: "child_name is required" }, 400);
  if (!storyText) return c.json({ error: "story_text is required" }, 400);
  if (typeof image !== "object" || !(image instanceof File)) {
    return c.json({ error: "A PNG image file is required" }, 400);
  }
  if (image.type !== "image/png" && !image.name.toLowerCase().endsWith(".png")) {
    return c.json({ error: "Only PNG images are supported" }, 400);
  }

  // Upload to R2, keyed by child slug so images are easy to browse in the dashboard.
  const slug = childName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const key = `${slug}/${Date.now()}-${crypto.randomUUID()}.png`;
  await c.env.IMAGES.put(key, image, { httpMetadata: { contentType: "image/png" } });

  // Append after the current last page.
  const row = await c.env.DB.prepare(
    `SELECT COALESCE(MAX(page_number), 0) AS maxPage
     FROM storybook_pages
     WHERE LOWER(child_name) = ?`
  )
    .bind(childName.toLowerCase())
    .first<{ maxPage: number }>();
  const pageNumber = (row?.maxPage ?? 0) + 1;

  const imageUrl = `/api/images/${key}`;
  await c.env.DB.prepare(
    `INSERT INTO storybook_pages (child_name, page_number, image_url, story_text, bg_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(childName, pageNumber, imageUrl, storyText, bgColor, new Date().toISOString())
    .run();

  return c.json({ ok: true, child_name: childName, page_number: pageNumber });
});

export default app;
