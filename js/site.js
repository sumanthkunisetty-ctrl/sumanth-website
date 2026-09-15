/* ============================================================================
   sumanth.design v3 — grid edition
   Lenis smooth scroll · GSAP reveals · cursor · hero lattice canvas · carousel
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = typeof gsap !== "undefined";
  if (hasGSAP && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  const SK = (window.SK = window.SK || {});
  SK.magnet = SK.magnet ?? 0.3;

  /* ===================================================== THEME TOGGLE */
  (function initTheme() {
    const btn = $("#themeBtn"), tip = $("#themeTip"), root = document.documentElement;
    const order = ["light", "dark"];
    const label = { light: "Light", dark: "Dark" };
    const get = () => { var t = root.getAttribute("data-theme") || "dark"; return t === "system" ? "dark" : t; };
    function setFavicons(theme) {
      var mode = theme === "light" ? "Light" : "Dark";
      var f16 = document.getElementById("favicon16");
      var f32 = document.getElementById("favicon32");
      var f48 = document.getElementById("favicon48");
      if (f16) f16.href = "Favicons/16x16 " + mode + ".svg";
      if (f32) f32.href = "Favicons/32x32 " + mode + ".svg";
      if (f48) f48.href = "Favicons/48x48 " + mode + ".svg";
    }
    if (tip) tip.textContent = label[get()];
    setFavicons(get());
    if (btn) btn.addEventListener("click", () => {
      const next = order[(order.indexOf(get()) + 1) % order.length];
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("sk-theme", next); } catch (e) {}
      if (tip) tip.textContent = label[next];
      setFavicons(next);
    });
  })();

  /* --------------------------------------------------------------- clock */
  const clock = $("#clock");
  function tick() {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZone: "America/New_York",
    }) + " ET";
  }
  tick(); setInterval(tick, 1000);

  /* ======================================================== LENIS SCROLL */
  let lenis = null;
  function initLenis() {
    if (typeof Lenis === "undefined" || reduce) return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.5 });
    lenis.on("scroll", () => { if (hasGSAP) ScrollTrigger.update(); });
    if (hasGSAP) { gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }

  /* ===================================================== CUSTOM CURSOR */
  const cur = $("#cursor"), ring = $("#cursorRing"), label = $("#cursorLabel"), arrow = $("#cursorArrow");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  if (fine && cur && ring) {
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    (function curLoop() {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      cur.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      if (arrow) arrow.style.transform = `translate(${mx}px,${my}px)`;
      if (label) { label.style.left = mx + "px"; label.style.top = my + "px"; }
      requestAnimationFrame(curLoop);
    })();
    const setC = (v) => document.body.setAttribute("data-cursor", v);
    const clr = () => document.body.removeAttribute("data-cursor");
    $$("a, button, [data-magnetic], .menu-link, .ink-link").forEach((el) => {
      if (el.hasAttribute("data-cursor-skip") || el.closest(".pcard")) return;
      el.addEventListener("mouseenter", () => setC("hover"));
      el.addEventListener("mouseleave", clr);
    });
    $$(".jcell").forEach((el) => {
      el.addEventListener("mouseenter", () => { setC("view"); if (label) label.textContent = "Read"; });
      el.addEventListener("mouseleave", clr);
    });
    /* inverted surfaces: the dot is page-ink, so it vanishes on them */
    $$(".btn-primary").forEach((el) => {
      el.addEventListener("mouseenter", () => setC("invert"));
      el.addEventListener("mouseleave", clr);
    });
  }

  /* ===================================================== MAGNETIC BTNS */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * SK.magnet}px, ${y * SK.magnet}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "translate(0,0)";
        setTimeout(() => (el.style.transition = ""), 600);
      });
    });
  }

  /* ================================================= MINI SCROLLBAR */
  const thumb = $("#scrollThumb"), pct = $("#scrollPct");
  function scrollMeter() {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? clamp(scrollY / h, 0, 1) : 0;
    if (thumb) thumb.style.transform = `translateY(${p * 233}%)`;
    if (pct) pct.textContent = String(Math.round(p * 100)).padStart(2, "0") + " — 100";
    document.body.classList.toggle("scrolled", scrollY > 20);
    if (window.__menuSpy) window.__menuSpy();
  }
  addEventListener("scroll", scrollMeter, { passive: true });

  /* ===================================================== MENU OVERLAY */
  const menuBtn = $("#menuBtn"), menu = $("#menu"), menuScrim = $("#menuScrim");
  let menuOpen = false;
  const setActiveLink = (spy) => $$("[data-spy]").forEach((l) =>
    l.classList.toggle("active", l.getAttribute("data-spy") === spy));
  function currentSpy() {
    const probe = innerHeight * 0.34;
    const ids = ["hero", "work", "writing", "profile", "craft", "contact"];
    let active = "hero";
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= probe) active = id;
    });
    return active;
  }
  window.__menuSpy = () => setActiveLink(currentSpy());
  function toggleMenu(force) {
    menuOpen = force !== undefined ? force : !menuOpen;
    document.body.classList.toggle("menu-open", menuOpen);
    if (menu) menu.setAttribute("aria-hidden", menuOpen ? "false" : "true");
    if (menuOpen) setActiveLink(currentSpy());
  }
  if (menuBtn) menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  document.addEventListener("click", (e) => {
    if (!menuOpen) return;
    if (menu && (menu.contains(e.target) || menuBtn.contains(e.target))) return;
    toggleMenu(false);
  });
  if (menuScrim) menuScrim.addEventListener("click", () => toggleMenu(false));
  $$("[data-nav]").forEach((a) => a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href && href.length > 1 && href.startsWith("#")) {
      e.preventDefault();
      const wasOpen = menuOpen;
      toggleMenu(false);
      const target = $(href);
      if (target) setTimeout(() => {
        /* land on the section's own heading, clear of the nav — not on the
           section box, whose top padding leaves the label far below the fold */
        const head = target.querySelector(".sec-head, .c-lead") || target;
        const navh = parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue("--navh")) || 72;
        const off = head === target ? 0 : -(navh + 26);
        if (lenis) lenis.scrollTo(head, { offset: off, duration: 1.4 });
        else window.scrollTo({ top: head.getBoundingClientRect().top + window.scrollY + off, behavior: "smooth" });
      }, wasOpen ? 0 : 120);
    } else { toggleMenu(false); }
  }));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });

  /* ==================================================== TOOL STRIP FLIP */
  function initToolFlip() {
    const cells = $$("#tstrip .tcell");
    if (!cells.length) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    let i = 0;
    setInterval(() => {
      const cell = cells[i % cells.length];
      cell.classList.toggle("flipped");
      i++;
    }, 1600);
    cells.forEach((cell) => {
      cell.addEventListener("mouseenter", () => cell.classList.toggle("flipped"));
    });
  }

  /* ================================================== VOICES CAROUSEL */
  function initVoices() {
    const slides = $$(".vslide");
    if (slides.length < 2) return;
    const prev = $("#vPrev"), next = $("#vNext"), count = $("#vCount");
    let i = 0;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === i;
        s.classList.toggle("on", on);
        if (!on) s.classList.remove("show");
      });
      void slides[i].offsetHeight; // flush, then transition in
      slides[i].classList.add("show");
      if (count) count.textContent = String(i + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
    }
    if (prev) prev.addEventListener("click", () => go(i - 1));
    if (next) next.addEventListener("click", () => go(i + 1));
    go(0);
  }

  /* ============================================= SCROLL REVEALS */
  const REVEAL_SEL = ".hero-facts .hf, .hero-spec .hs, .sec-head > *, .pcard, .ccell, .jcell," +
    " .tstrip .tcell, .syn .sc, .fgrid .fc, .chips > *, .reveal-line > span," +
    " .pc-body > *, .pc-meta .m, .pfacts .r, .pf-copy p, .fbase span, .c-actions a," +
    " .pc-ix, .pc-line, .pc-foot, .hero-top > div, .hero-mid > *, [data-reveal]";
  // never let content visibility depend on a tween finishing
  function unhideAll() {
    $$(REVEAL_SEL).forEach((el) => { el.style.opacity = ""; el.style.transform = ""; });
    $$(".hero-h1 .ln > span").forEach((el) => { el.style.transform = ""; el.style.opacity = ""; });
    $$(".pgrid .pf-shot .im").forEach((el) => {
      el.style.opacity = ""; el.style.clipPath = ""; el.style.webkitClipPath = ""; });
  }
  function revealSafetyNet() {
    let tries = 0;
    const check = () => {
      const dead = !hasGSAP || !gsap.ticker || gsap.ticker.time === 0;
      if (dead) { unhideAll(); if (++tries < 4) setTimeout(check, 1200); }
    };
    setTimeout(check, 1500);
  }

  function initReveals() {
    if (!hasGSAP || reduce) { unhideAll(); return; }
    $$(".reveal-line").forEach((line) => {
      gsap.fromTo(line.querySelector("span"), { yPercent: 105 },
        { yPercent: 0, ease: "power3.out", duration: 1,
          scrollTrigger: { trigger: line, start: "top 92%" } });
    });
    $$(".sec-head").forEach((h) => {
      gsap.from(h.children, { y: 30, opacity: 0, duration: .9, ease: "power3.out", stagger: .08,
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: h, start: "top 90%" } });
    });
    /* .hero-facts is above the fold — it plays in heroIntro, not on scroll */
    [".pcard", ".ccell", ".jcell", ".tstrip .tcell", ".syn .sc", ".fgrid .fc"]
      .forEach((sel) => {
        const els = $$(sel);
        if (!els.length) return;
        gsap.from(els, { y: 34, opacity: 0, duration: .8, ease: "power3.out", stagger: .05,
          clearProps: "opacity,transform",
          scrollTrigger: { trigger: els[0].parentElement, start: "top 88%" } });
      });
    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, { y: 30, opacity: 0, duration: .85, ease: "power3.out",
        clearProps: "opacity,transform", scrollTrigger: { trigger: el, start: "top 92%" } });
    });
    $$(".chips").forEach((row) => {
      gsap.from(row.children, { y: 22, opacity: 0, duration: .6, ease: "power3.out", stagger: .03,
        clearProps: "opacity,transform", scrollTrigger: { trigger: row, start: "top 90%" } });
    });
    /* project covers — label, headline and footer slide up inside the panel,
       then the headline drifts a few pixels against the scroll */
    $$(".pc-shot").forEach((shot) => {
      const parts = shot.querySelectorAll(".pc-ix,.pc-line,.pc-foot");
      if (parts.length) gsap.from(parts, { y: 28, opacity: 0, duration: .95, ease: "power3.out",
        stagger: .09, clearProps: "opacity,transform",
        scrollTrigger: { trigger: shot, start: "top 84%" } });
      const line = shot.querySelector(".pc-line");
      if (line) gsap.fromTo(line, { yPercent: 3 }, { yPercent: -3, ease: "none",
        scrollTrigger: { trigger: shot, start: "top bottom", end: "bottom top", scrub: .8 } });
    });
    /* card copy, record strips and closing lines all arrive the same way */
    [[".pc-body", "> *"], [".pc-meta", ".m"], [".pfacts", ".r"], [".pf-copy", "p"],
     [".fbase", "span"], [".c-actions", "a"]]
      .forEach(([host, child]) => {
        $$(host).forEach((h) => {
          const els = child === "> *" ? Array.from(h.children) : $$(child, h);
          if (!els.length) return;
          gsap.from(els, { y: 24, opacity: 0, duration: .8, ease: "power3.out", stagger: .07,
            clearProps: "opacity,transform",
            scrollTrigger: { trigger: h, start: "top 88%" } });
        });
      });
    $$(".pgrid .pf-shot .im").forEach((im) => {
      const clear = () => { im.style.opacity = ""; im.style.clipPath = ""; im.style.webkitClipPath = ""; };
      const st = ScrollTrigger.create({ trigger: im, start: "top 88%", once: true,
        onEnter: () => {
          gsap.fromTo(im, { clipPath: "inset(14% 0% 0% 0%)", opacity: 0 },
            { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, duration: 1.1, ease: "power3.out",
              onComplete: clear });
        } });
      // already scrolled past on load (restored position, deep link): show it outright
      if (st.progress > 0 || st.isActive) clear();
    });
    revealSafetyNet();
  }

  /* ====================================================== LOADER */
  function runLoader(done) {
    const loader = $("#loader"), count = $("#loaderCount"), bar = $("#loaderBar"), colWrap = $("#loaderCols");
    if (!loader) { document.body.classList.remove("is-loading"); done(); return; }
    const N = Math.max(14, Math.min(28, Math.round(innerWidth / 78)));
    if (colWrap && !colWrap.childElementCount)
      for (let i = 0; i < N; i++) colWrap.appendChild(document.createElement("i"));
    const cols = $$("#loaderCols i");
    if (reduce || !hasGSAP) {
      loader.style.display = "none";
      document.body.classList.remove("is-loading"); done(); return;
    }
    gsap.set(cols, { scaleY: 0.45, opacity: 0, transformOrigin: "50% 50%" });
    const tl = gsap.timeline(), counter = { v: 0 };
    tl.to(cols, { scaleY: 1, opacity: 1, duration: 1.2, ease: "power3.out",
      stagger: { each: 0.035, from: "center" } }, 0.1);
    tl.fromTo(colWrap, { scale: 1.08 }, { scale: 1, duration: 2.2, ease: "power1.out" }, 0.1);
    tl.to(bar, { scaleX: 1, duration: 1.9, ease: "power1.inOut" }, 0.25);
    tl.to(counter, { v: 100, duration: 1.9, ease: "power1.inOut",
      onUpdate: () => { if (count && count.firstChild) count.firstChild.textContent = Math.round(counter.v); } }, 0.25);
    tl.to(count, { yPercent: -120, opacity: 0, duration: 0.5, ease: "power2.in" }, "+=0.2");
    tl.to(cols, { yPercent: -60, opacity: 0, duration: 0.9, ease: "power3.inOut",
      stagger: { each: 0.03, from: "edges" } }, "-=0.2");
    tl.to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut",
      onStart: () => loader.classList.add("done") }, "-=0.5");
    tl.add(() => { document.body.classList.remove("is-loading"); done(); }, "-=0.5");
    tl.set(loader, { display: "none" });
  }

  /* ====================================================== HERO INTRO */
  function heroIntro() {
    if (!hasGSAP || reduce) {
      unhideAll();
      $$(".hero-top > div, .hero-mid > *").forEach((e) => (e.style.opacity = 1));
      return;
    }
    const tl = gsap.timeline();
    tl.fromTo(".hero-h1 .ln > span", { yPercent: 108 },
      { yPercent: 0, duration: 1.1, stagger: 0.09, ease: "power4.out" }, 0);
    tl.from(".hero-top > div", { y: 18, opacity: 0, duration: .7, stagger: .1, ease: "power3.out" }, 0.25);
    tl.from(".hero-mid > *", { y: 22, opacity: 0, duration: .8, stagger: .12, ease: "power3.out" }, 0.5);
    tl.from(".hero-spec .hs", { y: 20, opacity: 0, duration: .75, stagger: .09, ease: "power3.out",
      clearProps: "opacity,transform" }, 0.38);
    tl.from(".hero-facts .hf", { y: 26, opacity: 0, duration: .8, stagger: .07, ease: "power3.out",
      clearProps: "opacity,transform" }, 0.62);
  }

  function boot() {
    initLenis();
    initToolFlip();
    initVoices();
    initReveals();
    scrollMeter();
    if (hasGSAP) {
      ScrollTrigger.refresh();
    }
  }

  let booted = false;
  const finish = () => { if (booted) return; booted = true; boot(); heroIntro(); };
  const start = () => {
    runLoader(finish);
    // safety net: never trap the page behind the loader (throttled rAF, etc.)
    setTimeout(() => {
      if (booted) return;
      const l = $("#loader");
      if (l) { l.classList.add("done"); l.style.display = "none"; }
      document.body.classList.remove("is-loading");
      finish();
    }, 6000);
  };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(start);
  } else { addEventListener("load", start); }
})();
