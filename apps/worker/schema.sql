-- Family Storybook - D1 schema
-- Apply locally:  npm run db:apply
-- Apply to prod:  npm run db:apply:prod

DROP TABLE IF EXISTS storybook_pages;

CREATE TABLE storybook_pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  child_name  TEXT NOT NULL,                 -- e.g. "Vena" or "Kimi"
  page_number INTEGER NOT NULL,              -- ordering of pages in the book
  title       TEXT NOT NULL DEFAULT '',      -- heading shown on the page
  image_url   TEXT NOT NULL,                 -- R2 key path, e.g. /api/images/vena/1699999999999-abc.png
  story_text  TEXT NOT NULL DEFAULT '',      -- page content
  bg_color    TEXT NOT NULL DEFAULT '#F0F8FF', -- hex color of the page background
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_storybook_pages_child ON storybook_pages (child_name, page_number);
