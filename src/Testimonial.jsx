import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

/**
 * /testimonial — the form the markpilot CLI links to.
 *
 * It arrives pre-filled from the query string, because the answers were already
 * given in the terminal and retyping them is where people give up. Pre-filled is
 * not submitted: everything is editable here, including the consent, and nothing
 * is sent until Submit.
 *
 * Consent is two questions on purpose. "You may quote this" and "you may use my
 * name" are different permissions, and the name field does not even exist until
 * the second one is answered yes.
 */

const CONSENT = [
  { id: "named", label: "Quote it, and use my name" },
  { id: "anon", label: "Quote it, but keep me anonymous" },
  { id: "none", label: "Keep it private, just so Nick knows" },
];

const RATINGS = [1, 2, 3, 4, 5];

function Stars({ value, onChange }) {
  return (
    <div className="tm-stars" role="radiogroup" aria-label="Rating out of 5">
      {RATINGS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} out of 5`}
          className={"tm-star" + (value >= n ? " is-on" : "")}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
      <span className="tm-stars-value">{value ? `${value}/5` : "pick one"}</span>
    </div>
  );
}

export default function Testimonial() {
  const [params] = useSearchParams();
  const initialRating = Number.parseInt(params.get("rating"), 10);

  const [rating, setRating] = useState(
    initialRating >= 1 && initialRating <= 5 ? initialRating : 0
  );
  const [comment, setComment] = useState(params.get("comment") || "");
  const [consent, setConsent] = useState(
    CONSENT.some((c) => c.id === params.get("consent")) ? params.get("consent") : "anon"
  );
  const [name, setName] = useState(params.get("name") || "");
  const [role, setRole] = useState(params.get("role") || "");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState("idle"); // idle | sending | sent | private | error
  const [error, setError] = useState("");

  const prefilled = params.has("rating") || params.has("comment");

  async function submit(e) {
    e.preventDefault();
    if (!rating) {
      setError("Pick a rating first. It is the only part that is required.");
      return;
    }
    // Nothing to send. Saying so plainly beats a form that quietly posts anyway.
    if (consent === "none") {
      setState("private");
      return;
    }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/testimonial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          consent,
          name: consent === "named" ? name : "",
          role: consent === "named" ? role : "",
          website,
          source: params.get("source") || "markpilot",
        }),
      });
      // A 200 is not proof it was stored. `_redirects` sends everything unmatched to
      // index.html with a 200, so if the Function is not deployed this POST comes back
      // as a perfectly cheerful page of HTML — and treating that as success would show
      // someone "Thank you" for a testimonial that went nowhere. Require the endpoint
      // to actually say so, in JSON.
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const body = isJson ? await res.json().catch(() => null) : null;
      if (!res.ok || !body) {
        throw new Error(
          (body && body.error) ||
            `the form did not reach the server (HTTP ${res.status})`
        );
      }
      if (body.ok !== true) throw new Error(body.error || "the server did not save it");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err.message || "Something went wrong.");
    }
  }

  if (state === "sent" || state === "private") {
    return (
      <main className="privacy">
        <div className="shell privacy-inner tm-done">
          <Link to="/" className="privacy-back">← back to home</Link>
          <h1 className="privacy-title">
            {state === "sent" ? "Thank you." : "Nothing was sent."}
          </h1>
          <p className="privacy-sub">
            {state === "sent"
              ? consent === "named"
                ? "It will not appear anywhere until Nick has read it. If you change your mind, email him and it comes down."
                : "It is stored without your name, and will not appear anywhere until Nick has read it."
              : "You chose to keep it private, so nothing left your browser. The copy on your own machine is still yours."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="privacy">
      <div className="shell privacy-inner">
        <Link to="/" className="privacy-back">← back to home</Link>

        <h1 className="privacy-title">Leave a note about markpilot</h1>
        <p className="privacy-sub">
          {prefilled
            ? "Your answers from the terminal are already here. Change anything you like. Nothing has been sent yet."
            : "A rating, an optional note, and one question about quoting you."}
        </p>

        <form className="tm-form" onSubmit={submit}>
          <section className="privacy-section">
            <h2>How did it go?</h2>
            <Stars value={rating} onChange={setRating} />
          </section>

          <section className="privacy-section">
            <h2>Anything to add?</h2>
            <textarea
              className="tm-input tm-textarea"
              value={comment}
              maxLength={1500}
              rows={4}
              placeholder="Optional. One sentence is plenty."
              onChange={(e) => setComment(e.target.value)}
            />
          </section>

          <section className="privacy-section">
            <h2>May this be quoted?</h2>
            <p className="tm-help">
              On the markpilot README, or on this site. Ask for it back at any time and it
              comes down.
            </p>
            {CONSENT.map((c) => (
              <label key={c.id} className="tm-choice">
                <input
                  type="radio"
                  name="consent"
                  value={c.id}
                  checked={consent === c.id}
                  onChange={() => setConsent(c.id)}
                />
                <span>{c.label}</span>
              </label>
            ))}

            {consent === "named" && (
              <div className="tm-named">
                <label className="tm-field">
                  <span>Name, as you want it shown</span>
                  <input
                    className="tm-input"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya M."
                  />
                </label>
                <label className="tm-field">
                  <span>Role or affiliation (optional)</span>
                  <input
                    className="tm-input"
                    value={role}
                    maxLength={120}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="UQ, 4th-year business"
                  />
                </label>
              </div>
            )}
          </section>

          {/* Not for people. Left unlabelled and off-screen; anything in it is a bot. */}
          <input
            className="tm-hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          {error && <p className="tm-error">{error}</p>}

          <button className="tm-submit" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "sending…" : consent === "none" ? "Done" : "Send it"}
          </button>
          <p className="tm-help tm-fineprint">
            Nothing goes on the site automatically. Nick reads everything first. On an
            anonymous note your name is dropped before anything is stored, rather than
            stored and hidden.
          </p>
        </form>
      </div>
    </main>
  );
}
