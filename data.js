// Portfolio data
window.PORTFOLIO_DATA = {
  identity: {
    name: "Nick Lastname",
    pitch: "Analytics student building real things on Cloudflare's edge.",
    location: "Brisbane, AU",
    status: "Open to grad roles · 2027",
    email: "nick@example.com",
  },

  about: [
    "Business Analytics undergrad at UQ, graduating 2027. Most of my time goes to two side projects with users on them.",
    "Both have paying users — a Brisbane medical clinic for Tek Monkeys, public players for Monkey Barrel. Which means I spend more time fixing edge cases than designing them.",
    "Looking for grad roles in analytics, fintech, or AI-startup roles where SQL, R, and TypeScript live in the same repo.",
  ],

  glance: [
    { label: "Major", value: "Business Analytics" },
    { label: "School", value: "UQ" },
    { label: "Grad year", value: "2027" },
    { label: "Live projects", value: "02" },
  ],

  skills: {
    "Languages": ["TypeScript", "JavaScript", "R", "SQL", "Python"],
    "Frameworks": ["SvelteKit 5 (runes)", "Shiny"],
    "Cloud / infra": ["Cloudflare Workers", "D1", "Durable Objects", "GitHub Actions", "Wrangler"],
    "Data / analytics": ["tidyverse", "dplyr", "ggplot2", "plotly", "leaflet", "Excel"],
    "Other": ["Git", "Bun", "IT support fundamentals"],
  },

  projects: [
    {
      id: "monkeybarrel",
      year: "2025 — present",
      name: "Monkey Barrel",
      url: "monkeybarrel.gg",
      tagline: "Multiplayer arcade games on the edge. No signup, just play.",
      description: "A real-time multiplayer gaming platform built solo on Cloudflare's edge stack. Five games in production: President, Chase the Queen, Poker, Wavelength, and an Impostor word game. Players land on the URL, get a room code, and start playing — no account required.",
      build_notes: [
        "Durable Objects hold per-room state, so a single object owns the lock for one game's logic — no cross-region race conditions.",
        "Raw parameterised SQL against D1 instead of an ORM. Fewer abstractions, easier to reason about.",
        "Each game has its own bot AI tuned to that game's rules — fills empty seats and tests state machines.",
        "Auto-deployed from main via GitHub Actions; Wrangler handles the Workers + D1 migrations.",
      ],
      stack: ["SvelteKit 5", "TypeScript", "Cloudflare Workers", "D1", "Durable Objects", "Bun"],
      metrics: [
        { k: "Games live", v: "05" },
        { k: "Stack", v: "Edge-native" },
        { k: "Backing service cost", v: "$0/mo" },
      ],
      featured: true,
    },
    {
      id: "gocard",
      year: "2025",
      name: "Go Card Travel Analytics",
      url: "BSAN4204 coursework",
      tagline: "An R Shiny dashboard for Brisbane public-transport travel history.",
      description: "Interactive analysis of personal Go Card data: route mapping, time-of-day patterns, and spend breakdown. Built for BSAN4204 (Advanced Analytics) at UQ. Loads a CSV export from the Translink portal and produces a self-service dashboard for any user's history.",
      build_notes: [
        "Leaflet for interactive route maps; trips clustered by stop pairs.",
        "Plotly time-series for hour-of-day and day-of-week heatmaps.",
        "lubridate + dplyr for the cleaning pipeline; ggplot2 for the static spend charts.",
      ],
      stack: ["R", "Shiny", "lubridate", "dplyr", "plotly", "ggplot2", "leaflet"],
      metrics: [
        { k: "Course", v: "BSAN4204" },
        { k: "Views", v: "5 charts, 1 map" },
        { k: "Input", v: "Translink CSV" },
      ],
      featured: false,
    },
    {
      id: "tekmonkeys",
      year: "2023 — present",
      name: "Tek Monkeys",
      url: "Registered ABN · self-employed",
      tagline: "IT support business. ABN-registered, on retainer with a Brisbane medical clinic.",
      description: "Founded a registered IT support business handling hardware, software, and network troubleshooting. Ongoing retainer with a local medical clinic (family-friend referral); ad-hoc work on top.",
      build_notes: [
        "Onsite hardware repairs and network diagnostics.",
        "Software setup and migration for small-business clients.",
        "Client-facing billing, scheduling, and the unglamorous parts of running a registered business.",
      ],
      stack: ["Hardware", "Networking", "Windows / macOS", "Small-biz IT"],
      metrics: [
        { k: "Status", v: "Active" },
        { k: "Recurring clients", v: "01" },
        { k: "Started", v: "2023" },
      ],
      featured: false,
    },
  ],

  experience: [
    {
      role: "Founder & IT Support Technician",
      company: "Tek Monkeys",
      period: "2023 — present",
      bullets: [
        "Registered the business under an ABN and run all sides of it: client work, billing, scheduling.",
        "Ongoing retainer with a local medical clinic — hardware, software, network troubleshooting.",
        "Ad-hoc work for residential and small-business clients on referral.",
      ],
    },
  ],

  education: {
    school: "University of Queensland",
    degree: "Bachelor of Business Management — Business Analytics major",
    grad: "Expected 2027",
    coursework: [
      "BSAN4204 — Advanced Analytics",
      "FINM2412 — Corporate Finance",
      "FINM3405 — Derivatives & Risk Management",
      "LAWS1100 — Business Law",
    ],
  },

  links: {
    github: "https://github.com/",
    linkedin: "https://linkedin.com/in/",
    email: "mailto:nick@example.com",
    monkeybarrel: "https://monkeybarrel.gg",
  },
};
