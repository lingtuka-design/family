-- Adds the page title field to an existing database.
-- Apply to production:  npx wrangler d1 execute family-storybook --remote --file migrations/001_add_title.sql
-- (DO NOT re-run schema.sql on production - it drops the table!)

ALTER TABLE storybook_pages ADD COLUMN title TEXT NOT NULL DEFAULT '';
