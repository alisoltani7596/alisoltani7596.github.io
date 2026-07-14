/* main.js — nav, theme toggle, smooth scroll, rotator, projects render */
(function () {
  "use strict";

  /* ---- Theme ---- */
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

  function syncToggle() {
    if (toggle) toggle.setAttribute("aria-pressed", root.getAttribute("data-theme") === "light");
  }
  syncToggle();

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      syncToggle();
      document.querySelector('meta[name="theme-color"]')
        .setAttribute("content", next === "dark" ? "#0a0a0b" : "#fafafa");
    });
  }

  /* ---- Mobile nav ---- */
  var burger = document.getElementById("nav-burger");
  var links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open);
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Active nav link on scroll ---- */
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navAnchors.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Year ---- */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Hero rotator ---- */
  var rotEl = document.querySelector(".rotator-word");
  if (rotEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var words = ["in the real world", "in computer vision", "in video understanding", "in deployable AI"];
    var i = 0;
    rotEl.style.transition = "opacity 0.25s ease";
    setInterval(function () {
      i = (i + 1) % words.length;
      rotEl.style.opacity = "0";
      setTimeout(function () { rotEl.textContent = words[i]; rotEl.style.opacity = "1"; }, 250);
    }, 2600);
  }

  /* ---- Projects render (data-driven) ---- */
  var grid = document.getElementById("projects-grid");
  if (grid) {
    fetch("data/projects.json?_=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (projects) {
        grid.innerHTML = "";
        projects.forEach(function (p) {
          var links = "";
          if (p.links) {
            if (p.links.paper) links += '<a href="' + p.links.paper + '" target="_blank" rel="noopener">Paper →</a>';
            if (p.links.code) links += '<a href="' + p.links.code + '" target="_blank" rel="noopener">Code →</a>';
            if (p.links.dataset) links += '<a href="' + p.links.dataset + '" target="_blank" rel="noopener">Dataset →</a>';
          }
          var card = document.createElement("article");
          card.className = "project-card reveal";
          var thumbClass = p.imgFit === "contain" ? "project-thumb is-contain" : "project-thumb";
          var onErr = p.imgFallback
            ? " onerror=\"this.onerror=null;this.src='" + p.imgFallback + "'\""
            : "";
          card.innerHTML =
            '<div class="' + thumbClass + '">' +
              '<img src="' + p.img + '" alt="' + p.title + ' preview" loading="lazy" width="640" height="400"' + onErr + ' />' +
            '</div>' +
            '<div class="project-body">' +
              '<span class="project-badge">' + p.badge + '</span>' +
              '<h3>' + p.title + '</h3>' +
              '<p class="project-summary">' + p.summary + '</p>' +
              '<div class="project-tags">' + p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join("") + '</div>' +
              '<p class="project-details" hidden>' + p.details + '</p>' +
              '<div class="project-links">' +
                '<button class="project-readmore" aria-expanded="false">Read more ↓</button>' + links +
              '</div>' +
            '</div>';
          var btn = card.querySelector(".project-readmore");
          var det = card.querySelector(".project-details");
          btn.addEventListener("click", function () {
            var willOpen = det.hasAttribute("hidden");
            if (willOpen) { det.removeAttribute("hidden"); btn.textContent = "Read less ↑"; }
            else { det.setAttribute("hidden", ""); btn.textContent = "Read more ↓"; }
            btn.setAttribute("aria-expanded", willOpen);
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
