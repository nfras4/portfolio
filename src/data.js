export const PORTFOLIO_DATA = {
  identity: {
    name: "Nicholas W. Fraser",
    pitch: "Building AI software for real problems. Real-time multiplayer arcade games on the side.",
    location: "Brisbane, AU",
    status: "Open to grad roles · 2027",
    email: "nickwfraser@gmail.com",
  },

  about: [
    "Studying Finance and Business Analytics at UQ, graduating 2027. I run the IT support for a Brisbane medical clinic through my registered business, Tek Monkeys, and ship Itemate, an MBS billing tool, to a paediatric orthopaedic surgeon at St Andrew's.",
    "On the side I build multiplayer arcade games on Cloudflare Workers + Durable Objects. Real users find edge cases I never would have.",
    "Looking for grad roles in healthtech analytics, clinical ops, or fintech. Bonus if SQL, R, and TypeScript all show up in the same repo.",
  ],

  glance: [
    { label: "Major", value: "Finance + Business Analytics" },
    { label: "School", value: "UQ" },
    { label: "Grad year", value: "2027" },
    { label: "Live projects", value: "03" },
  ],

  skills: {
    "Languages": ["TypeScript", "JavaScript", "R", "SQL"],
    "Frameworks": ["SvelteKit 5 (runes)", "React", "Drizzle ORM", "Tailwind CSS"],
    "Cloud / infra": ["Cloudflare Workers", "Pages", "D1", "Durable Objects", "Workers Cron", "CF Access", "GitHub Actions"],
    "Data / analytics": ["tidyverse", "Chart.js", "MapLibre GL", "Anthropic SDK", "Excel"],
    "Other": ["Git", "Bun", "Vitest", "IT support fundamentals"],
  },

  projects: [
    {
      id: "tekmonkeys",
      year: "2023 to present",
      name: "Tek Monkeys",
      url: "Registered ABN, self-employed",
      image: "/projects/tekmonkeys.png",
      imagePlaceholder: { mark: "TM", caption: "ABN · Brisbane" },
      tagline: "AI-augmented IT consultancy. Rapid business solutions for real problems.",
      description: "Brisbane-registered ABN consultancy. Pairs AI engineering (RAG pipelines, LLM apps, devops) with traditional IT (hardware, networks, custom software). Current engagements span a Brisbane paediatric orthopaedic practice (Itemate billing copilot) plus ad-hoc small-business and residential work. Built to scale across clients, not locked to one vertical.",
      build_notes: [
        "RAG + LLM pipelines: retrieval-augmented systems that pair Anthropic Claude with deterministic matchers over domain-specific indexes (e.g. 6,039-item MBS for medical billing).",
        "DevOps + deployment: Cloudflare Workers/Pages, D1, Durable Objects, GitHub Actions CI; production hardening with CF Access, atomic D1 upserts, daily token budgets.",
        "Custom software: SvelteKit 5, React, TypeScript end-to-end; built for solo-operator small businesses that can't afford downtime or a dev team.",
        "Traditional IT: hardware repair, network diagnostics, Windows fleet management, ABN-registered billing and scheduling.",
      ],
      stack: ["RAG / LLM", "TypeScript", "Cloudflare", "Anthropic SDK", "SvelteKit", "Networking", "Windows / macOS"],
      metrics: [
        { k: "Status", v: "Active · accepting clients" },
        { k: "Verticals", v: "Healthtech · small biz" },
        { k: "Started", v: "2023" },
      ],
      featured: true,
    },
    {
      id: "itemate",
      year: "2026",
      name: "Itemate",
      url: "itemate.nickwfraser.dev",
      image: "/projects/itemate.png",
      imagePlaceholder: { mark: "It", caption: "MBS · Brisbane ortho" },
      tagline: "MBS billing copilot for a Brisbane paediatric orthopaedic surgeon. Paste a surgical report, get the Medicare item codes ready to claim.",
      description: "Single-doctor billing tool shipped for Dr Geoff Donald (paediatric orthopaedics, St Andrew's Brisbane). The surgeon pastes a plain-text post-op report; the server strips PHI, Anthropic Haiku extracts candidate procedures into a structured schema, then a deterministic rule engine matches MBS item codes from the 4798-item ortho slice. Designed to live behind real auth from day one because PHI is involved.",
      build_notes: [
        "Hybrid LLM + rules: Haiku 4.5 (dev) / Sonnet 4.6 (prod) handles the messy free-text extraction; a deterministic matcher with keyword overlap and laterality stop-words decides the actual codes. ~$0.005 per report.",
        "De-identification regex with anchored patterns (Patient:, Date:, UR Number:) and ordering rules so a clinic phone number can't get mistaken for a Medicare number before the report reaches the LLM.",
        "Specialty pivot from ENT to paediatric ortho mid-build: 4798 ortho-tagged MBS items across 3755 unique codes, plus bilateral / multi-step bundling rules (ORIF, osteotomy, TENS nail, VDRO, Perthes).",
        "Production hardening: CF Access Google OAuth + ADMIN_PASSWORD double gate, daily token budget keyed by AEST date with atomic D1 upsert, CSP + HSTS, 71 Vitest unit tests + integration harness.",
      ],
      stack: ["SvelteKit 5", "TypeScript", "Cloudflare Pages Functions", "D1", "Drizzle ORM", "Anthropic SDK", "Vitest", "CF Access"],
      metrics: [
        { k: "Status", v: "Shipped" },
        { k: "Client", v: "Brisbane paediatric orthopaedic" },
        { k: "Tests", v: "71 unit + e2e" },
      ],
      featured: true,
    },
    {
      id: "gocard",
      year: "2025 to present",
      name: "GoCard Insights",
      url: "gocard.nickwfraser.dev",
      image: "/projects/gocard.png",
      tagline: "Brisbane GoCard analytics. Upload a CSV, get spending insights, travel patterns, and a public-vs-driving savings estimate.",
      description: "Self-serve dashboard for Brisbane public-transport users. Drop in a Translink CSV (or snap a photo of a paper statement) and get route maps, time-of-day patterns, fare breakdowns, and a daily-fuel-price comparison that estimates what the same trips would have cost driving. Built for BSAN4204 (Advanced Analytics) at UQ; designed to run on Cloudflare's free tier with no per-user infra.",
      build_notes: [
        "SvelteKit 5 (runes) with adapter-cloudflare on Pages; Drizzle ORM against D1 in prod, bun:sqlite for local dev.",
        "Sibling Worker gocard-fuel-cron pulls daily Brisbane fuel prices into KV + D1 on a 06:00 AEST cron, since Pages doesn't support cron triggers.",
        "MapLibre GL for route maps, Chart.js for the time-series and spend charts.",
        "Tesseract.js OCR fallback so users without a Translink CSV can upload a photo of a printed statement.",
      ],
      stack: ["SvelteKit 5", "TypeScript", "Drizzle ORM", "Cloudflare D1", "Cloudflare Pages", "Workers cron", "Tailwind v4", "Chart.js", "MapLibre GL", "Tesseract.js"],
      metrics: [
        { k: "Course", v: "BSAN4204" },
        { k: "Stack", v: "Pages + D1" },
        { k: "Infra cost", v: "$0/mo" },
      ],
      featured: false,
    },
    {
      id: "monkeybarrel",
      year: "2025 to present",
      name: "Monkey Barrel",
      url: "arcade.nickwfraser.dev",
      image: "/projects/monkeybarrel.png",
      tagline: "Multiplayer party-games platform. Three lobbies (party, casino, RPG), seven games, one shared chip economy and XP system.",
      description: "Solo-built multiplayer arcade with no signup friction: land on the URL, get a room code, play. Three category lobbies feed the same backbone: party games (Impostor, Wavelength, Snap…), casino (Poker, Blackjack, Roulette…), and an RPG mode with quests and dungeons. Chip economy and XP carry across games; cosmetics unlock at milestones. Built as a deliberate stress-test of how real-time systems behave on a $0/mo Cloudflare stack.",
      build_notes: [
        "Durable Objects hold per-room state, so one object owns the lock for one game's logic without cross-region race conditions. Raw parameterised SQL against D1 instead of an ORM.",
        "Each game has its own bot AI tuned to that game's rules. Bots fill empty seats and double as fuzz-tests for the state machines.",
        "Caught a Svelte 5 production-build bug where Vite was tree-shaking onMount/onDestroy lifecycle callbacks, so the app worked in dev and shipped blank in prod. Diagnosed by reading the compiled JS and switching to $effect-based wiring; now documented as a project-wide rule.",
        "Auth hardened with PBKDF2 600k iterations + rehash-on-login, rate-limited login endpoints, SHA-256 session tokens. Auto-deployed from main via GitHub Actions; Wrangler handles Workers and D1 migrations.",
      ],
      stack: ["SvelteKit 5", "TypeScript", "Cloudflare Workers", "D1", "Durable Objects", "Bun"],
      metrics: [
        { k: "Games live", v: "07+" },
        { k: "Stack", v: "Workers + DO" },
        { k: "Infra cost", v: "$0/mo" },
      ],
      featured: false,
    },
  ],

  experience: [
    {
      role: "Founder & AI Engineer",
      company: "Tek Monkeys",
      period: "2023 to present",
      bullets: [
        "ABN-registered AI + IT consultancy. RAG pipelines, devops, custom software, and traditional IT support.",
        "Lead engagement: Brisbane paediatric orthopaedic practice (Itemate MBS billing copilot, ongoing IT retainer).",
        "Built to scale across verticals: healthtech, small business, and residential, not locked to one client.",
      ],
    },
  ],

  education: {
    school: "University of Queensland",
    degree: "Bachelor of Business Management, Finance & Business Analytics",
    grad: "2023 - Current · Expected 2027",
  },

  links: {
    github: "https://github.com/nfras4",
    linkedin: "https://www.linkedin.com/in/nickwfraser/",
    email: "mailto:nickwfraser@gmail.com",
    monkeybarrel: "https://arcade.nickwfraser.dev",
    cv: "/cv.pdf",
  },
};
