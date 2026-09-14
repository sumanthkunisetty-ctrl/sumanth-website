/* Liquid-glass micro-interactions: cursor-tracked sheen + ambient drift.
   Additive — no dependency on main.js. Desktop pointers only. */
(function () {
  var fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  var reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  var LIT = ".jr-item,.tool,.quote.big,.quote.small,.skill,.work-item,.art-nextcard,.menu-card,.nav";

  /* ---- sheen: write --mx/--my on the hovered glass surface only --------- */
  if (fine) {
    var pending = null, current = null, raf = 0;
    addEventListener("pointermove", function (e) {
      pending = e;
      if (!raf) raf = requestAnimationFrame(flush);
    }, { passive: true });

    function flush() {
      raf = 0;
      var e = pending; if (!e) return;
      var el = e.target && e.target.closest ? e.target.closest(LIT) : null;
      if (el !== current) {
        if (current) { current.style.removeProperty("--mx"); current.style.removeProperty("--my"); }
        current = el;
      }
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    }
  }

  /* ---- ambient field drifts slightly slower than the page -------------- */
  var amb = document.querySelector(".ambient");
  if (amb && !reduce) {
    var tick = 0;
    addEventListener("scroll", function () {
      if (tick) return;
      tick = requestAnimationFrame(function () {
        tick = 0;
        amb.style.setProperty("--amb-y", (window.scrollY * -0.06).toFixed(1) + "px");
      });
    }, { passive: true });
  }
})();
