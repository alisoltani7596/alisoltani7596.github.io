/* publications.js — data-driven publication list with type + year filtering */
(function () {
  "use strict";
  var listEl = document.getElementById("publications-list");
  if (!listEl) return;

  var all = [];
  var state = { type: "all", year: "all" };

  function boldMe(authors) {
    return authors.replace(/A\.\s*Soltaninezhad/g, "<b>A. Soltaninezhad</b>");
  }

  function render() {
    var items = all.filter(function (p) {
      return (state.type === "all" || p.type === state.type) &&
             (state.year === "all" || String(p.year) === state.year);
    });
    // highlighted first, then by year desc
    items.sort(function (a, b) {
      if (a.highlight !== b.highlight) return a.highlight ? -1 : 1;
      return b.year - a.year;
    });

    if (!items.length) {
      listEl.innerHTML = '<li class="loading">No publications match this filter.</li>';
      return;
    }

    listEl.innerHTML = items.map(function (p) {
      var statusClass = p.status === "Accepted" ? "accepted"
        : (/review/i.test(p.status) ? "review" : "published");
      var titleHtml = p.link
        ? '<a href="' + p.link + '" target="_blank" rel="noopener">' + p.title + "</a>"
        : p.title;
      var pubUrl = p.doi ? ("https://doi.org/" + p.doi) : p.link;
      var doi = pubUrl
        ? '<a class="pub-doi" href="' + pubUrl + '" target="_blank" rel="noopener">View publication →</a>'
        : "";
      return '<li class="pub-item reveal' + (p.highlight ? " is-highlight" : "") + '">' +
        '<div class="pub-top">' +
          (p.highlight ? '<span class="pub-star" aria-label="Highlighted">★</span>' : "") +
          '<span class="pub-badge ' + statusClass + '">' + p.status + "</span>" +
        "</div>" +
        "<h3>" + titleHtml + "</h3>" +
        '<p class="pub-authors">' + boldMe(p.authors) + "</p>" +
        '<p class="pub-venue">' + p.venue + " · " + p.year + "</p>" +
        doi +
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
      var sel = document.getElementById("pub-year-filter");
      years.forEach(function (yr) {
        var o = document.createElement("option");
        o.value = String(yr); o.textContent = yr;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () { state.year = sel.value; render(); });

      // type chips
      var chips = document.querySelectorAll("#pub-type-filters .chip");
      chips.forEach(function (c) {
        c.addEventListener("click", function () {
          chips.forEach(function (x) { x.classList.remove("active"); });
          c.classList.add("active");
          state.type = c.getAttribute("data-type");
          render();
        });
      });

      render();
    })
    .catch(function () {
      listEl.innerHTML = '<li class="loading">Could not load publications. See <a href="data/publications.json">publications.json</a>.</li>';
    });
})();
