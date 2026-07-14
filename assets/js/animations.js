/* animations.js — GSAP scroll reveals, staggered children, 3D tilt.
   Falls back to instant visibility with no motion when reduced-motion is set
   or GSAP failed to load. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";

  function showAll() {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  if (reduce || !hasGSAP) {
    showAll();
    document.addEventListener("content:rendered", showAll);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  function revealIn(el) {
    if (el.dataset.revealed) return;
    el.dataset.revealed = "1";
    el.classList.add("is-in");
  }

  function bind(scope) {
    var els = (scope || document).querySelectorAll(".reveal:not([data-revealed])");
    els.forEach(function (el, i) {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () {
          // stagger siblings sharing a parent by 70ms
          var sibs = Array.prototype.slice.call(el.parentNode.children)
            .filter(function (n) { return n.classList && n.classList.contains("reveal"); });
          var idx = sibs.indexOf(el);
          gsap.to(el, {
            opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
            delay: (idx > -1 ? idx : 0) * 0.07,
            onStart: function () { revealIn(el); }
          });
        }
      });
    });
  }

  // initial pass + re-bind when JSON content is injected
  bind(document);
  document.addEventListener("content:rendered", function () {
    bind(document);
    ScrollTrigger.refresh();
  });

  /* ---- Section title letter reveal (once per visit) ---- */
  document.querySelectorAll(".section-title").forEach(function (t) {
    var text = t.textContent;
    t.setAttribute("aria-label", text);
    var frag = document.createDocumentFragment();
    text.split("").forEach(function (ch) {
      var s = document.createElement("span");
      s.textContent = ch === " " ? " " : ch;
      s.style.display = "inline-block";
      s.style.opacity = "0";
      s.setAttribute("aria-hidden", "true");
      frag.appendChild(s);
    });
    t.textContent = "";
    t.appendChild(frag);
    ScrollTrigger.create({
      trigger: t, start: "top 85%", once: true,
      onEnter: function () {
        gsap.to(t.children, { opacity: 1, duration: 0.4, stagger: 0.025, ease: "power1.out" });
      }
    });
  });

  /* ---- 3D tilt on hover for cards ---- */
  function attachTilt(card) {
    if (card.dataset.tilt) return;
    card.dataset.tilt = "1";
    var max = 8;
    card.addEventListener("pointermove", function (e) {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: px * max, rotateX: -py * max,
        transformPerspective: 800, duration: 0.3, ease: "power2.out"
      });
    });
    card.addEventListener("pointerleave", function () {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out" });
    });
  }
  function bindTilt() {
    document.querySelectorAll(".tilt-card").forEach(attachTilt);
  }
  bindTilt();
  document.addEventListener("content:rendered", bindTilt);
})();
