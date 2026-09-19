// POST /api/waitlist — pre-launch email signups from the landing page.
//
// Runs as a Cloudflare Pages Function, same origin as the page, so there is no
// CORS to configure. Needs a D1 binding named DB (see schema.sql).
//
// We store the address, when it arrived, and which form it came from. Nothing
// else — no IP, no user agent. The privacy policy promises minimal collection
// and neither field earns its keep for a pre-launch list.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical maximum

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestPost(context) {
  let form;
  try {
    form = await context.request.formData();
  } catch (err) {
    return json({ error: 'bad_request' }, 400);
  }

  // Honeypot: a field hidden from people but filled in by naive bots. Answer as
  // though it worked, so the bot has no signal to adapt to, and write nothing.
  if ((form.get('company') || '').trim() !== '') {
    return json({ ok: true }, 200);
  }

  const email = (form.get('email') || '').trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return json({ error: 'invalid_email' }, 400);
  }

  const raw = (form.get('source') || '').trim().toLowerCase();
  const source = raw === 'hero' || raw === 'final' ? raw : null;

  try {
    // ON CONFLICT DO NOTHING: signing up twice is a no-op, and the response is
    // identical either way so the endpoint never reveals who is on the list.
    await context.env.DB
      .prepare('INSERT INTO waitlist (email, source) VALUES (?, ?) ON CONFLICT(email) DO NOTHING')
      .bind(email, source)
      .run();
  } catch (err) {
    console.error('waitlist insert failed:', err && err.message);
    return json({ error: 'server' }, 500);
  }

  return json({ ok: true }, 200);
}

export function onRequest() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' }
  });
}
