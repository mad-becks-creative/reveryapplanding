# reveryapplanding

The marketing site for revery — hand-written static HTML, no build step.
Hosted on Cloudflare Pages (project `reveryapplanding`), Git-connected:
**pushing `main` deploys to https://revery.club.**

```
index.html                              landing page
privacy/, terms/, legal.css             legal pages
_headers                                content type for the file below
.well-known/apple-app-site-association  universal links — the iOS app depends on this
_routes.json                            confines Functions to /api/*
functions/api/waitlist.js               POST /api/waitlist — waitlist signups
schema.sql                              the D1 table behind it
```

## Waitlist

Signups land in a Cloudflare D1 database bound to the Pages project as `DB`.
Stored per signup: email, timestamp, and which form it came from. Nothing else.

### One-time setup

```sh
npx wrangler login
npx wrangler d1 create revery-waitlist --location enam          # US, per the privacy policy
npx wrangler d1 create revery-waitlist-preview --location enam  # keeps test rows out of the real list
npx wrangler d1 execute revery-waitlist         --remote --file=./schema.sql
npx wrangler d1 execute revery-waitlist-preview --remote --file=./schema.sql
```

Then in the dashboard — Workers & Pages → `reveryapplanding` → Settings → Bindings —
add a D1 binding named `DB`: `revery-waitlist` for Production, `revery-waitlist-preview`
for Preview. Bindings only take effect on the next deployment.

### Reading the list

```sh
npx wrangler d1 execute revery-waitlist --remote \
  --command "SELECT email, created_at, source FROM waitlist ORDER BY created_at DESC"

npx wrangler d1 execute revery-waitlist --remote --json \
  --command "SELECT email FROM waitlist ORDER BY created_at" | jq -r '.[0].results[].email'

npx wrangler d1 export revery-waitlist --remote --table waitlist --output ./waitlist-export.sql
```

### Local development

`wrangler.toml` is gitignored because it is only needed locally — and because the
build output directory is the repo root, so anything committed here is served
publicly. Create it with the `database_id` printed by `d1 create`:

```toml
name = "reveryapplanding"
compatibility_date = "2026-09-19"

# No pages_build_output_dir: that key would make this file the source of truth
# for the Pages project and turn the dashboard settings read-only.

[[d1_databases]]
binding = "DB"
database_name = "revery-waitlist"
database_id = "..."
```

```sh
npx wrangler d1 execute revery-waitlist --local --file=./schema.sql
npx wrangler pages dev . --port 8788
```

Deploys roll back from the Pages dashboard ("Rollback to this deployment"), or with
`git revert` + push.
