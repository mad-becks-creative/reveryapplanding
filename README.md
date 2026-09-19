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
npx wrangler d1 create revery-waitlist --location oc          # Oceania — see note below
npx wrangler d1 create revery-waitlist-preview --location oc  # keeps test rows out of the real list
npx wrangler d1 execute revery-waitlist         --remote --file=./schema.sql
npx wrangler d1 execute revery-waitlist-preview --remote --file=./schema.sql
```

`--location` is a hint, not a guarantee — Cloudflare places the database in the
nearest available location to the one you ask for. Only `eu`, `fedramp` and `us` can
be *guaranteed*, via `--jurisdiction`, and there is no Oceania jurisdiction. The
privacy policy names no country, so wherever it lands is fine; check the dashboard
(Storage & Databases → D1) if you want to know.

Then in the dashboard — Workers & Pages → `reveryapplanding` → Settings → Bindings —
add a D1 binding named `DB`: `revery-waitlist` for Production, `revery-waitlist-preview`
for Preview. Bindings only take effect on the next deployment.

### Spam protection

Two layers: an off-screen honeypot field, and **Cloudflare Turnstile** in **invisible**
mode — no widget renders for anyone. The widget was created with Turnstile Spin's CLI:

```sh
npx wrangler turnstile widget create "revery.club (Spin)" \
  --domain revery.club --domain reveryapplanding.pages.dev \
  --domain localhost --domain 127.0.0.1 --mode invisible
```

The sitekey is public and lives in `index.html`. The secret is a Pages secret named
`TURNSTILE_SECRET`, set on **both** environments (`--env preview` for the second):

```sh
npx wrangler pages secret put TURNSTILE_SECRET --project-name reveryapplanding
npx wrangler pages secret list --project-name reveryapplanding
```

The endpoint **fails closed**: no secret returns 500, a rejected or missing token returns
403. A misconfiguration stops signups rather than silently letting bots through, so watch
for it after any change to secrets or deployment settings.

`localhost` and `127.0.0.1` are registered hostnames on the widget, so local development
in a **real browser** uses the real sitekey as-is. Put the real secret in `.dev.vars`
(gitignored):

```sh
npx wrangler turnstile widget get 0x4AAAAAAE8tK2_JeXg6lsEC --json \
  | python3 -c 'import json,sys;print("TURNSTILE_SECRET=\"%s\"" % json.load(sys.stdin)["secret"])' \
  > .dev.vars
```

To exercise the failure paths, swap `.dev.vars` to Turnstile's always-fail test secret
`2x0000000000000000000000000000000AA` (403), or delete the file entirely (500, fail closed).

**Automated browsers cannot pass the real widget.** Invisible mode declines to issue a token
to headless Chrome — no error, the token input just stays empty and the submit gets a 403.
That is the feature working, not a bug, but it means any scripted end-to-end test of the
*success* path must use Turnstile's always-pass test keys: sitekey `1x00000000000000000000BB`
in `index.html` and secret `1x0000000000000000000000000000000AA` in `.dev.vars`. Verifying
the success path against the real widget requires a human in a real browser.

**If real people report being blocked**, invisible mode is turning them away and they have
no checkbox to click. Watch for it:

```sh
npx wrangler pages deployment tail <deployment-id> --project-name reveryapplanding
```

`waitlist challenge failed` at any volume is the signal. The fix is to change the widget to
**managed** mode in the dashboard — no code change: the CSS already lets a real checkbox lay
out normally once Turnstile renders an iframe.

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
