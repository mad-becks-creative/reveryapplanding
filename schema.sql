-- Waitlist signups from the revery.club landing page.
--
--   npx wrangler d1 execute revery-waitlist --remote --file=./schema.sql
--
-- Idempotent, so it is safe to re-run against local and remote.

CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  source     TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at);
