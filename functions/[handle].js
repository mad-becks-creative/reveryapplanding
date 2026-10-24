// GET /@<handle> — the no-app fallback for a profile link (RW-358).
//
// With revery installed, iOS opens the app on this path instead (see
// .well-known/apple-app-site-association), and the app looks the handle up.
// This page is for everyone else, so it shows the handle from the URL and
// nothing more. It never looks anything up: a page that answered "this
// handle exists" or showed the name and photo behind it would let anyone
// on the web, signed in or not, probe who is on revery.
//
// _routes.json sends only /@* here; any other single segment that slips
// through is passed on to the static site.

// Mirrors Handle.validate in the app and validHandle in the Firestore rules.
const HANDLE_RE = /^[a-z][a-z0-9_]{1,18}[a-z0-9]$/;
const RESERVED = new Set([
  'about', 'admin', 'api', 'help', 'me', 'moderator', 'official',
  'revery', 'root', 'settings', 'staff', 'support', 'system',
  'team', 'www'
]);

export async function onRequestGet(context) {
  const segment = String(context.params.handle || '');
  if (!segment.startsWith('@')) return context.next();

  const handle = segment.slice(1).toLowerCase();
  if (!HANDLE_RE.test(handle) || handle.includes('__') || RESERVED.has(handle)) {
    return context.next();
  }

  return new Response(page(handle), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// The handle is safe to interpolate: the pattern above admits only
// [a-z0-9_].
function page(handle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>@${handle} on revery</title>
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
  <link rel="preload" href="/fonts/SpaceGrotesk-SemiBold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/legal.css">
</head>
<body>
  <div class="wrap">
    <header class="doc">
      <a class="wordmark" href="/">revery</a>
      <h1>@${handle}</h1>
    </header>

    <main>
      <p class="lede">Someone shared their revery link with you. Open it on an
      iPhone with revery installed to ask to join their circle.</p>

      <p>revery is a private journal you share with a few close people. Not on
      it yet? <a href="/">Join the waitlist</a>.</p>
    </main>
  </div>
</body>
</html>
`;
}
