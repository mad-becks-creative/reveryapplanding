-- Waitlist signups from the revery.club landing page.
-- Applied with: npx wrangler d1 execute revery-waitlist --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source     TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email ON waitlist (email);
