/* main.js — theme, nav states, mobile menu, in-page scrolling, reveals,
   the hero scroll scene, damped parallax, and the projects render.
   Plain JS, no dependencies. Motion is skipped under prefers-reduced-motion. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supportsIO = "IntersectionObserver" in window;

  /* ---- Theme (a stored choice is applied before paint by the inline script in <head>) ---- */
  var toggle = document.getElementById("theme-toggle");
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(theme === "dark"));
      toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
    });
  }

  /* ---- Nav: flush at the top, frosted once content scrolls beneath it ---- */
  var nav = document.getElementById("nav");
  var sentinel = document.getElementById("nav-sentinel");
  if (nav && sentinel && supportsIO) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle("is-scrolled", !entries[0].isIntersecting);
    }).observe(sentinel);
  } else if (nav) {
    nav.classList.add("is-scrolled");
  }

  /* ---- Nav: take the palette of whichever chapter sits beneath it ---- */
  var chapters = document.querySelectorAll("main [data-chapter]");
  var chapterSpy = null;
  function pickChapter() {
    // sections are contiguous and in order: the first one whose bottom edge is below the
    // top of the viewport is the one under the nav (or, at the very top, the first section)
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().bottom > 1) {
        nav.setAttribute("data-chapter", chapters[i].getAttribute("data-chapter"));
        return;
      }
    }
  }
  function watchChapters() {
    if (chapterSpy) chapterSpy.disconnect();
    // observe only the strip the nav covers; a section entering or leaving it re-evaluates
    chapterSpy = new IntersectionObserver(pickChapter, {
      rootMargin: "0px 0px " + (-(window.innerHeight - nav.offsetHeight)) + "px 0px",
      threshold: 0
    });
    chapters.forEach(function (s) { chapterSpy.observe(s); });
    pickChapter();
  }
  if (nav && chapters.length && supportsIO) {
    watchChapters();
    var chapterResize;
    window.addEventListener("resize", function () { clearTimeout(chapterResize); chapterResize = setTimeout(watchChapters, 150); });
  }

  /* ---- Nav: highlight the section in view ---- */
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var spied = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  var heroSection = document.getElementById("hero");
  if (heroSection) spied.push(heroSection); // no link points here: clears the highlight at the top
  if (supportsIO && spied.length) {
    var linkSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spied.forEach(function (s) { linkSpy.observe(s); });
  }

  /* ---- Mobile menu: a glass sheet that materializes from the nav ---- */
  var burger = document.getElementById("nav-burger");
  var links = document.getElementById("nav-links");
  var scrim = document.getElementById("nav-scrim");

  function setMenu(open) {
    if (!links) return;
    links.classList.toggle("is-open", open);
    if (scrim) scrim.classList.toggle("is-open", open);
    root.classList.toggle("menu-open", open);
    if (burger) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }
  if (burger && links) {
    burger.addEventListener("click", function () { setMenu(!links.classList.contains("is-open")); });
    if (scrim) scrim.addEventListener("click", function () { setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("is-open")) { setMenu(false); burger.focus(); }
    });
  }

  /* ---- In-page links: travel smoothly (instantly under reduced motion) ---- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    if (id === "hero") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (history.pushState) history.pushState(null, "", id === "hero" ? location.pathname + location.search : "#" + id);
  });

  /* ---- Year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- Reveals: one-shot, siblings stagger ---- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  reveals.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (n) {
      return n.classList && n.classList.contains("reveal");
    });
    el.style.setProperty("--i", String(Math.min(sibs.indexOf(el), 6)));
  });
  if (reduce || !supportsIO) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("is-in");
        revealer.unobserve(el);
        // once settled, drop the reveal styles so hover and parallax transforms apply
        var delay = 700 + Number(el.style.getPropertyValue("--i") || 0) * 70;
        setTimeout(function () { el.classList.remove("reveal", "is-in"); }, delay);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { revealer.observe(el); });
  }

  /* ---- Scroll engine: a damped shadow value per driver, rAF only while settling ---- */
  var drivers = [];
  var rafId = 0;
  var ALPHA = 0.12;

  function tick() {
    var busy = false;
    drivers.forEach(function (d) {
      var diff = d.target - d.current;
      if (Math.abs(diff) > 0.0005) { d.current += diff * ALPHA; busy = true; }
      else d.current = d.target;
      d.apply(d.current);
    });
    rafId = busy ? requestAnimationFrame(tick) : 0;
  }
  function wake() {
    if (!drivers.length) return;
    drivers.forEach(function (d) { d.measure(); });
    if (!rafId) rafId = requestAnimationFrame(tick);
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function span(p, a, b) { return clamp01((p - a) / (b - a)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); } /* scroll motion eases out; no overshoot */

  /* Hero: pinned scene. Copy leaves first, then the frame grows into the centre. */
  var hero = document.getElementById("hero");
  var scene = hero && hero.querySelector(".hero-scene");
  var copy = hero && hero.querySelector(".hero-copy");
  if (hero && scene && copy && !reduce) {
    hero.classList.add("has-scene");
    var lift = 0;
    drivers.push({
      target: 0, current: 0,
      measure: function () {
        var range = hero.offsetHeight - window.innerHeight;
        this.target = range > 0 ? clamp01(window.scrollY / range) : 0;
        lift = copy.offsetHeight / 2 + 24;
        hero.style.setProperty("--lift", lift.toFixed(0) + "px");
      },
      apply: function (p) {
        var t = easeOut(span(p, 0, 0.55));
        var m = easeOut(span(p, 0.05, 0.75));
        scene.style.setProperty("--hc-o", String(1 - t));
        scene.style.setProperty("--hc-y", (t * -48).toFixed(2) + "px");
        scene.style.setProperty("--hm-s", (0.92 + 0.08 * m).toFixed(4));
        scene.style.setProperty("--hm-y", (m * -lift).toFixed(2) + "px");
      }
    });
  }

  /* Parallax: an element's progress through the viewport, 0 entering → 1 leaving */
  if (!reduce) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-parallax]"), function (el) {
      drivers.push({
        target: 0.5, current: 0.5,
        measure: function () {
          var r = el.getBoundingClientRect();
          var vh = window.innerHeight;
          this.target = clamp01((vh - r.top) / (vh + r.height));
        },
        apply: function (p) { el.style.setProperty("--p", p.toFixed(4)); }
      });
    });
  }

  if (drivers.length) {
    drivers.forEach(function (d) { d.measure(); d.current = d.target; d.apply(d.current); });
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    window.addEventListener("load", wake);
    document.addEventListener("content:rendered", function () { setTimeout(wake, 50); });
  }

  /* ---- Projects (data-driven) ---- */
  var grid = document.getElementById("projects-grid");
  if (grid) {
    fetch("data/projects.json?_=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (projects) {
        grid.innerHTML = "";
        projects.forEach(function (p) {
          var external = "";
          if (p.links) {
            if (p.links.paper) external += '<a class="link" href="' + p.links.paper + '" target="_blank" rel="noopener">Paper</a>';
            if (p.links.poster) external += '<a class="link" href="' + p.links.poster + '" target="_blank" rel="noopener">Poster</a>';
            if (p.links.code) external += '<a class="link" href="' + p.links.code + '" target="_blank" rel="noopener">Code</a>';
            if (p.links.dataset) external += '<a class="link" href="' + p.links.dataset + '" target="_blank" rel="noopener">Dataset</a>';
          }
          var card = document.createElement("article");
          card.className = "card";
          var thumbClass = p.imgFit === "contain" ? "card-thumb is-contain" : "card-thumb";
          var onErr = p.imgFallback
            ? " onerror=\"this.onerror=null;this.src='" + p.imgFallback + "'\""
            : "";
          card.innerHTML =
            '<div class="' + thumbClass + '">' +
              '<img src="' + p.img + '" alt="' + p.title + ' preview" loading="lazy" decoding="async" width="900" height="506"' + onErr + ' />' +
            '</div>' +
            '<div class="card-body">' +
              '<div class="card-tags"><span class="tag">' + p.badge + '</span>' +
                (p.oral ? '<span class="tag tag--accent">Oral</span>' : "") + '</div>' +
              '<h3>' + p.title + '</h3>' +
              '<p class="card-summary">' + p.summary + '</p>' +
              '<div class="card-tags">' + p.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join("") + '</div>' +
              '<p class="card-details" hidden>' + p.details + '</p>' +
              '<div class="card-links">' +
                '<button type="button" class="link card-more" aria-expanded="false">Show more</button>' + external +
              '</div>' +
            '</div>';
          var btn = card.querySelector(".card-more");
          var det = card.querySelector(".card-details");
          btn.addEventListener("click", function () {
            var open = det.hasAttribute("hidden");
            if (open) det.removeAttribute("hidden"); else det.setAttribute("hidden", "");
            btn.textContent = open ? "Show less" : "Show more";
            btn.setAttribute("aria-expanded", String(open));
            wake();
          });
          grid.appendChild(card);
        });
        document.dispatchEvent(new CustomEvent("content:rendered"));
      })
      .catch(function () {
        grid.innerHTML = '<p class="loading">Could not load projects. See <a href="data/projects.json">projects.json</a>.</p>';
      });
  }
})();
