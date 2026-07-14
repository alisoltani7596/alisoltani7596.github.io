# alisoltani7596.github.io

Personal site for Ali Soltaninezhad — PhD candidate in Electrical & Computer
Engineering at the University of Victoria (computer vision, video understanding,
deployable AI).

Single-page, dark-mode-first site. **No build step** — plain HTML/CSS/JS served
directly by GitHub Pages.

## Stack

- Hand-written CSS (`assets/css/custom.css`), theming via `[data-theme]` + CSS variables
- Vanilla JS (no framework)
- [GSAP](https://gsap.com/) + ScrollTrigger via CDN for scroll reveals & tilt
- Animated gradient-mesh hero on `<canvas>` (no Three.js)
- Google Fonts: Inter (body) + Space Grotesk (headings)

## Structure

```
index.html              Single page, all sections + JSON-LD + meta
assets/css/custom.css   All styles (dark + light themes)
assets/js/main.js       Nav, theme toggle, mobile menu, rotator, projects render
assets/js/hero-bg.js    Gradient-mesh canvas background
assets/js/publications.js  Publication list + type/year filtering
assets/js/animations.js GSAP scroll reveals, section-title reveal, 3D tilt
assets/img/             Project thumbnails
assets/cv/              Drop Ali_Soltaninezhad_CV.pdf here
data/projects.json      Project cards (data-driven)
data/publications.json  Publications (data-driven)
favicon.svg  robots.txt  sitemap.xml  .nojekyll
```

`.nojekyll` disables Jekyll so `data/` and all assets are served verbatim.

## Editing content

- **Add a publication:** append one object to `data/publications.json`
  (`type` is `Journal` or `Conference`; `status` is `Accepted` or `Published`;
  `highlight: true` pins it to the top). No code change needed.
- **Add a project:** append one object to `data/projects.json`.
- **CV button:** add `assets/cv/Ali_Soltaninezhad_CV.pdf` (path is already wired).
- **Contact form:** create a free form at [formspree.io](https://formspree.io)
  and replace `YOUR_FORM_ID` in `index.html` with your endpoint ID.

## Local preview

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/> (a server is required — the JSON files are
loaded with `fetch`, which does not work from `file://`).

## Accessibility & performance

- All motion respects `prefers-reduced-motion`
- Keyboard-navigable nav, theme toggle, project disclosure, form
- WCAG-AA contrast in both themes
- Images lazy-loaded with explicit dimensions; fonts preconnected with `display=swap`

The previous HTML5 UP template is preserved in `_legacy/` and the unused
`elements.html` / `generic.html` files remain for reference.
