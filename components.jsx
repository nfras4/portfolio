// Hero, About, Skills, Experience, Education, Contact, Projects, Modal — all sections
const { useState, useEffect, useMemo } = React;

/* =========================================
   NAV
   ========================================= */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { href: "#about", label: "about", num: "01" },
    { href: "#projects", label: "projects", num: "02" },
    { href: "#skills", label: "skills", num: "03" },
    { href: "#education", label: "education", num: "04" },
    { href: "#contact", label: "contact", num: "05" },
  ];

  return (
    <nav className={"nav " + (scrolled ? "nav--scrolled" : "")}>
      <div className="shell nav-inner">
        <a href="#top" className="nav-brand">
          <span className="nav-brand-mark">nick</span>
          <span className="nav-brand-slash">/</span>
          <span className="nav-status">
            <span className="nav-status-dot" />
            available
          </span>
        </a>
        <div className="nav-links">
          {items.map((it) => (
            <a key={it.href} href={it.href} className="nav-link">
              <span className="nav-link-num">{it.num}</span>
              {it.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

/* =========================================
   HERO
   ========================================= */
function LiveCard() {
  return (
    <div className="live-card">
      <div className="live-card-head">
        <span className="live-card-title">
          monkeybarrel.gg · deploy
        </span>
      </div>
      <div className="live-card-row">
        <span>commit</span>
        <strong>a3f1b2</strong>
      </div>
      <div className="live-card-row">
        <span>p50</span>
        <strong>14ms</strong>
      </div>
      <div className="live-card-row">
        <span>edge region</span>
        <strong>SYD · CDG · IAD</strong>
      </div>
      <a href="https://monkeybarrel.gg" className="live-card-cta">
        play now ↗
      </a>
    </div>
  );
}

function Hero() {
  const d = window.PORTFOLIO_DATA;
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
          UQ analytics student. I ship <span className="accent">multiplayer arcade games</span>{" "}
          <span className="muted">on Cloudflare Workers.</span>
        </h1>

        <div className="hero-meta fade-up" style={{ animationDelay: "0.28s" }}>
          <div className="hero-meta-item">
            <span className="hero-meta-key">studying</span>
            <span className="hero-meta-val">Business Analytics @ UQ</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-key">building</span>
            <span className="hero-meta-val">Monkey Barrel, Tek Monkeys</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-key">looking for</span>
            <span className="hero-meta-val">grad analytics / fintech / AI / edge</span>
          </div>
        </div>

        <div className="hero-bottom">
          <div className="hero-links fade-up" style={{ animationDelay: "0.36s" }}>
            <a href={d.links.monkeybarrel} className="hero-link">
              <span className="hero-link-key">→ project</span>
              <span className="hero-link-val">monkeybarrel.gg <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.github} className="hero-link">
              <span className="hero-link-key">→ code</span>
              <span className="hero-link-val">github <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.linkedin} className="hero-link">
              <span className="hero-link-key">→ work</span>
              <span className="hero-link-val">linkedin <span className="hero-link-arrow">↗</span></span>
            </a>
            <a href={d.links.email} className="hero-link">
              <span className="hero-link-key">→ contact</span>
              <span className="hero-link-val">{d.identity.email} <span className="hero-link-arrow">↗</span></span>
            </a>
          </div>
          <div className="fade-up" style={{ animationDelay: "0.44s" }}>
            <LiveCard />
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================
   ABOUT
   ========================================= */
function AboutSection() {
  const d = window.PORTFOLIO_DATA;
  return (
    <section className="section" id="about">
      <div className="shell">
        <div className="section-num">01 / about</div>
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

/* =========================================
   PROJECTS
   ========================================= */
function ProjectRow({ p, onOpen }) {
  return (
    <article className="proj-row" onClick={() => onOpen(p)}>
      <div className="proj-year">{p.year}</div>
      <div className="proj-main">
        <div className="proj-head">
          <h3 className="proj-name">
            {p.name}
            <span className="proj-arrow">↗</span>
          </h3>
        </div>
        <div className="proj-url mono">{p.url}</div>
        <p className="proj-tagline">{p.tagline}</p>
      </div>
      <div className="proj-side">
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

function ProjectsSection() {
  const d = window.PORTFOLIO_DATA;
  const [open, setOpen] = useState(null);
  return (
    <section className="section" id="projects">
      <div className="shell">
        <div className="section-num">02 / projects</div>
        <div className="proj-list">
          {d.projects.map((p) => <ProjectRow key={p.id} p={p} onOpen={setOpen} />)}
        </div>
      </div>
      <ProjectModal p={open} onClose={() => setOpen(null)} />
    </section>
  );
}

/* =========================================
   SKILLS
   ========================================= */
function SkillsSection() {
  const d = window.PORTFOLIO_DATA;
  return (
    <section className="section" id="skills">
      <div className="shell">
        <div className="section-num">03 / skills</div>
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

/* =========================================
   EXPERIENCE + EDUCATION
   ========================================= */
function ExperienceSection() {
  const d = window.PORTFOLIO_DATA;
  return (
    <section className="section" id="education">
      <div className="shell">
        <div className="section-num">04 / experience &amp; education</div>

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

/* =========================================
   CONTACT
   ========================================= */
function ContactSection() {
  const d = window.PORTFOLIO_DATA;
  return (
    <section className="section" id="contact">
      <div className="shell contact-block">
        <div className="section-num">05 / contact</div>
        <h2 className="contact-pitch">
          Hiring 2027 grads in analytics, fintech, or AI infra?{" "}
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

/* =========================================
   FOOTER
   ========================================= */
function Footer() {
  const d = window.PORTFOLIO_DATA;
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div>© 2026 · built solo · sveltekit 5 + cloudflare workers</div>
        <div style={{ display: "flex", gap: "20px" }}>
          <a href={d.links.github}>github</a>
          <a href={d.links.linkedin}>linkedin</a>
          <a href={d.links.monkeybarrel}>monkeybarrel.gg</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  Nav, Hero, LiveCard, AboutSection, ProjectsSection, ProjectRow, ProjectModal,
  SkillsSection, ExperienceSection, ContactSection, Footer,
});
