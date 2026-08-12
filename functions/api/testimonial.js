/**
 * /api/testimonial — receives a testimonial submitted from /testimonial.
 *
 * The consent rule is enforced HERE, not in the form. The form is a convenience;
 * this is the boundary. A client can post whatever it likes, so the name is
 * dropped from the stored record unless the posted consent is exactly "named" —
 * the same shape as public_record() in the markpilot skill, for the same reason:
 * a record that was never consented to should be impossible to publish, not
 * merely filtered out by whoever remembers to.
 *
 * Nothing submitted here appears on the site automatically. Everything lands
 * under `pending:` and only a key copied to `approved:` by hand is ever read
 * back by GET. That is deliberate — an endpoint that publishes straight to a
 * public page is a spam target with a megaphone attached.
 */

const MAX_COMMENT = 1500;
const MAX_NAME = 80;
const MAX_ROLE = 120;
const RATE_MAX = 3; // submissions per window, per IP
const RATE_WINDOW = 600; // seconds

// Stored verbatim with every record, so the row says what the person was asked
// rather than what the current version of the form happens to say. Bump the
// version if the wording changes; old records keep the wording they were shown.
const CONSENT_PROMPT_V = 1;
const CONSENT_PROMPT =
  "Can these words be quoted publicly — on the markpilot README, or on nickwfraser.dev?";
const CONSENT_TEXT = {
  anon: "Yes, quote the words — but do not use my name.",
  named: "Yes, quote the words, and use my name as given.",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function onRequestPost({ request, env }) {
  if (!env.TESTIMONIALS) return json({ error: "storage unavailable" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "expected JSON" }, 400);
  }

  // Honeypot. A real person never sees this field, so anything in it is a bot.
  // Answer 200 rather than 400: a bot that learns it failed tries something else.
  if (clean(body.website, 200)) return json({ ok: true });

  const rating = Number.parseInt(body.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: "rating must be 1–5" }, 400);
  }

  const consent = body.consent === "named" ? "named" : body.consent === "anon" ? "anon" : null;
  if (!consent) {
    // "none" means keep it private, which means there is nothing to send. A
    // submission that says so is a mistake in the caller, not a record to store.
    return json({ error: "no consent to publish was given" }, 400);
  }

  const comment = clean(body.comment, MAX_COMMENT);
  if (!comment && !rating) return json({ error: "nothing to save" }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rlKey = `rl:${ip}`;
  const seen = Number.parseInt((await env.TESTIMONIALS.get(rlKey)) || "0", 10) || 0;
  if (seen >= RATE_MAX) return json({ error: "too many submissions" }, 429);
  await env.TESTIMONIALS.put(rlKey, String(seen + 1), { expirationTtl: RATE_WINDOW });

  const record = {
    rating,
    comment,
    consent,
    consentPromptVersion: CONSENT_PROMPT_V,
    consentPrompt: CONSENT_PROMPT,
    consentAnswer: CONSENT_TEXT[consent],
    date: new Date().toISOString().slice(0, 10),
    source: clean(body.source, 40) || "web",
    country: request.headers.get("cf-ipcountry") || "",
    name: "Anonymous",
  };
  // The whole point. The name is not copied in unless this is exactly "named".
  if (consent === "named") {
    record.name = clean(body.name, MAX_NAME) || "Anonymous";
    const role = clean(body.role, MAX_ROLE);
    if (role) record.role = role;
  }

  const key = `pending:${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  await env.TESTIMONIALS.put(key, JSON.stringify(record));
  return json({ ok: true, stored: key });
}

/** The public wall. Reads `approved:` only — never `pending:`. */
export async function onRequestGet({ env }) {
  if (!env.TESTIMONIALS) return json([], 200);
  const list = await env.TESTIMONIALS.list({ prefix: "approved:", limit: 100 });
  const out = [];
  for (const k of list.keys) {
    const raw = await env.TESTIMONIALS.get(k.name);
    if (!raw) continue;
    try {
      const r = JSON.parse(raw);
      out.push({
        rating: r.rating,
        comment: r.comment,
        date: r.date,
        name: r.consent === "named" ? r.name : "Anonymous",
        ...(r.consent === "named" && r.role ? { role: r.role } : {}),
      });
    } catch {
      /* one unreadable row must not take the wall down */
    }
  }
  out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return new Response(JSON.stringify(out), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
