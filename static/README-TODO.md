# Static assets TODO

# TODO: replace 1x1 placeholders with real assets

Replace these placeholder files with real designs before public launch:

- `favicon.svg`: v1 placeholder (amber N glyph on dark square). Replace with real mark.
- `favicon-32.png`: placeholder 1x1 PNG. Generate a real 32x32 from the SVG before launch.
- `apple-touch-icon.png`: placeholder 1x1 PNG. Generate a real 180x180 before launch.
- `og-image.png`: placeholder 1x1 PNG. Nick will design a 1200x630 social card before launch.

The meta tags referencing these files are wired in `src/app.html`, so replacing the files is a drop-in swap with no code change.

## Deferred copy (grep before launch)

- `TODO: Nick write description` in `src/lib/projects.ts`: one per project card. Replace with real 1-2 sentence blurb per project.
- `TODO: Nick write section content` in `src/lib/case-studies/*.svelte`: 4 per case study (problem, approach, stack, reflection).
- `TODO: Nick edit` markers in `src/lib/components/*.svelte`: placeholder hero/topbar/footer copy awaiting your pass.
- `TODO: review voice` markers in `src/lib/case-studies/*.svelte`: flag each section in case-study files so you can sweep voice in one pass.

