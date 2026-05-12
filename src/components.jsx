import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PORTFOLIO_DATA as d } from "./data.js";
import AnimatedTextCycle from "./components/ui/animated-text-cycle.jsx";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = ["about", "projects", "skills", "education", "contact"];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const items = [
    { href: "#about", label: "about", num: "01", id: "about" },
    { href: "#projects", label: "projects", num: "02", id: "projects" },
    { href: "#skills", label: "skills", num: "03", id: "skills" },
    { href: "#education", label: "education", num: "04", id: "education" },
    { href: "#contact", label: "contact", num: "05", id: "contact" },
  ];

  return (
    <nav className={"nav " + (scrolled ? "nav--scrolled" : "")}>
      <div className="shell nav-inner">
        <a href="#top" className="nav-brand">
          <span className="nav-brand-mark">nick</span>
          <span className="nav-brand-slash">/</span>
          <span className="nav-status">
            <span className="nav-status-dot" />
            open to roles and work
          </span>
        </a>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
        <div id="primary-nav" className="nav-links" data-open={menuOpen}>
          {items.map((it) => (
            <a
              key={it.href}
              href={it.href}
              className="nav-link"
              aria-current={active === it.id ? "true" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-link-num">{it.num}</span>
              {it.label}
            </a>
          ))}
          <Link
            to="/showcase"
            className="nav-link nav-link--showcase"
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-link-num">06</span>
            showcase
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="shell hero-shell">
        <div className="hero-status fade-up" style={{ animationDelay: "0.05s" }}>
          <span className="hero-status-dot" />
          {d.identity.status}
        </div>

        <div className="hero-name fade-up" style={{ animationDelay: "0.1s" }}>
          {d.identity.name} · Brisbane
        </div>

        <h1 className="hero-pitch fade-up" style={{ animationDelay: "0.18s" }}>
          I build software for
          <br />
          <AnimatedTextCycle
            className="accent"
            interval={2600}
            words={[
              "Brisbane clinicians",
              "MBS billing",
              "API dashboards",
              "party games",
              "small clinics",
              "low-latency tools",
            ]}
          />
          <br />
          <span className="muted">Real-time multiplayer arcade games at the edge on the side.</span>
        </h1>

        <div className="hero-meta fade-up" style={{ animationDelay: "0.28s" }}>
          <div className="hero-meta-item">
            <span className="hero-meta-key">studying</span>
            <span className="hero-meta-val">Finance + Business Analytics @ UQ</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-key">building</span>
            <span className="hero-meta-val">Tek Monkeys, Tally, Monkey Barrel</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-key">looking for</span>
            <span className="hero-meta-val">grad analytics / healthtech / clinical ops / fintech</span>
          </div>
        </div>

        <div className="hero-bottom">
          <div className="hero-links fade-up" style={{ animationDelay: "0.36s" }}>
            <a href={d.links.monkeybarrel} className="hero-link">
              <span className="hero-link-key">→ project</span>
              <span className="hero-link-val">arcade.nickwfraser.dev <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.github} className="hero-link">
              <span className="hero-link-key">→ code</span>
              <span className="hero-link-val">github <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.linkedin} className="hero-link">
              <span className="hero-link-key">→ work</span>
              <span className="hero-link-val">linkedin <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.cv} className="hero-link" target="_blank" rel="noopener">
              <span className="hero-link-key">→ resume</span>
              <span className="hero-link-val">cv.pdf <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.email} className="hero-link hero-link--primary">
              <span className="hero-link-key">→ contact</span>
              <span className="hero-link-val">{d.identity.email} <span className="hero-link-arrow">↗</span></span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AboutSection() {
  return (
    <section className="section" id="about" aria-labelledby="hd-about">
      <div className="shell">
        <h2 className="section-num" id="hd-about">01 / about</h2>
        <div className="about-grid">
          <div className="about-bio">
            {d.about.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div>
            <dl className="glance-list">
              {d.glance.map((g) => (
                <div key={g.label} className="glance-row">
                  <dt className="glance-key">{g.label}</dt>
                  <dd className="glance-val">{g.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectMedia({ p }) {
  const [failed, setFailed] = useState(false);
  const hasLiveImage = p.id === "gocard" || p.id === "monkeybarrel";
  const liveHref = hasLiveImage && p.url
    ? `https://${p.url.replace(/^https?:\/\//, "")}`
    : null;

  if (p.image && !failed) {
    const imgEl = (
      <img
        src={p.image}
        alt={`${p.name} screenshot`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
    return (
      <div className="proj-media">
        {liveHref ? (
          <a
            href={liveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="proj-media-link"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open ${p.name} live site`}
          >
            {imgEl}
          </a>
        ) : imgEl}
      </div>
    );
  }
  const ph = p.imagePlaceholder ?? { mark: p.name.slice(0, 2).toUpperCase() };
  return (
    <div className="proj-media proj-media--placeholder">
      <span className="proj-media-mark mono">{ph.mark}</span>
      {ph.caption && <span className="proj-media-caption mono">{ph.caption}</span>}
    </div>
  );
}

function ProjectRow({ p, onOpen, index }) {
  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(p);
    }
  };
  return (
    <article
      className="proj-row"
      data-flip={index % 2 === 1 ? "true" : "false"}
      role="button"
      tabIndex={0}
      aria-label={`Open ${p.name} case study`}
      onClick={() => onOpen(p)}
      onKeyDown={handleKey}
    >
      <ProjectMedia p={p} />
      <div className="proj-body">
        <div className="proj-year mono">{p.year}</div>
        <h3 className="proj-name">
          {p.name}
          <span className="proj-arrow">↗</span>
        </h3>
        <div className="proj-url mono">{p.url}</div>
        <p className="proj-tagline">{p.tagline}</p>
        <div className="proj-stack">
          {p.stack.slice(0, 5).map((s) => (
            <span key={s} className="proj-stack-chip">{s}</span>
          ))}
          {p.stack.length > 5 && (
            <span className="proj-stack-chip">+{p.stack.length - 5}</span>
          )}
        </div>
        <dl className="proj-metrics">
          {p.metrics.map((m) => (
            <div key={m.k} className="proj-metric">
              <dt>{m.k}</dt>
              <dd>{m.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function ProjectModal({ p, onClose }) {
  useEffect(() => {
    if (!p) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [p]);

  if (!p) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          esc ✕
        </button>
        <div className="modal-body">
          <div className="modal-meta">project · {p.year}</div>
          <h2 className="modal-title">{p.name}</h2>
          <div className="modal-url">{p.url}</div>
          <p className="modal-tag">{p.tagline}</p>

          <div className="modal-h">// summary</div>
          <p className="modal-desc">{p.description}</p>

          <div className="modal-h">// build notes</div>
          <ul className="modal-notes">
            {p.build_notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>

          <div className="modal-h">// stack</div>
          <div className="proj-stack">
            {p.stack.map((s) => (
              <span key={s} className="proj-stack-chip">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsSection() {
  const [open, setOpen] = useState(null);
  return (
    <section className="section" id="projects" aria-labelledby="hd-projects">
      <div className="shell">
        <h2 className="section-num" id="hd-projects">02 / projects</h2>
        <div className="proj-list">
          {d.projects.map((p, i) => <ProjectRow key={p.id} p={p} onOpen={setOpen} index={i} />)}
        </div>
      </div>
      <ProjectModal p={open} onClose={() => setOpen(null)} />
    </section>
  );
}

export function SkillsSection() {
  return (
    <section className="section" id="skills" aria-labelledby="hd-skills">
      <div className="shell">
        <h2 className="section-num" id="hd-skills">03 / skills</h2>
        <div className="skills-grid">
          {Object.entries(d.skills).map(([group, items]) => (
            <div key={group} className="skill-group">
              <div className="skill-group-name">
                <span>{group}</span>
                <span>{items.length.toString().padStart(2, "0")}</span>
              </div>
              <ul className="skill-items">
                {items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section className="section" id="education" aria-labelledby="hd-education">
      <div className="shell">
        <h2 className="section-num" id="hd-education">04 / experience &amp; education</h2>

        {d.experience.map((e, i) => (
          <div key={i} className="exp-row">
            <div className="exp-period">{e.period}</div>
            <div>
              <h3 className="exp-role">{e.role}</h3>
              <div className="exp-company">{e.company}</div>
              <ul className="exp-bullets">
                {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          </div>
        ))}

        <div className="edu-block">
          <div className="exp-period mono">{d.education.grad}</div>
          <div>
            <h3 className="edu-school">{d.education.school}</h3>
            <div className="edu-degree">{d.education.degree}</div>
            <div className="edu-grad">Coursework relevant to grad roles below</div>
            <div className="edu-cw-label mono">// relevant coursework</div>
            <ul className="edu-cw">
              {d.education.coursework.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="section" id="contact" aria-labelledby="hd-contact">
      <div className="shell contact-block">
        <h2 className="section-num" id="hd-contact">05 / contact</h2>
        <h2 className="contact-pitch">
          Hiring 2027 grads in healthtech analytics, clinical ops, or fintech?{" "}
          <span className="muted">Email below.</span>
        </h2>
        <a href={d.links.email} className="contact-email">
          <span>{d.identity.email}</span>
          <span className="mono">↗</span>
        </a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div>© 2026 · built solo · html + react</div>
        <div style={{ display: "flex", gap: "20px" }}>
          <a href={d.links.github}>github</a>
          <a href={d.links.linkedin}>linkedin</a>
          <a href={d.links.monkeybarrel}>arcade.nickwfraser.dev</a>
        </div>
      </div>
    </footer>
  );
}
