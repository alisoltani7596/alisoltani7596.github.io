/* experience.js — everything around the scene: the intro gate, chapter tracking,
   the HUD timeline and detections counter, the menu, reveals, and the project reel. */

import { createScene } from "./scene.js";

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

let scene = null;
try {
  scene = createScene($("#gl"), { reduceMotion });
} catch (e) {
  console.warn("WebGL scene unavailable:", e);
}
if (!scene) root.classList.add("no-webgl");

$("#year").textContent = String(new Date().getFullYear());

/* ---------- Motion toggle ---------- */
const motionBtn = $("#motion-toggle");
let motionOn = !reduceMotion;
try { if (localStorage.getItem("motion") === "off") motionOn = false; } catch (e) {}
function applyMotion() {
  motionBtn.setAttribute("aria-pressed", String(motionOn));
  motionBtn.setAttribute("aria-label", motionOn ? "Pause background animation" : "Play background animation");
  if (scene) scene.setPaused(!motionOn);
}
motionBtn.addEventListener("click", () => {
  motionOn = !motionOn;
  try { localStorage.setItem("motion", motionOn ? "on" : "off"); } catch (e) {}
  applyMotion();
});
applyMotion();

/* ---------- Pointer: the eye follows it, links dilate the pupil, water ripples ---------- */
let currentStage = "water";
window.addEventListener("pointermove", (e) => { if (scene) scene.setPointer(e.clientX, e.clientY); }, { passive: true });
document.addEventListener("pointerover", (e) => {
  if (scene && !root.classList.contains("is-gated")) scene.setPupil(e.target.closest("a, button") ? "wide" : null);
});
document.addEventListener("pointerdown", (e) => {
  if (!scene || root.classList.contains("is-gated")) return;
  if (e.target.closest("a, button, input, select, label, .glass, .menu")) return;
  if (currentStage === "water" || currentStage === "ripple") scene.ripple(e.clientX, e.clientY, 0.8);
});

/* ---------- Detections counter ---------- */
const counter = $("#detections");
const pill = counter.closest(".hud-pill");
let detected = 0;
function bump() {
  detected += 1;
  counter.textContent = String(detected).padStart(2, "0");
  pill.classList.remove("is-pop");
  void pill.offsetWidth;
  pill.classList.add("is-pop");
}
const detectIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    detectIO.unobserve(en.target);
    bump();
  });
}, { threshold: 0.55 });
const watchDetect = (els) => els.forEach((el) => detectIO.observe(el));

/* ---------- Reveals ---------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    revealIO.unobserve(en.target);
  });
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
function watchReveals(els) {
  els.forEach((el) => {
    const sibs = Array.from(el.parentNode.children).filter((n) => n.classList.contains("reveal"));
    el.style.transitionDelay = Math.min(sibs.indexOf(el) * 0.07, 0.35) + "s";
    if (reduceMotion) el.classList.add("is-in");
    else revealIO.observe(el);
  });
}

/* ---------- Chapters, timeline, scene progress ---------- */
const chapters = $$("[data-stage]").map((el) => ({ el, stage: el.dataset.stage, label: el.dataset.label, top: 0, height: 0 }));
const hero = $("#hero");
const projects = $("#projects");
const ticksEl = $("#tl-ticks");
const chapterEl = $("#tl-chapter");
const codeEl = $("#tl-code");
const TICKS = 160, STEP = 8;
let docMax = 1;
let activeChapter = null;

function measure() {
  const sy = window.scrollY;
  chapters.forEach((c) => {
    const r = c.el.getBoundingClientRect();
    c.top = r.top + sy;
    c.height = r.height;
  });
  docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const chapterTicks = new Set(chapters.map((c) => Math.round(clamp01(c.top / docMax) * (TICKS - 1))));
  let html = "";
  for (let i = 0; i < TICKS; i++) {
    const cls = chapterTicks.has(i) ? "is-chapter" : i % 10 === 0 ? "is-major" : "";
    html += `<i class="${cls}" style="left:${i * STEP}px"></i>`;
  }
  ticksEl.innerHTML = html;
  update();
}

function timecode(p) {
  const total = p * 180;
  const mm = Math.floor(total / 60), ss = Math.floor(total % 60), ff = Math.floor((total % 1) * 30);
  return [mm, ss, ff].map((n) => String(n).padStart(2, "0")).join(":");
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; update(); });
}

function update() {
  const y = window.scrollY, vh = window.innerHeight;
  const progress = clamp01(y / docMax);
  const mid = y + vh * 0.5;
  let active = chapters[0];
  for (const c of chapters) if (mid >= c.top) active = c;
  if (active !== activeChapter) {
    activeChapter = active;
    currentStage = active.stage;
    chapterEl.textContent = active.label;
    if (scene) scene.setStage(active.stage);
  }
  root.dataset.tone = active.stage === "tunnel" || active.stage === "sea" ? "dark" : "light";
  root.classList.toggle("is-scrolled", y > 40);

  ticksEl.style.transform = `translateX(${-progress * (TICKS - 1) * STEP}px)`;
  codeEl.textContent = timecode(progress);

  if (scene) {
    const heroH = hero.offsetHeight || vh;
    const pr = projects.getBoundingClientRect();
    scene.setProgress({
      hero: clamp01(y / heroH),
      tunnel: clamp01((vh - pr.top) / (pr.height + vh)),
      scrollV: -y / vh * 0.25,
    });
  }
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); });
if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(() => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); });
  ro.observe($("#main"));
}
document.addEventListener("content:rendered", () => {
  watchDetect($$(".pub-row"));
  setTimeout(measure, 60);
});

/* ---------- Menu ---------- */
const menu = $("#menu");
const menuOpen = $("#menu-open");
const menuClose = $("#menu-close");
let lastFocus = null;
menu.inert = true;
function setMenu(open) {
  menu.classList.toggle("is-open", open);
  menu.inert = !open;
  menuOpen.setAttribute("aria-expanded", String(open));
  if (open) { lastFocus = document.activeElement; menuClose.focus(); }
  else if (lastFocus) lastFocus.focus();
}
menuOpen.addEventListener("click", () => setMenu(true));
menuClose.addEventListener("click", () => setMenu(false));
menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => {
  if (!menu.classList.contains("is-open")) return;
  if (e.key === "Escape") { setMenu(false); return; }
  if (e.key !== "Tab") return;
  const f = $$("a, button", menu);
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Project reel ---------- */
const LINK_LABELS = { paper: "Paper", poster: "Poster", code: "Code", dataset: "Dataset" };
function shortName(p) {
  if (p.short) return p.short;
  return p.title.length <= 22 ? p.title : p.title.split(/\s+/).slice(0, 2).join(" ");
}
function projectCard(p) {
  const links = Object.entries(p.links || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener">${LINK_LABELS[k] || k}</a>`)
    .join("");
  return `
    <li class="shot glass glass--dark reveal" data-detect>
      <div class="shot-media${p.imgFit === "contain" ? " is-contain" : ""}">
        <span class="shot-tag">${shortName(p)}</span>
        <img src="${p.img}" alt="" width="900" height="506" loading="lazy" decoding="async"${p.imgFallback ? ` data-fallback="${p.imgFallback}"` : ""} />
      </div>
      <div class="shot-body">
        <div class="shot-badges"><span class="chip">${p.badge}</span>${p.oral ? '<span class="chip chip--lime">Oral</span>' : ""}</div>
        <h3>${p.title}</h3>
        <p>${p.summary}</p>
        <ul class="shot-tags">${(p.tags || []).map((t) => `<li>${t}</li>`).join("")}</ul>
        ${p.details ? `<div class="shot-details" id="details-${p.id}"><div><p>${p.details}</p></div></div>` : ""}
        <div class="shot-foot">
          ${p.details ? `<button type="button" class="more" aria-expanded="false" aria-controls="details-${p.id}">Show more</button>` : ""}
          ${links ? `<div class="shot-links">${links}</div>` : ""}
        </div>
      </div>
    </li>`;
}
const reel = $("#projects-list");
reel.addEventListener("click", (e) => {
  const btn = e.target.closest(".more");
  if (!btn) return;
  const panel = document.getElementById(btn.getAttribute("aria-controls"));
  const open = btn.getAttribute("aria-expanded") !== "true";
  btn.setAttribute("aria-expanded", String(open));
  btn.textContent = open ? "Show less" : "Show more";
  panel.classList.toggle("is-open", open);
});
fetch("data/projects.json?_=" + Date.now(), { cache: "no-store" })
  .then((r) => r.json())
  .then((list) => {
    reel.innerHTML = list.map(projectCard).join("");
    $$("img[data-fallback]", reel).forEach((img) => {
      img.addEventListener("error", () => { img.src = img.dataset.fallback; img.removeAttribute("data-fallback"); }, { once: true });
    });
    const cards = $$(".shot", reel);
    watchReveals(cards);
    watchDetect(cards);
    if (scene) scene.loadFrames(list.map((p) => ({ ...p, short: shortName(p) })));
    setTimeout(measure, 60);
  })
  .catch(() => {
    reel.innerHTML = '<li class="lede">Could not load projects. See <a href="data/projects.json">projects.json</a>.</li>';
  });

/* ---------- Intro gate: count to 99, then draw a bounding box ---------- */
const gate = $("#gate");
const drawSvg = $("#gate-draw");
const heroReveals = $$(".reveal", hero);

function startPage() {
  watchReveals(heroReveals);
  watchReveals($$(".reveal").filter((el) => !hero.contains(el) && !reel.contains(el)));
  watchDetect($$("[data-detect]").filter((el) => !reel.contains(el)));
}

function boxMarkup(a, b, label) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
  const L = Math.min(22, w / 3, h / 3);
  const corners = `M${x},${y + L}V${y}H${x + L}M${x + w - L},${y}H${x + w}V${y + L}M${x + w},${y + h - L}V${y + h}H${x + w - L}M${x + L},${y + h}H${x}V${y + h - L}`;
  const text = label || `${Math.round(w)} × ${Math.round(h)}`;
  const tw = text.length * 7.4 + 16;
  const ty = y > 34 ? y - 26 : y + 6;
  return `<g><rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" />
    <path class="corners" d="${corners}" />
    <g class="tag" transform="translate(${x},${ty})"><rect width="${tw}" height="20" rx="4" /><text x="8" y="14">${text}</text></g></g>`;
}

function runGate() {
  const countEl = $("#gate-count");
  const skipBtn = $("#gate-skip");
  const t0 = performance.now();
  const MIN_MS = 1500;
  let loaded = false, armed = false, done = false, start = null;
  Promise.all([document.fonts ? document.fonts.ready : null, new Promise((r) => setTimeout(r, 250))]).then(() => { loaded = true; });

  (function count() {
    let p = Math.min(1, (performance.now() - t0) / MIN_MS);
    if (!loaded) p = Math.min(p, 0.92);
    countEl.textContent = String(Math.floor(p * 99)).padStart(2, "0");
    if (p < 1) requestAnimationFrame(count);
    else { gate.classList.add("is-ready"); armed = true; }
  })();

  function nudge() {
    gate.classList.remove("is-nudge");
    void gate.offsetWidth;
    gate.classList.add("is-nudge");
  }

  function finish(a, b) {
    if (done) return;
    done = true;
    drawSvg.innerHTML = boxMarkup(a, b, "drawing a box · 0.98");
    gate.classList.add("is-done");
    try { sessionStorage.setItem("gate-done", "1"); } catch (e) {}
    if (scene) {
      scene.ripple((a.x + b.x) / 2, (a.y + b.y) / 2, 1.2);
      scene.setPupil(null);
    }
    bump();
    setTimeout(() => {
      gate.classList.add("is-leaving");
      root.classList.remove("is-gated");
      startPage();
      setTimeout(() => { gate.classList.remove("is-leaving"); gate.hidden = true; }, 1000);
    }, 750);
  }

  // Skipping still draws the box, quickly, from the centre out.
  function autoBox() {
    if (done) return;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const hw = Math.min(170, window.innerWidth * 0.3), hh = hw * 0.62;
    const t1 = performance.now();
    gate.classList.add("is-drawing");
    (function grow() {
      const k = Math.min(1, (performance.now() - t1) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      const a = { x: cx - hw * e, y: cy - hh * e }, b = { x: cx + hw * e, y: cy + hh * e };
      drawSvg.innerHTML = boxMarkup(a, b);
      if (k < 1) requestAnimationFrame(grow);
      else finish(a, b);
    })();
  }

  gate.addEventListener("pointerdown", (e) => {
    if (!armed || done || e.target.closest(".gate-skip")) return;
    start = { x: e.clientX, y: e.clientY };
    gate.setPointerCapture(e.pointerId);
    gate.classList.add("is-drawing");
    if (scene) { scene.setPupil("focus"); scene.setPointer(e.clientX, e.clientY); }
    drawSvg.innerHTML = boxMarkup(start, start);
  });
  gate.addEventListener("pointermove", (e) => {
    if (!start) return;
    drawSvg.innerHTML = boxMarkup(start, { x: e.clientX, y: e.clientY });
  });
  const release = (e) => {
    if (!start) return;
    const a = start, b = { x: e.clientX, y: e.clientY };
    start = null;
    gate.classList.remove("is-drawing");
    if (e.type === "pointerup" && Math.abs(b.x - a.x) > 48 && Math.abs(b.y - a.y) > 36) finish(a, b);
    else {
      drawSvg.innerHTML = "";
      if (scene) scene.setPupil(null);
      nudge();
    }
  };
  gate.addEventListener("pointerup", release);
  gate.addEventListener("pointercancel", release);
  gate.addEventListener("wheel", (e) => { e.preventDefault(); if (armed) nudge(); }, { passive: false });
  skipBtn.addEventListener("click", autoBox);
  document.addEventListener("keydown", (e) => {
    if (done || !root.classList.contains("is-gated")) return;
    if (["Enter", " ", "Escape", "ArrowDown", "PageDown"].includes(e.key) && document.activeElement !== skipBtn) {
      e.preventDefault();
      autoBox();
    }
  });
}

measure();
if (root.classList.contains("is-gated")) runGate();
else {
  gate.hidden = true;
  startPage();
}
