import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="privacy">
      <div className="shell privacy-inner">
        <Link to="/" className="privacy-back">← back to home</Link>

        <h1 className="privacy-title">Privacy</h1>
        <p className="privacy-sub">Last updated 27 May 2026.</p>

        <section className="privacy-section">
          <h2>The short version</h2>
          <p>
            This is a static personal portfolio. It has no accounts and no login, and
            it collects nothing about you as you browse. The one exception is the
            testimonial form at <code>/testimonial</code>, which only ever stores what
            you type into it and press send on.
          </p>
        </section>

        <section className="privacy-section">
          <h2>The testimonial form</h2>
          <p>
            If you submit one, it stores your rating, your comment, the date, the answer
            you gave to the question about being quoted, and the two-letter country code
            Cloudflare reports for the request. Your name is stored <strong>only</strong>{" "}
            if you choose "use my name". On any other answer the page does not send it and
            the server does not write it, rather than storing it and hiding it.
          </p>
          <p>
            Your IP address is not stored with the submission. It is used to count recent
            submissions so the form cannot be flooded, and that counter is discarded
            automatically after ten minutes.
          </p>
          <p>
            Nothing appears on this site or anywhere else automatically. Each
            submission is reviewed by hand first. Arriving from a pre-filled link does
            not submit anything: the form opens with the answers in it and sends
            nothing until you press the button, and you can change or clear any of it
            first, including the consent.
          </p>
          <p>
            To have a quote amended or removed, email the address below and say which
            one. No reason needed.
          </p>
        </section>

        <section className="privacy-section">
          <h2>No tracking</h2>
          <p>
            There are no third-party analytics, advertising networks, or behavioural
            trackers on this site, and it sets no first-party tracking cookies. Pages
            are served as static files from Cloudflare Pages, which may keep standard
            request logs for security and reliability. Those logs are Cloudflare's and
            are governed by their privacy policy.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Contact</h2>
          <p>
            If you reach out by email, that is the only personal information shared,
            and it is used solely to reply to you. Questions:{" "}
            <a href="mailto:nickwfraser@gmail.com">nickwfraser@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
