# Static Asset Placeholders

This file documents placeholder assets that must be replaced with real versions before launch.

Audited at the start of Wave 1 (Phase 1.7 of the consensus plan).

## Real assets

- `favicon.svg` - real monogram (N in Fraunces italic on dark card). Refreshed in Wave 1 to align with the updated theme color (`#0b0b0e`). No replacement needed.

## Placeholder assets (replace before launch)

These were 70-byte stubs left over from the pre-rebuild scaffold. Wave 1 regenerated them as minimal but valid PNGs so the build does not error and the meta tags resolve, but they are not production quality.

| File | Current state | Required for launch |
| ---- | ------------- | ------------------- |
| `favicon-32.png` | 32x32 dark monogram PNG generated from the SVG. Acceptable as a fallback. | Optional re-export at higher fidelity. |
| `apple-touch-icon.png` | 180x180 dark monogram PNG generated from the SVG. Acceptable as a fallback. | Optional re-export at higher fidelity. |
| `og-image.png` | 1200x630 dark card PNG with name and tagline placeholder. Functional but visually minimal. | Replace with a designed OG card before public sharing. |

## Fonts

The `static/fonts/` directory is empty as of Wave 1. Self-hosted WOFF2 files for Inter, Fraunces, and JetBrains Mono are listed in `app.css` as TODOs and must be dropped in before the production build serves real type. See `src/app.css` font-face section for the exact filenames expected.

Sources:

- Inter (variable, latin subset): https://rsms.me/inter/ (download "Inter Web" zip, take `Inter-roman.var.woff2` and `Inter-italic.var.woff2`).
- Fraunces (variable, latin subset): https://fonts.google.com/specimen/Fraunces (download family, convert TTF to WOFF2 via `fonttools` or use a hosted converter).
- JetBrains Mono (variable, latin subset): https://fonts.google.com/specimen/JetBrains+Mono (same workflow as Fraunces).

Until those are dropped in, system fallbacks (`ui-serif`, `ui-sans-serif`, `ui-monospace`) will be used at runtime.
