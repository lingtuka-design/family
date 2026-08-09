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
  title: string;
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
    allowHeaders: ["Content-Type", "x-admin-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/** Accepted image formats - the flipbook crops everything to a 3:2 cover. */
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function keyFromUrl(imageUrl: string): string {
  return imageUrl.replace(/^\/api\/images\//, "");
}

app.get("/api/health", (c) => c.json({ ok: true }));

/** List of children with page counts - used by the admin dropdown and landing page. */
app.get("/api/children", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT child_name AS name, COUNT(*) AS pageCount
     FROM storybook_pages
     GROUP BY child_name
     ORDER BY MIN(page_number) ASC`
  ).all<{ name: string; pageCount: number }>();
  return c.json(results);
});

/** Pages of one child (public flipbook) or ALL pages when ?child is omitted (admin). */
app.get("/api/pages", async (c) => {
  const child = (c.req.query("child") ?? "").trim().toLowerCase();

  if (child) {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM storybook_pages
       WHERE LOWER(child_name) = ?
       ORDER BY page_number ASC`
    )
      .bind(child)
      .all<StoryPage>();
    return c.json(results);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM storybook_pages
     ORDER BY child_name ASC, page_number ASC`
  ).all<StoryPage>();
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

/** Upload a new page: multipart with image, child_name, title, story_text, bg_color. */
app.post("/api/pages", async (c) => {
  const forbidden = adminOnly(c);
  if (forbidden) return forbidden;

  const body = await c.req.parseBody();

  const childName = String(body["child_name"] ?? "").trim();
  const title = String(body["title"] ?? "").trim();
  const storyText = String(body["story_text"] ?? "").trim();
  const rawBg = String(body["bg_color"] ?? "");
  const bgColor = /^#[0-9a-fA-F]{6}$/.test(rawBg) ? rawBg.toUpperCase() : "#F0F8FF";
  const image = body["image"];

  if (!childName) return c.json({ error: "child_name is required" }, 400);
  if (!storyText) return c.json({ error: "story_text is required" }, 400);
  if (typeof image !== "object" || !(image instanceof File)) {
    return c.json({ error: "An image file is required" }, 400);
  }
  const ext = IMAGE_TYPES[image.type];
  if (!ext) return c.json({ error: "Only PNG, JPG, WebP or GIF images are supported" }, 400);

  // Upload to R2, keyed by child slug so images are easy to browse in the dashboard.
  const key = `${slugify(childName)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, image, { httpMetadata: { contentType: image.type } });

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
  const result = await c.env.DB.prepare(
    `INSERT INTO storybook_pages (child_name, page_number, title, image_url, story_text, bg_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(childName, pageNumber, title, imageUrl, storyText, bgColor, new Date().toISOString())
    .run();

  return c.json({ ok: true, id: result.meta.last_row_id, child_name: childName, page_number: pageNumber });
});

/** Update a page: multipart with any of child_name, title, story_text, bg_color, image. */
app.put("/api/pages/:id", async (c) => {
  const forbidden = adminOnly(c);
  if (forbidden) return forbidden;

  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Invalid page id" }, 400);

  const existing = await c.env.DB.prepare(
    `SELECT * FROM storybook_pages WHERE id = ?`
  )
    .bind(id)
    .first<StoryPage>();
  if (!existing) return c.json({ error: "Page not found" }, 404);

  const body = await c.req.parseBody();

  const childName = String(body["child_name"] ?? "").trim() || existing.child_name;
  const title = String(body["title"] ?? "").trim() || existing.title;
  const storyText = body["story_text"] !== undefined ? String(body["story_text"]).trim() : existing.story_text;
  const rawBg = String(body["bg_color"] ?? "");
  const bgColor = /^#[0-9a-fA-F]{6}$/.test(rawBg) ? rawBg.toUpperCase() : existing.bg_color;

  let imageUrl = existing.image_url;
  const image = body["image"];
  if (image && typeof image === "object" && image instanceof File) {
    const ext = IMAGE_TYPES[image.type];
    if (!ext) return c.json({ error: "Only PNG, JPG, WebP or GIF images are supported" }, 400);

    const key = `${slugify(childName)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    await c.env.IMAGES.put(key, image, { httpMetadata: { contentType: image.type } });
    imageUrl = `/api/images/${key}`;

    // Remove the old image from R2 (best effort).
    const oldKey = keyFromUrl(existing.image_url);
    await c.env.IMAGES.delete(oldKey).catch(() => {});
  }

  // If the page moved to another child, renumber it after the new child's last page.
  let pageNumber = existing.page_number;
  if (childName.toLowerCase() !== existing.child_name.toLowerCase()) {
    const row = await c.env.DB.prepare(
      `SELECT COALESCE(MAX(page_number), 0) AS maxPage
       FROM storybook_pages
       WHERE LOWER(child_name) = ?`
    )
      .bind(childName.toLowerCase())
      .first<{ maxPage: number }>();
    pageNumber = (row?.maxPage ?? 0) + 1;
  }

  await c.env.DB.prepare(
    `UPDATE storybook_pages
     SET child_name = ?, page_number = ?, title = ?, image_url = ?, story_text = ?, bg_color = ?
     WHERE id = ?`
  )
    .bind(childName, pageNumber, title, imageUrl, storyText, bgColor, id)
    .run();

  return c.json({ ok: true, id, page_number: pageNumber });
});

/** Delete a page (and its image from R2). */
app.delete("/api/pages/:id", async (c) => {
  const forbidden = adminOnly(c);
  if (forbidden) return forbidden;

  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Invalid page id" }, 400);

  const existing = await c.env.DB.prepare(
    `SELECT * FROM storybook_pages WHERE id = ?`
  )
    .bind(id)
    .first<StoryPage>();
  if (!existing) return c.json({ error: "Page not found" }, 404);

  await c.env.DB.prepare(`DELETE FROM storybook_pages WHERE id = ?`).bind(id).run();
  await c.env.IMAGES.delete(keyFromUrl(existing.image_url)).catch(() => {});

  return c.json({ ok: true, id });
});

export default app;
