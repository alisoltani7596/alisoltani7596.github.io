/* progress-line.js — gamified "detection" line ending at Get in touch.
   A visible emerald line draws down the page as you scroll. Each section is a
   detection bounding box; a moving detector box (the head) travels the line, and
   an IoU readout beside each box climbs 0 -> 100% -> 0 as the head passes through
   it. The line ends at the "Get in touch" block, which lights up as the finale.
   Scroll-position driven (no rAF). */
(function () {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var S = 30; // bounding-box size

  function el(t) { return document.createElementNS(SVGNS, t); }

  var svg = el("svg");
  svg.setAttribute("id", "progress-line");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("preserveAspectRatio", "none");
  var track = el("path"); track.setAttribute("class", "pl-track");
  var draw  = el("path"); draw.setAttribute("class", "pl-draw");
  var cpG = el("g");
  var head = el("rect");
  head.setAttribute("class", "pl-head");
  head.setAttribute("width", S); head.setAttribute("height", S); head.setAttribute("rx", "3");
  svg.appendChild(track); svg.appendChild(draw); svg.appendChild(cpG); svg.appendChild(head);
  document.body.insertBefore(svg, document.body.firstChild);

  var len = 0, cps = [];

  function docH() { return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight); }

  function anchors() {
    var W = document.documentElement.clientWidth;
    var secs = Array.prototype.slice.call(document.querySelectorAll("main > section"));
    if (!secs.length) return [];
    var mL = Math.max(46, W * 0.13), mR = W - mL;
    var goal = document.getElementById("get-in-touch");
    var pts = [];
    secs.forEach(function (s, i) {
      if (goal && s.contains(goal)) return;
      var y = s.getBoundingClientRect().top + window.scrollY + s.offsetHeight * 0.5;
      pts.push({ x: (i % 2 === 0) ? mL : mR, y: y, node: true, side: (i % 2 === 0) ? "L" : "R" });
    });
    if (goal) {
      var gy = goal.getBoundingClientRect().top + window.scrollY;
      pts.push({ x: W / 2, y: gy, node: true, side: "C" });
    }
    pts.unshift({ x: pts[0] ? pts[0].x : W / 2, y: 0, node: false });
    return pts;
  }

  function pathD(pts) {
    if (pts.length < 2) return "";
    var d = "M " + pts[0].x + " " + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " +
                   c2x.toFixed(1) + " " + c2y.toFixed(1) + " " +
                   p2.x.toFixed(1) + " " + p2.y.toFixed(1);
    }
    return d;
  }

  function lengthFracAt(pt) {
    var steps = 240, best = 0, bd = Infinity;
    for (var i = 0; i <= steps; i++) {
      var q = draw.getPointAtLength(len * i / steps);
      var dd = (q.x - pt.x) * (q.x - pt.x) + (q.y - pt.y) * (q.y - pt.y);
      if (dd < bd) { bd = dd; best = i / steps; }
    }
    return best;
  }

  function goalScroll() {
    var maxScroll = docH() - window.innerHeight;
    var b = document.getElementById("get-in-touch");
    var g = maxScroll;
    if (b) {
      var top = b.getBoundingClientRect().top + window.scrollY;
      g = top + b.offsetHeight * 0.5 - window.innerHeight * 0.5;
    }
    // never require more scroll than the page has — on tall monitors the block
    // can't reach centre, so completion must land by the time you hit the bottom.
    return Math.max(1, Math.min(g, maxScroll));
  }

  function build() {
    var W = document.documentElement.clientWidth, H = docH();
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var pts = anchors();
    var d = pathD(pts);
    if (!d) { len = 0; return; }
    track.setAttribute("d", d); draw.setAttribute("d", d);
    len = draw.getTotalLength();
    draw.style.strokeDasharray = len;
    cpG.textContent = "";
    cps = [];
    pts.forEach(function (p) {
      if (!p.node) return;
      var g = el("g");
      var box = el("rect");
      box.setAttribute("class", "pl-box");
      box.setAttribute("x", (p.x - S / 2).toFixed(1));
      box.setAttribute("y", (p.y - S / 2).toFixed(1));
      box.setAttribute("width", S); box.setAttribute("height", S); box.setAttribute("rx", "3");
      var label = el("text");
      label.setAttribute("class", "pl-iou");
      if (p.side === "R") { label.setAttribute("x", (p.x - S / 2 - 8).toFixed(1)); label.setAttribute("text-anchor", "end"); }
      else { label.setAttribute("x", (p.x + S / 2 + 8).toFixed(1)); label.setAttribute("text-anchor", "start"); }
      label.setAttribute("y", (p.y + 4).toFixed(1));
      g.appendChild(box); g.appendChild(label); cpG.appendChild(g);
      cps.push({ cx: p.x, cy: p.y, frac: lengthFracAt(p), box: box, label: label });
    });
    update();
  }

  function update() {
    if (!len) return;
    var p = Math.min(1, Math.max(0, window.scrollY / goalScroll()));
    draw.style.strokeDashoffset = len * (1 - p);
    var pt = draw.getPointAtLength(len * p);
    head.setAttribute("x", (pt.x - S / 2).toFixed(1));
    head.setAttribute("y", (pt.y - S / 2).toFixed(1));
    var moving = p > 0.001 && p < 0.999;
    head.style.opacity = moving ? 1 : 0;
    for (var i = 0; i < cps.length; i++) {
      var c = cps[i];
      var dx = Math.abs(pt.x - c.cx), dy = Math.abs(pt.y - c.cy);
      var iw = Math.max(0, S - dx), ih = Math.max(0, S - dy);
      var inter = iw * ih, iou = moving ? inter / (2 * S * S - inter) : 0;
      c.box.classList.toggle("cleared", p >= c.frac - 0.002);
      c.box.classList.toggle("lock", iou > 0.5);
      if (iou > 0.02) {
        c.label.textContent = "IoU " + Math.round(iou * 100) + "%";
        c.label.style.opacity = Math.min(1, 0.35 + iou);
      } else {
        c.label.style.opacity = 0;
      }
    }
    var block = document.getElementById("get-in-touch");
    if (block) block.classList.toggle("arrived", p >= 0.999);
  }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  build();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", debounce(build, 160));
  window.addEventListener("load", function () { setTimeout(build, 60); });
  document.addEventListener("content:rendered", function () { setTimeout(build, 60); });
})();
