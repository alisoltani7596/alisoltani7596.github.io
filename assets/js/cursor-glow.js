/* cursor-glow.js — soft emerald glow that follows the mouse (fine pointers only).
   A fixed radial-gradient overlay tracks the cursor via CSS custom properties.
   Skipped on touch devices and when the pointer leaves the window. */
(function () {
  "use strict";
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

  var glow = document.createElement("div");
  glow.id = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    glow.style.setProperty("--mx", e.clientX + "px");
    glow.style.setProperty("--my", e.clientY + "px");
    glow.style.opacity = "1";
  }, { passive: true });

  document.addEventListener("mouseleave", function () { glow.style.opacity = "0"; });
  window.addEventListener("blur", function () { glow.style.opacity = "0"; });
})();
