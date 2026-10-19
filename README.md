# alisoltani7596.github.io

Personal site for Ali Soltaninezhad — PhD candidate in Electrical & Computer
Engineering at the University of Victoria (computer vision, video understanding,
deployable AI).

Single page. **No build step** — plain HTML/CSS/JS served directly by GitHub Pages.

## Design

A staged, scroll-driven page over one fixed WebGL scene, modelled on the structure
of [why.zero.university](https://why.zero.university/) (analysed with
[REA](https://github.com/morluto/rea)) but built from scratch with procedural
shaders and no third-party 3D assets.

Each section declares a `data-stage`, and the scene repaints itself for it:

| Stage    | Sections                          | Ground                                           | 3D layer                         |
| -------- | --------------------------------- | ------------------------------------------------ | -------------------------------- |
| `water`  | Hero                              | Frosted water caustics                           | Glass eye that follows the cursor |
| `white`  | Thesis                            | Clean white                                      | A few faint detection boxes      |
| `sky`    | Research, About                   | Haze, clouds and a fan of light                  | Detection boxes drifting like petals |
| `tunnel` | Projects                          | Dark teal                                         | Tunnel of project frames, specks |
| `paper`  | Publications, Teaching, Honors    | Paper white                                      | —                                |
| `sea`    | Industry impact                   | Deep water with dim caustics                     | —                                |
| `ripple` | Contact                           | Water again; clicks make ripples                 | The eye returns, smaller         |

Around the scene:

- **Intro gate** — counts 00 → 99 while assets load, then asks the visitor to draw a
  bounding box. The box is labelled `drawing a box · 0.98` (the action it just
  detected) and the page opens. Shown once per session; skipped for deep links
  (`/#publications`), under `prefers-reduced-motion`, or with the Skip button / Enter.
- **HUD** — motion toggle (pauses the scene), a timeline ruler with a timecode and
  the current chapter, and a "detected" counter that ticks up as cards scroll into view.
- **Dock** — home orb, "Get in touch", and a full-screen menu.

Type is Instrument Serif (display) and Geist Mono (labels), self-hosted; body text
uses the system font stack. Glass respects `prefers-reduced-transparency`.

The previous Apple-style design is kept, unchanged, at `classic.html` (no-indexed,
linked from the menu and footer).

## Stack

- three.js r160, vendored at `assets/vendor/three.module.min.js` (loaded as an ES module, no CDN)
- Hand-written CSS (`assets/css/immersive.css`), tokens on `:root`
- Vanilla JS modules; data-driven publications and projects from `data/*.json`
- No trackers, no third-party requests at runtime

## Structure

```
index.html                    Single page, all sections + JSON-LD + meta
assets/css/immersive.css      Layout, HUD, dock, menu, gate, stages
assets/js/scene.js            WebGL scene: ground shader, glass eye, boxes, project tunnel
assets/js/experience.js       Gate, chapter tracking, timeline, counter, menu, reveals, project reel
assets/js/publications.js     Publication list + type/year filtering (shared with classic.html)
assets/vendor/                three.js
assets/fonts/                 Instrument Serif, Geist Mono (woff2)
assets/img/fishvue-deck.jpg   Industry chapter media (TrapCounter output)
assets/img/thumbs/            Project thumbnails (900px JPEGs), also used as tunnel frames
assets/cv/                    Ali_Soltaninezhad_CV.pdf
assets/posters/               Conference posters
data/projects.json            Project cards
data/publications.json        Publications
classic.html                  Previous design (uses assets/css/custom.css + assets/js/main.js)
favicon.svg  robots.txt  sitemap.xml  .nojekyll
```

`.nojekyll` disables Jekyll so `data/` and all assets are served verbatim.

## Editing content

- **Add a publication:** append one object to `data/publications.json`
  (`type` is `Journal` or `Conference`; `status` is `Accepted` or `Published`;
  `oral: true` adds an Oral tag). Order in the file is display order.
- **Add a project:** append one object to `data/projects.json`; point `img` at a
  900px-wide JPEG in `assets/img/thumbs/` (`sips -Z 900 -s format jpeg in.png --out thumbs/out.jpg`).
  `short` is the label on the card and on its tunnel frame (falls back to the title).
  `imgFit: "contain"` shows a wide figure whole instead of cropping it, and `oral: true`
  adds an Oral tag. `links` accepts `paper`, `poster`, `code` and `dataset`; empty strings are skipped.
- **Tune a chapter's look:** edit its entry in `STAGES` at the top of `assets/js/scene.js`
  (two colours plus caustic, frost, haze, light-ray and dark amounts).
- **CV button:** keep `assets/cv/Ali_Soltaninezhad_CV.pdf` up to date (path is wired).

## Local preview

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/> (a server is required — the JSON files and ES
modules are loaded with `fetch`/`import`, which do not work from `file://`).
The intro shows once per tab session; open the page in a new tab to see it again.

## Accessibility & performance

- All content is real HTML; the canvas is decorative (`aria-hidden`)
- `prefers-reduced-motion`: no intro, no reveals, the scene renders still frames only
- The HUD motion toggle pauses the scene and remembers the choice
- Keyboard: skip link, Skip intro / Enter on the gate, menu with focus trap and Escape
- Without WebGL the stages fall back to CSS gradients
- Pixel ratio is capped (1.5 on small screens, 1.75 otherwise), unused shader layers
  are skipped per chapter, and rendering stops when the tab is hidden
