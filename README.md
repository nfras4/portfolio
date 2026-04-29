# Portfolio — Claude Design export

The portfolio originally created in Claude's Design tool, exported here so it can be edited with Claude Code. Lives alongside (not inside) the SvelteKit project at `D:\Claudecode\portfolio` — keep them separate.

## What's loaded by the page

`Portfolio.html` references these files at runtime, in this order:

1. `data.js` — content (name, about paras, projects array, skills, education, links). Note: when I de-slopped the page through Claude Design, the canonical hero text ended up hardcoded in `components.jsx → Hero()`, not in `data.js → identity.pitch`. The pitch field in `data.js` is still the old version and currently unused.
2. `tweaks-panel.jsx` — generic tweaks UI (slider/toggle/etc.) used for the live hue picker. Anthropic's reusable component, not portfolio-specific. Safe to delete if you don't want the floating Tweaks panel.
3. `components.jsx` — every section: `Nav`, `Hero` (+ `LiveCard`), `AboutSection`, `ProjectsSection` (+ `ProjectRow`, `ProjectModal`), `SkillsSection`, `ExperienceSection`, `ContactSection`, `Footer`.
4. `styles.css` — all styling, dark/mono theme, OKLCH-based accent system tied to `--accent`.

## Files NOT loaded by Portfolio.html

These are leftover earlier iterations Claude Design produced while exploring the design. Kept here for reference; **safe to delete**.

- `about.jsx` — old AboutSection/SkillsSection that used a different data shape (`d.about.bio`, `d.about.stats`, `d.education.gpa`). Won't run against the current `data.js`.
- `hero.jsx` — old terminal-typewriter hero for a totally different person ("Jordan Mercer · NYU Stern · capital markets"). Definitely not yours.
- `projects.jsx` — old ProjectsSection with SVG visualizations and project IDs (`earnings-llm`, `quant-bot`, `rag-research`) that don't exist in the current `data.js`.

## Running it

`Portfolio.html` is a single static file with no build step — it loads React + Babel from a CDN and compiles JSX in the browser. To run locally:

```
npx serve .
# or
python -m http.server 8000
```

Then open http://localhost:8000/Portfolio.html. Don't double-click the file directly: the JSX `<script src="">` tags need a real HTTP origin to fetch.

## Editing tips

- Hero headline / about paragraphs / contact line / footer / live card → all in `components.jsx`.
- Project cards content (name, year, tagline, stack, metrics, build_notes) → `data.js`. The hero's hardcoded pitch in `components.jsx` overrides `data.js → identity.pitch`.
- Accent color → `styles.css` (`:root --accent`) or live via the Tweaks panel hue slider (defaults to 75 = amber).

## What was de-slopified vs. what's still pending

Done in this round (already in `components.jsx`):

- Hero headline rewritten to name the actual project + stack.
- All three "real ___" cliches removed (hero, about, Tek Monkeys tagline).
- About paragraphs 1 and 3 rewritten.
- Contact line and "looking for" row updated to include AI.
- Footer dropped "nerd".
- Live status card now shows commit / p50 / region instead of fake players-online counters.

Still queued (Batch 2 from the review — not yet applied):

- Promote Monkey Barrel to a feature card.
- De-pad skills (drop Python / Wrangler / dplyr / ggplot2; remove `(05)` count badges).
- Reframe count-of-1 stats with nouns.
- Add an AI/ML project for the AI-startup target.
- Add a resume PDF link in the quick-links row.
- Replace placeholders (`Nick Lastname`, `nick@example.com`, unlinked github/linkedin).
