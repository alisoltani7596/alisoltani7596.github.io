/* neural-bg.js — live neural-network texture behind the whole site.
   Signals fire from the input layer and propagate forward; nodes light up as
   pulses arrive. Fixed full-viewport canvas, softened by CSS blur. Theme-aware
   (re-read each frame). Renders one static frame for prefers-reduced-motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.createElement("canvas");
  canvas.id = "neural-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");

  var W, H, dpr, layers = [], fire = [], signals = [];
  var COLS = [0.10, 0.37, 0.63, 0.90], COUNTS = [5, 8, 8, 5];

  function rgb() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "14,157,110" : "53,201,154";
  }

  function buildLayout() {
    layers = []; fire = [];
    for (var c = 0; c < COLS.length; c++) {
      var n = COUNTS[c], arr = [], fr = [];
      for (var i = 0; i < n; i++) {
        var y = H * ((i + 1) / (n + 1)) + Math.sin(c * 3 + i * 1.7) * H * 0.03;
        arr.push({ x: COLS[c] * W, y: y }); fr.push(0);
      }
      layers.push(arr); fire.push(fr);
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLayout();
  }

  function drawEdges(col) {
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(" + col + ",0.08)";
    for (var l = 0; l < layers.length - 1; l++)
      for (var a = 0; a < layers[l].length; a++)
        for (var b = 0; b < layers[l + 1].length; b++) {
          ctx.beginPath();
          ctx.moveTo(layers[l][a].x, layers[l][a].y);
          ctx.lineTo(layers[l + 1][b].x, layers[l + 1][b].y);
          ctx.stroke();
        }
  }

  function drawNodes(col, live) {
    for (var l = 0; l < layers.length; l++)
      for (var j = 0; j < layers[l].length; j++) {
        var f = fire[l][j];
        if (live) fire[l][j] = f * 0.94;
        var nd = layers[l][j];
        ctx.fillStyle = "rgba(" + col + "," + (0.35 + 0.6 * f).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 3 + 2.5 * f, 0, 6.2832); ctx.fill();
      }
  }

  function spawn(l, from) {
    if (l >= layers.length - 1) return;
    var to = Math.floor(Math.random() * layers[l + 1].length);
    signals.push({ l: l, from: from, to: to, t: 0, sp: 0.010 + Math.random() * 0.012 });
  }

  resize();
  window.addEventListener("resize", resize);

  if (reduce) { drawEdges(rgb()); drawNodes(rgb(), false); return; }

  var running = true, last = 0;
  function step(tm) {
    if (!running) return;
    if (!last) last = tm;
    var col = rgb();
    ctx.clearRect(0, 0, W, H);
    drawEdges(col);

    if (tm - last > 140) {
      last = tm;
      var k = 1 + Math.floor(Math.random() * 2);
      for (var s = 0; s < k && signals.length < 70; s++)
        spawn(0, Math.floor(Math.random() * layers[0].length));
    }

    for (var i = signals.length - 1; i >= 0; i--) {
      var g = signals[i];
      g.t += g.sp;
      var p1 = layers[g.l][g.from], p2 = layers[g.l + 1][g.to];
      ctx.fillStyle = "rgba(" + col + ",0.9)";
      ctx.beginPath();
      ctx.arc(p1.x + (p2.x - p1.x) * g.t, p1.y + (p2.y - p1.y) * g.t, 2.4, 0, 6.2832);
      ctx.fill();
      if (g.t >= 1) {
        fire[g.l + 1][g.to] = 1;
        if (g.l + 1 < layers.length - 1 && Math.random() < 0.6) spawn(g.l + 1, g.to);
        signals.splice(i, 1);
      }
    }

    drawNodes(col, true);
    requestAnimationFrame(step);
  }

  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) { last = 0; requestAnimationFrame(step); }
  });
  // immediate base frame so nothing is blank before the first animation tick
  drawEdges(rgb()); drawNodes(rgb(), false);
  requestAnimationFrame(step);
})();
