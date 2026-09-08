/* publications.js — data-driven publication list with type + year filtering */
(function () {
  "use strict";
  var listEl = document.getElementById("publications-list");
  if (!listEl) return;

  var all = [];
  var state = { type: "all", year: "all" };
  var chips = Array.prototype.slice.call(document.querySelectorAll("#pub-type-filters button"));
  var sel = document.getElementById("pub-year-filter");

  function boldMe(authors) {
    return authors.replace(/A\.\s*Soltaninezhad/g, "<b>A. Soltaninezhad</b>");
  }

  function setType(type) {
    state.type = type;
    chips.forEach(function (c) {
      var on = c.getAttribute("data-type") === type;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    });
  }

  function render() {
    var items = all.filter(function (p) {
      return (state.type === "all" || p.type === state.type) &&
             (state.year === "all" || String(p.year) === state.year);
    });
    // order follows publications.json (filtering preserves that order)

    if (!items.length) {
      listEl.innerHTML =
        '<li class="pub-empty">No publications match this filter. ' +
        '<button type="button" class="link" id="pub-reset">Show all</button></li>';
      var reset = document.getElementById("pub-reset");
      if (reset) reset.addEventListener("click", function () {
        setType("all");
        state.year = "all";
        if (sel) sel.value = "all";
        render();
      });
      return;
    }

    listEl.innerHTML = items.map(function (p) {
      var titleHtml = p.link
        ? '<a href="' + p.link + '" target="_blank" rel="noopener">' + p.title + "</a>"
        : p.title;
      var pubUrl = p.doi ? ("https://doi.org/" + p.doi) : p.link;
      var view = pubUrl
        ? '<a class="link" href="' + pubUrl + '" target="_blank" rel="noopener">View publication</a>'
        : "";
      return '<li class="pub-row">' +
        "<h3>" + titleHtml + "</h3>" +
        '<p class="pub-authors">' + boldMe(p.authors) + "</p>" +
        '<div class="pub-meta">' +
          "<span>" + p.venue + " · " + p.year + "</span>" +
          '<span class="tag">' + p.status + "</span>" +
          (p.oral ? '<span class="tag tag--accent">Oral</span>' : "") +
          view +
        "</div>" +
      "</li>";
    }).join("");
    document.dispatchEvent(new CustomEvent("content:rendered"));
  }

  fetch("data/publications.json?_=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      all = data;

      // year dropdown
      var years = data.map(function (p) { return p.year; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; })
        .sort(function (a, b) { return b - a; });
      if (sel) {
        years.forEach(function (yr) {
          var o = document.createElement("option");
          o.value = String(yr); o.textContent = yr;
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () { state.year = sel.value; render(); });
      }

      // type segmented control
      chips.forEach(function (c) {
        c.addEventListener("click", function () { setType(c.getAttribute("data-type")); render(); });
      });

      render();
    })
    .catch(function () {
      listEl.innerHTML = '<li class="pub-empty">Could not load publications. See <a href="data/publications.json">publications.json</a>.</li>';
    });
})();
