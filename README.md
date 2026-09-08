# alisoltani7596.github.io

Personal site for Ali Soltaninezhad — PhD candidate in Electrical & Computer
Engineering at the University of Victoria (computer vision, video understanding,
deployable AI).

Single page. **No build step** — plain HTML/CSS/JS served directly by GitHub Pages.

## Design

Apple-style: cool grey ground, white surfaces with hairline dividers, system
type with negative tracking, one blue accent, frosted glass only on the nav and
the mobile menu. Light by default; the theme toggle stores a dark preference.
The industry chapter inverts whichever theme is active.

The hero art is a drawn SVG rather than a photo: a field of dots for everything a
model looked at, with a few threaded out to the short queue a person reviews. It is
coloured from the theme tokens, so it inverts with the rest of the page.

Motion is scroll-bound rather than decorative: a pinned hero scene driven by a
damped scroll value, a nav that goes from flush to frosted once content scrolls
beneath it and adopts the palette of the chapter crossing mid-screen, one-shot
reveals, and an ambient float on the hero frame. Everything is skipped under
`prefers-reduced-motion`; glass is dropped under `prefers-reduced-transparency`.

## Stack

- Hand-written CSS (`assets/css/custom.css`), tokens on `:root`, theming via `html[data-theme]`
- Vanilla JS, no libraries, no fonts loaded over the network (system font stack)
- Data-driven publications and projects from `data/*.json`

## Structure

```
index.html                 Single page, all sections + JSON-LD + meta
assets/css/custom.css      All styles (light + dark themes, inverted chapter)
assets/js/main.js          Theme, nav states, mobile menu, reveals, hero scene, parallax, projects render
assets/js/publications.js  Publication list + type/year filtering
assets/img/fishvue-deck.jpg Industry chapter media (TrapCounter output)
assets/img/thumbs/         Project thumbnails (900px JPEGs); originals stay in assets/img/
assets/cv/                 Ali_Soltaninezhad_CV.pdf
data/projects.json         Project cards
data/publications.json     Publications
favicon.svg  robots.txt  sitemap.xml  .nojekyll
```

`.nojekyll` disables Jekyll so `data/` and all assets are served verbatim.

## Editing content

- **Add a publication:** append one object to `data/publications.json`
  (`type` is `Journal` or `Conference`; `status` is `Accepted` or `Published`;
  `oral: true` adds an accent Oral tag). Order in the file is display order.
- **Add a project:** append one object to `data/projects.json`; point `img` at a
  900px-wide JPEG in `assets/img/thumbs/` (`sips -Z 900 -s format jpeg in.png --out thumbs/out.jpg`).
  `imgFit: "contain"` shows a wide figure whole instead of cropping it, and `oral: true`
  adds an accent Oral tag next to the badge.
- **CV button:** keep `assets/cv/Ali_Soltaninezhad_CV.pdf` up to date (path is wired).

## Local preview

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/> (a server is required — the JSON files are
loaded with `fetch`, which does not work from `file://`).

## Accessibility & performance

- Motion respects `prefers-reduced-motion`; glass respects `prefers-reduced-transparency` and `prefers-contrast`
- Keyboard-navigable nav, menu (Escape closes), theme toggle, filters, project disclosure
- Images lazy-loaded with explicit dimensions; the hero image is preloaded
- No web fonts, no third-party scripts

The previous HTML5 UP template is preserved in `_legacy/` and the unused
`elements.html` / `generic.html` files remain for reference.
