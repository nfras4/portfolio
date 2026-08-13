import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroShader from "./flair/HeroShader.jsx";
import { StickyNote, MvmRaceNote } from "./flair/StickyNotes.jsx";
import { RetroComputer, ParcelBox } from "./flair/Models.jsx";
import { useNearViewport } from "./flair/hooks.js";

const WorkspaceModel = lazy(() => import("./flair/WorkspaceModel.jsx"));

const ROTATOR_WORDS = [
  "MBS billing",
  "Brisbane clinicians",
  "API dashboards",
  "party games",
  "small clinics",
  "low-latency tools",
];

const NAV_ITEMS = [
  { label: "about", id: "about" },
  { label: "projects", id: "projects" },
  { label: "skills", id: "skills" },
  { label: "experience", id: "education" },
  { label: "contact", id: "contact" },
];

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function usePreloadKick() {
  useEffect(() => {
    document.body.classList.add("preload");
    const t = setTimeout(() => document.body.classList.remove("preload"), 80);
    return () => clearTimeout(t);
  }, []);
}

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    els.forEach((el) => el.classList.add("pre"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    const fallback = setTimeout(() => {
      els.forEach((el) => el.classList.add("in"));
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);
}

function useNavActive(setActive) {
  useEffect(() => {
    const ids = NAV_ITEMS.map((n) => n.id);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [setActive]);
}

export function Nav({ onShowcase, theme, onToggleTheme }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("about");
  const navigate = useNavigate();
  const taps = useRef({ n: 0, t: 0 });
  useNavActive(setActive);

  const close = () => setOpen(false);

  // easter egg: five quick taps OR clicks on the brand opens /seam
  const onBrandTap = () => {
    const now = Date.now();
    const s = taps.current;
    s.n = now - s.t < 2500 ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 5) {
      s.n = 0;
      try {
        sessionStorage.setItem("seam-boot", "1"); // CRT power-on on arrival
      } catch {
        /* private mode — plain entry */
      }
      navigate("/seam");
    }
  };

  return (
    <nav className="nav">
      <div className="shell nav-inner">
        <a href="#top" className="nav-brand" onClick={onBrandTap}>
          <span className="nav-brand-mark">nick</span>
          <span className="nav-brand-slash">/</span>
          <span className="nav-status">open to roles and work</span>
        </a>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
        <div id="primary-nav" className="nav-links" data-open={open}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="nav-link"
              aria-current={active === item.id ? "true" : undefined}
              onClick={close}
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            className="nav-theme"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <ThemeIcon theme={theme} />
          </button>
          {/* mobile menu footer line; display:none outside the ≤880px open menu */}
          <span className="nav-status nav-status--menu">open to roles and work</span>
        </div>
      </div>
    </nav>
  );
}

export function Hero() {
  const [idx, setIdx] = useState(0);
  const elRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.body.getAttribute("data-rotate") === "false") return;
      const el = elRef.current;
      if (!el) return;
      el.style.opacity = "0";
      el.style.filter = "blur(6px)";
      el.style.transform = "translateY(-6px)";
      setTimeout(() => {
        setIdx((i) => (i + 1) % ROTATOR_WORDS.length);
        el.style.opacity = "1";
        el.style.filter = "blur(0px)";
        el.style.transform = "none";
      }, 320);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="hero" id="top">
      <HeroShader />
      <div className="shell hero-shell">
        <HeroComputerPortal />
        <div className="hero-name fade-up" style={{ transitionDelay: "0.1s" }}>
          Nicholas W. Fraser · Brisbane
        </div>
        <h1 className="hero-pitch fade-up" style={{ transitionDelay: "0.18s" }}>
          I build software for<br />
          <span className="accent" ref={elRef}>{ROTATOR_WORDS[idx]}</span>
        </h1>
        <div className="hero-meta fade-up" style={{ transitionDelay: "0.28s" }}>
          <div className="hero-meta-item">
            <span className="hero-meta-key">based</span>
            <span className="hero-meta-val">Brisbane, Australia</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-key">stack</span>
            <span className="hero-meta-val">TypeScript · SQL · R · SvelteKit · Cloudflare</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-key">open to</span>
            <span className="hero-meta-val">summer internships and part-time work year-round</span>
          </div>
        </div>
        <div className="hero-links fade-up" style={{ transitionDelay: "0.36s" }}>
          <a href="https://arcade.nickwfraser.dev/" className="hero-link">
            <span className="hero-link-key">→ side project!</span>
            {/* suffix span is nested (not a direct flex item) so desktop spacing is unchanged;
                hidden at ≤640px where the compact grid shows "arcade ↗" */}
            <span className="hero-link-val"><span>arcade<span className="hero-link-val-ext">.nickwfraser.dev</span></span> <span className="hero-link-arrow">↗</span></span>
          </a>
          <a href="https://github.com/nfras4" className="hero-link">
            <span className="hero-link-key">→ code</span>
            <span className="hero-link-val">github <span className="hero-link-arrow">↗</span></span>
          </a>
          <a href="https://www.linkedin.com/in/nickwfraser/" className="hero-link">
            <span className="hero-link-key">→ work</span>
            <span className="hero-link-val">linkedin <span className="hero-link-arrow">↗</span></span>
          </a>
          <a href="/cv.pdf" className="hero-link" target="_blank" rel="noopener">
            <span className="hero-link-key">→ resume</span>
            <span className="hero-link-val">cv.pdf <span className="hero-link-arrow">↗</span></span>
          </a>
          <a href="mailto:nickwfraser@gmail.com" className="hero-link hero-link--primary">
            <span className="hero-link-key">→ contact</span>
            <span className="hero-link-val">nickwfraser@gmail.com <span className="hero-link-arrow">↗</span></span>
          </a>
        </div>
      </div>
    </header>
  );
}

export function AboutSection() {
  return (
    <section className="section" id="about" aria-labelledby="hd-about">
      <div className="shell reveal">
        <h2 className="section-num" id="hd-about">
          <span className="section-num-line" aria-hidden="true" />
          <span className="section-num-label">about</span>
        </h2>
        <div className="about-grid">
          <div>
            <p className="lead">
              Finance + Business Analytics student at UQ who spends more time shipping to production than sitting in lectures.
            </p>
            <div className="b-list">
              <div className="b-item">
                Finishing <b>Advanced Business (Honours)</b> at UQ, Finance + Business Analytics, 2027.
              </div>
              <div className="b-item">
                I run <b>Tek Monkeys</b>, my registered consultancy, doing IT and AI for a Brisbane medical clinic.
              </div>
              <div className="b-item">
                I built <b>Itemate</b>, an MBS billing copilot, for a paediatric orthopaedic surgeon at St Andrew's. It runs as a commercial SaaS now, at itemate.net.
              </div>
              <div className="b-item">
                But I also! ..ship <b>multiplayer games</b> on Cloudflare Durable Objects: an arcade platform and a 3D survival world.
              </div>
            </div>
          </div>
          <figure className="about-photo">
            <img src="/uq.jpg" alt="Forgan Smith Building, UQ St Lucia campus" loading="lazy" />
            <figcaption className="mono">
              uq st lucia · forgan smith
              <a
                className="about-photo-credit"
                href="https://commons.wikimedia.org/wiki/File:Forgan_Smith_Building,_UQ_St_Lucia_Campus,_Brisbane_01.jpg"
                target="_blank"
                rel="noopener"
              >
                photo: Kgbo · CC BY-SA 4.0
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

const PROJECTS = [
  {
    flip: false,
    img: "/projects/itemate.png",
    alt: "Itemate screenshot",
    year: "2026",
    name: "Itemate",
    url: "itemate.net",
    href: "https://itemate.net",
    tagline:
      "MBS billing copilot for surgical practices. Paste an operative report, get auditable Medicare item suggestions. It started as a build for one surgeon and is a commercial SaaS now.",
    stack: ["SvelteKit 5", "TypeScript", "Cloudflare Pages Functions", "D1", "Drizzle ORM", "+3"],
    metrics: [
      { dt: "Status", dd: "Commercial · live" },
      { dt: "Clients", dd: "Surgical practices" },
      { dt: "Tests", dd: "996 automated" },
    ],
    note: { value: "used by a Brisbane clinic", tone: "a", rotate: -2.5 },
  },
  {
    flip: true,
    img: "/projects/emberwood.png",
    alt: "Emberwood title screen",
    year: "2025 to present",
    name: "Emberwood",
    url: "emberwood.nickwfraser-b09.workers.dev",
    href: "https://emberwood.nickwfraser-b09.workers.dev",
    tagline:
      "A cozy 3D wilderness survival game in the browser. Seasons, building, crafting, combat, and drop-in co-op over an authoritative edge server.",
    stack: ["Three.js", "GLSL", "Durable Objects", "WebSockets", "Bun"],
    metrics: [
      { dt: "Scale", dd: "~220k LOC" },
      { dt: "Tests", dd: "~6,500" },
      { dt: "Co-op", dd: "Drop-in, one link" },
    ],
    note: { title: "no engine", value: "hand-rolled 3D", trend: "three.js + glsl", tone: "b", rotate: 2 },
  },
  {
    flip: false,
    img: "/projects/monkeybarrel.png",
    alt: "Monkey Barrel screenshot",
    year: "2025 to present",
    name: "Monkey Barrel",
    url: "arcade.nickwfraser.dev",
    href: "https://arcade.nickwfraser.dev",
    tagline:
      "Multiplayer party-games platform. Three lobbies (party, casino, RPG), twelve games, one shared chip economy and XP system.",
    stack: ["SvelteKit 5", "TypeScript", "Cloudflare Workers", "D1", "Durable Objects", "+1"],
    metrics: [
      { dt: "Games live", dd: "12" },
      { dt: "Tests", dd: "632 automated" },
      { dt: "Infra cost", dd: "$0/mo" },
    ],
  },
  {
    flip: true,
    img: "/projects/gocard.png",
    alt: "GoCard Insights screenshot",
    year: "2025 to present",
    name: "GoCard Insights",
    url: "gocard.nickwfraser.dev",
    href: "https://gocard.nickwfraser.dev",
    tagline:
      "Brisbane GoCard analytics. Upload a CSV, get spending insights, travel patterns, and a public-vs-driving savings estimate.",
    stack: ["SvelteKit 5", "TypeScript", "Drizzle ORM", "Cloudflare D1", "Cloudflare Pages", "+5"],
    metrics: [
      { dt: "Course", dd: "BSAN4204" },
      { dt: "Stack", dd: "Pages + D1" },
      { dt: "Infra cost", dd: "$0/mo" },
    ],
  },
  {
    flip: false,
    img: "/projects/mvm.png",
    alt: "Monkey vs Machine dashboard",
    year: "2026",
    name: "Monkey vs Machine",
    url: "mvm-dashboard.pages.dev",
    href: "https://mvm-dashboard.pages.dev",
    tagline:
      "Can a scikit-learn model beat 100 monkeys throwing darts? An ML trader raced against random portfolios and SPY buy-and-hold on real S&P 500 data, ticked daily.",
    stack: ["Python", "scikit-learn", "SvelteKit", "Cloudflare D1"],
    metrics: [
      { dt: "Benchmark", dd: "SPY + 100 monkeys" },
      { dt: "Cadence", dd: "Daily pipeline" },
      { dt: "Costs", dd: "5bp per trade" },
    ],
    liveNote: { tone: "c", rotate: -2 },
  },
];

export function ProjectsSection() {
  return (
    <section className="section" id="projects" aria-labelledby="hd-projects">
      <div className="shell reveal">
        <h2 className="section-num" id="hd-projects">
          <span className="section-num-line" aria-hidden="true" />
          <span className="section-num-label">projects</span>
        </h2>
        <div className="proj-list">
          {PROJECTS.map((p) => (
            <a
              key={p.name}
              className="proj-row"
              href={p.href}
              target="_blank"
              rel="noopener"
              data-flip={p.flip ? "true" : "false"}
            >
              <div className="proj-media">
                <img src={p.img} alt={p.alt} loading="lazy" />
              </div>
              <div className="proj-body">
                <div className="proj-year mono">{p.year}</div>
                <h3 className="proj-name">
                  {p.name}<span className="proj-arrow">↗</span>
                </h3>
                <div className="proj-url mono">{p.url}</div>
                <p className="proj-tagline">{p.tagline}</p>
                {/* note sits after the tagline so its ≤640px in-flow position lands between
                    tagline and stack chips; on desktop it is position:absolute (top-right),
                    so DOM order has no visual effect there */}
                {p.note ? (
                  <div className="proj-note">
                    <StickyNote size="sm" {...p.note} />
                  </div>
                ) : null}
                {p.liveNote ? (
                  <div className="proj-note">
                    <MvmRaceNote size="sm" {...p.liveNote} />
                  </div>
                ) : null}
                <div className="proj-stack">
                  {p.stack.map((s) => (
                    <span key={s} className="proj-stack-chip">{s}</span>
                  ))}
                </div>
                <dl className="proj-metrics">
                  {p.metrics.map((m) => (
                    <div key={m.dt} className="proj-metric">
                      <dt>{m.dt}</dt><dd>{m.dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const SKILL_GROUPS = [
  { name: "Languages", count: "04", tone: "sky", items: ["TypeScript", "JavaScript", "R", "SQL"] },
  { name: "Frameworks", count: "04", tone: "peach", items: ["SvelteKit 5 (runes)", "React", "Drizzle ORM", "Tailwind CSS"] },
  {
    name: "Cloud / infra",
    count: "07",
    tone: "amber",
    items: ["Cloudflare Workers", "Pages", "D1", "Durable Objects", "Workers Cron", "CF Access", "GitHub Actions"],
  },
  { name: "Data / analytics", count: "05", tone: "mint", items: ["tidyverse", "Chart.js", "MapLibre GL", "Anthropic SDK", "Excel"] },
  { name: "Other", count: "04", tone: "neutral", items: ["Git", "Bun", "Vitest", "IT support fundamentals"] },
];

const CERTS = [
  { url: "https://verify.skilljar.com/c/sgb649w93rjk", name: "Building with the Claude API", date: "May 2026" },
  { url: "https://verify.skilljar.com/c/unhxivwsmwhd", name: "AI Fluency: Framework & Foundations", date: "May 2026" },
  { url: "https://verify.skilljar.com/c/cu9j9zya3fqv", name: "AI Fluency for Small Businesses", date: "May 2026" },
];

export function SkillsSection() {
  return (
    <section className="section" id="skills" aria-labelledby="hd-skills">
      <div className="shell reveal">
        <h2 className="section-num" id="hd-skills">
          <span className="section-num-line" aria-hidden="true" />
          <span className="section-num-label">skills</span>
        </h2>
        <div className="skills-grid">
          {SKILL_GROUPS.map((g) => (
            <div key={g.name} className={`skill-group skill-group--${g.tone}`}>
              <div className="skill-group-name">
                <span>{g.name}</span>
              </div>
              <ul className="skill-items">
                {g.items.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="certs">
          <div className="certs-head">
            <span className="certs-title">Certifications</span>
            <span className="certs-issuer">Anthropic Academy</span>
          </div>
          <div className="cert-grid">
            {CERTS.map((c) => (
              <a key={c.url} className="cert-card" href={c.url} target="_blank" rel="noopener">
                <span className="cert-issuer">Anthropic</span>
                <span className="cert-name">{c.name}</span>
                <span className="cert-foot">
                  <span className="cert-date">{c.date}</span>
                  <span className="cert-verify">verify ↗</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const VENUES = [
  {
    name: "Dandelion & Driftwood",
    tag: "specialty coffee · T1 international",
    desc: "The airport outpost of Wolff Coffee Roasters, whose flagship is owned by a former Australian Barista Champion and World Barista Championship judge.",
    date: "Apr 2025 to Feb 2026",
  },
  {
    name: "The Local",
    tag: "restaurant & bar · T2 domestic",
    desc: "SSP's 425 m² flagship, built around a native fig tree. A Queensland beer garden built on local brewers and producers.",
    date: "Jan to Apr 2025",
  },
  {
    name: "Aviation Pier Cafe & Bar",
    tag: "cafe & bar · T2 domestic",
    desc: "Modern Australian cafe and bar with a view of the runway, supplied by Queensland producers: Green Beacon beer, Tamborine Mountain eggs.",
    date: "2024",
  },
  {
    name: "Mezze Za Za",
    tag: "mediterranean counter · T2 domestic",
    desc: "Airport Retail Enterprises' chargrilled-souvlaki and mezze counter on the Qantas side of the domestic food court.",
    date: "2023",
  },
];

// The hero's retro computer doubles as the arcade cabinet: click it and the
// camera dives into its screen — a fixed overlay grows from the CRT's exact
// rect to fill the viewport while the computer swings face-on, then /seam
// boots with its power-on flash. Reduced motion skips straight there.
function HeroComputerPortal() {
  const navigate = useNavigate();
  const ref = useRef(null);

  const enterSeam = useCallback(() => {
    try {
      sessionStorage.setItem("seam-boot", "1");
    } catch {
      /* private mode — plain entry */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const host = ref.current;
    const screen = host?.querySelector(".rc-screen");
    if (reduced || !screen) {
      navigate("/seam");
      return;
    }
    host.classList.add("hero-computer--zoom");
    const rect = screen.getBoundingClientRect();
    // the overlay IS the tube: dark glass with scanlines while it zooms, then
    // it splits open from the center — two shutters with glowing edges — to
    // reveal the game underneath. No flat black card, no page squashing.
    const ov = document.createElement("div");
    ov.className = "seam-warp";
    ov.innerHTML =
      '<div class="seam-warp-half seam-warp-half--top"></div>' +
      '<div class="seam-warp-half seam-warp-half--bottom"></div>';
    Object.assign(ov.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    document.body.appendChild(ov);
    const s = Math.max(
      (window.innerWidth * 1.15) / rect.width,
      (window.innerHeight * 1.15) / rect.height
    );
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ov.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
      });
    });
    setTimeout(() => navigate("/seam"), 640);
    setTimeout(() => ov.classList.add("seam-warp--open"), 760); // shutters part
    setTimeout(() => ov.remove(), 1400);
  }, [navigate]);

  return (
    <div
      ref={ref}
      className="hero-computer"
      role="button"
      tabIndex={0}
      aria-label="power on the old computer — it runs seam, a hidden duel"
      title="power on"
      onClick={enterSeam}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          enterSeam();
        }
      }}
    >
      <RetroComputer />
    </div>
  );
}

function WorkspaceRail() {
  const ref = useRef(null);
  const near = useNearViewport(ref);
  return (
    <div ref={ref} className="exp-model-rail" aria-hidden="true">
      {near ? (
        <Suspense fallback={null}>
          <WorkspaceModel />
        </Suspense>
      ) : null}
    </div>
  );
}

function ContactBox() {
  const ref = useRef(null);
  const near = useNearViewport(ref);
  return (
    <div ref={ref} className="contact-box">
      {near ? <ParcelBox /> : null}
    </div>
  );
}

export function ExperienceSection() {
  return (
    <section className="section" id="education" aria-labelledby="hd-education">
      <div className="shell reveal">
        <h2 className="section-num" id="hd-education">
          <span className="section-num-line" aria-hidden="true" />
          <span className="section-num-label">experience</span>
        </h2>
        <div className="exp-row exp-row--model">
          <div className="exp-period mono exp-period--tek">2024 to present</div>
          <div>
            <h3 className="exp-role">Founder &amp; AI Engineer</h3>
            <div className="exp-company">Tek Monkeys</div>
            <div className="exp-dek">
              IT consultancy · one client, a paediatric orthopaedic practice · Brisbane, QLD
            </div>
            <ul className="exp-bullets">
              <li>
                The only technical contact the practice has. I manage IT support, hardware, and software, and all of it sits inside their obligations under the Privacy Act 1988, the Australian Privacy Principles, and the My Health Records Act 2012.
              </li>
              <li>
                The fleet is a Windows server, several clinical workstations onsite and remote, and laptops.
              </li>
              <li>
                Scoped, designed, and shipped Itemate, the practice's MBS billing validator, after interviewing the surgeons about their workflow. The architecture is in <a href="#projects" className="inline-link">// projects</a>.
              </li>
            </ul>
          </div>
          <WorkspaceRail />
        </div>
        <div className="exp-row">
          <div className="exp-period mono exp-period--bne">2023 to Feb 2026</div>
          <div>
            <h3 className="exp-role">Hospitality &amp; Customer Service</h3>
            <div className="exp-company">Brisbane Airport</div>
            <div className="exp-dek">
              Three years across four BNE food &amp; beverage venues, in both the domestic and international terminals.
            </div>
            <ul className="exp-bullets">
              <li>
                Customer-facing service in high-volume transit retail: POS, cash and card handling, food prep, and product knowledge quick enough for passengers with a plane to catch.
              </li>
              <li>
                Moved from counter service to specialty coffee, and finished with eleven months at the airport outpost of Wolff Coffee Roasters, whose flagship belongs to a former Australian Barista Champion.
              </li>
            </ul>
            <div className="exp-venues">
              {VENUES.map((v) => (
                <div key={v.name} className="venue">
                  <div className="venue-main">
                    <span className="venue-name">{v.name}</span>
                    <span className="venue-tag">{v.tag}</span>
                    <div className="venue-desc">{v.desc}</div>
                  </div>
                  <div className="venue-date">{v.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="section" id="contact" aria-labelledby="hd-contact">
      <div className="shell contact-block reveal">
        <h2 className="section-num" id="hd-contact">
          <span className="section-num-line" aria-hidden="true" />
          <span className="section-num-label">contact</span>
        </h2>
        <div className="contact-main">
          <div className="portrait contact-portrait">
            <img src="/nick.png" alt="Nicholas Fraser" loading="lazy" />
          </div>
          <div>
            <h2 className="contact-pitch">
              Hiring interns or grads in healthtech analytics, clinical ops, or fintech? <span className="muted">Email below.</span>
            </h2>
            <a href="mailto:nickwfraser@gmail.com" className="contact-email">
              <span>nickwfraser@gmail.com</span>
              <span className="mono">↗</span>
            </a>
          </div>
        </div>
      </div>
      {/* absolute on desktop (order irrelevant), in-flow under the CTA on mobile */}
      <ContactBox />
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div>© 2026 · built solo · react + vite</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          <a href="https://github.com/nfras4">github</a>
          <a href="https://www.linkedin.com/in/nickwfraser/">linkedin</a>
          <a href="https://arcade.nickwfraser.dev/">arcade.nickwfraser.dev</a>
          <a href="/privacy">privacy</a>
        </div>
      </div>
    </footer>
  );
}
