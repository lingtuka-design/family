-- Adds the book-covers table (one cover per child) to an existing database.
-- Apply to production:  npx wrangler d1 execute family-storybook --remote --file migrations/002_add_covers.sql

CREATE TABLE IF NOT EXISTS storybook_covers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  child_name  TEXT NOT NULL UNIQUE,           -- e.g. "Vena" or "Kimi"
  image_url   TEXT NOT NULL,                  -- R2 key path, e.g. /api/images/covers/vena-1699999999999-abc.png
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
