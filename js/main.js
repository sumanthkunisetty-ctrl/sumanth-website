/* ============================================================================
   sumanth.design v2 — motion engine
   Lenis smooth scroll · GSAP reveals · custom cursor · magnetics · kinetic band
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

  /* live, tweakable feel-config (the Tweaks panel writes here) */
  const SK = (window.SK = window.SK || {});
  SK.bandSpeed = SK.bandSpeed ?? 0.6;   // kinetic band base velocity
  SK.magnet = SK.magnet ?? 0.38;        // magnetic-button pull
  SK.parallax = SK.parallax ?? 1;       // hero drift multiplier

  /* ---------------------------------------------------------------- split */
  // wrap each char of hero lines in .ch spans for stagger
  $$(".wm-line").forEach((line) => {
    const tail = line.querySelector(".tail");
    const tailHTML = tail ? tail.outerHTML : "";
    if (tail) tail.remove();
    const text = line.textContent;
    line.innerHTML = "";
    [...text].forEach((c) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      line.appendChild(s);
    });
    if (tailHTML) line.insertAdjacentHTML("beforeend", tailHTML);
  });
  // GSAP owns the initial offset (keeps unit consistent with heroIntro's yPercent)
  if (hasGSAP) gsap.set(".wm-line .ch", { yPercent: 110 });

  /* ===================================================== THEME TOGGLE */
  (function initTheme() {
    const btn = $("#themeBtn"), tip = $("#themeTip");
    const root = document.documentElement;
    const order = ["light", "dark"];
    const label = { light: "Light", dark: "Dark" };
    function get() { var t = root.getAttribute("data-theme") || "dark"; return t === "system" ? "dark" : t; }
    function set(t) {
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("sk-theme", t); } catch (e) {}
      if (tip) tip.textContent = label[t];
    }
    if (tip) tip.textContent = label[get()];
    if (btn) btn.addEventListener("click", () => {
      const next = order[(order.indexOf(get()) + 1) % order.length];
      set(next);
    });
  })();

  /* --------------------------------------------------------------- clock */
  const clock = $("#clock");
  function tick() {
    if (!clock) return;
    const t = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZone: "America/New_York",
    });
    clock.textContent = t + " ET";
  }
  tick(); setInterval(tick, 1000);

  /* ======================================================== LENIS SCROLL */
  let lenis = null;
  function initLenis() {
    if (typeof Lenis === "undefined" || reduce) return;
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.5 });
    lenis.on("scroll", () => { if (hasGSAP) ScrollTrigger.update(); });
    if (hasGSAP) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ===================================================== CUSTOM CURSOR */
  const cur = $("#cursor"), ring = $("#cursorRing"), label = $("#cursorLabel"), arrow = $("#cursorArrow");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, lx = mx, ly = my;
  if (fine) {
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    (function curLoop() {
      lx = lerp(lx, mx, 1); ly = lerp(ly, my, 1);
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      cur.style.transform = `translate(${lx}px,${ly}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      if (arrow) arrow.style.transform = `translate(${lx}px,${ly}px)`;
      label.style.left = mx + "px"; label.style.top = my + "px";
      requestAnimationFrame(curLoop);
    })();
    // hover affordances
    const setC = (v) => document.body.setAttribute("data-cursor", v);
    const clr = () => document.body.removeAttribute("data-cursor");
    $$("a, button, [data-magnetic], .jr-item, .jr-feature, .menu-link, .quote, .ink-link").forEach((el) => {
      if (el.hasAttribute("data-cursor-skip")) return;
      el.addEventListener("mouseenter", () => setC("hover"));
      el.addEventListener("mouseleave", clr);
    });
    // project rows → custom arrow cursor
    $$(".work-item").forEach((el) => {
      el.addEventListener("mouseenter", () => setC("arrow"));
      el.addEventListener("mouseleave", clr);
    });
    // journal rows → "Read" label cursor
    $$(".jr-item[data-nav]").forEach((el) => {
      el.addEventListener("mouseenter", () => { setC("view"); label.textContent = "Read"; });
      el.addEventListener("mouseleave", clr);
    });
  }

  /* ===================================================== MAGNETIC BTNS */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const strength = SK.magnet;
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "translate(0,0)";
        setTimeout(() => (el.style.transition = ""), 600);
      });
    });
  }

  /* ============================================ DARK-SECTION SCROLLBAR */
  // toggle .on-dark on body while a dark section overlaps the right rail
  const darkSections = $$(".work, .kinetic, .contact");
  function darkWatch() {
    const probe = innerHeight * 0.5;
    const navProbe = 36; // near the nav's vertical centre
    let dark = false, navDark = false;
    darkSections.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) dark = true;
      if (r.top <= navProbe && r.bottom >= navProbe) navDark = true;
    });
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    const themeDark = t === "dark";
    document.body.classList.toggle("on-dark", dark && themeDark);
    document.body.classList.toggle("nav-on-dark", navDark && themeDark);
  }

  /* ================================================= MINI SCROLLBAR */
  const thumb = $("#scrollThumb"), pct = $("#scrollPct");
  function scrollMeter() {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? clamp(scrollY / h, 0, 1) : 0;
    if (thumb) thumb.style.transform = `translateY(${p * 233}%)`; // 100/30 - ~ travel within track
    if (pct) pct.textContent = String(Math.round(p * 100)).padStart(2, "0") + " — 100";
    document.body.classList.toggle("scrolled", scrollY > 20);
    darkWatch();
    if (document.body.classList.contains("menu-open") && window.__menuSpy) window.__menuSpy();
  }
  addEventListener("scroll", scrollMeter, { passive: true });

  /* ===================================================== MENU OVERLAY */
  const menuBtn = $("#menuBtn"), menu = $("#menu"), menuScrim = $("#menuScrim");
  let menuOpen = false;
  function setActiveLink(spy) {
    $$(".menu-link[data-spy]").forEach((l) =>
      l.classList.toggle("active", l.getAttribute("data-spy") === spy));
  }
  function currentSpy() {
    // which section is under the upper third of the viewport
    const probe = innerHeight * 0.34;
    const ids = ["hero", "work", "writing", "about", "toolbox", "contact"];
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
    menu.setAttribute("aria-hidden", menuOpen ? "false" : "true");
    if (menuOpen) setActiveLink(currentSpy());
    // NOTE: scroll stays unlocked — the menu floats while the page scrolls
  }
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  // outside-click closes (document-level so it never blocks scroll/interaction)
  document.addEventListener("click", (e) => {
    if (!menuOpen) return;
    if (menu.contains(e.target) || menuBtn.contains(e.target)) return;
    toggleMenu(false);
  });
  if (menuScrim) menuScrim.addEventListener("click", () => toggleMenu(false));
  $$("[data-nav]").forEach((a) => a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href && href.startsWith("#")) {
      e.preventDefault();
      const wasOpen = menuOpen;
      toggleMenu(false);
      const target = $(href);
      if (target) setTimeout(() => {
        if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
        else target.scrollIntoView();
      }, wasOpen ? 0 : 120);
    } else { toggleMenu(false); }
  }));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });

  /* ============================================= WORK HOVER PREVIEW */
  if (fine) {
    const pv = $("#wiPreview"), panels = $$(".pv", pv);
    const list = $("#workList"), items = $$(".work-item");
    items.forEach((item) => {
      const idx = item.getAttribute("data-preview");
      item.addEventListener("mouseenter", () => {
        // pin the preview to THIS row (vertical centre), not the cursor
        const top = item.offsetTop + item.offsetHeight / 2;
        pv.style.top = top + "px";
        panels.forEach((p) => p.classList.toggle("active", p.getAttribute("data-pv") === idx));
        // dim siblings, spotlight this one
        list.classList.add("row-active");
        items.forEach((i) => i.classList.toggle("is-active", i === item));
      });
    });
    list.addEventListener("mouseleave", () => {
      list.classList.remove("row-active");
      items.forEach((i) => i.classList.remove("is-active"));
    });
  }

  /* ============================================= KINETIC VELOCITY BAND */
  const kTrack = $("#kineticTrack");
  let kx = 0, baseV = 0.6, velBoost = 0, lastScroll = scrollY;
  function kineticLoop() {
    const dv = Math.abs(scrollY - lastScroll);
    lastScroll = scrollY;
    velBoost = lerp(velBoost, dv * 0.35, 0.1);
    kx -= SK.bandSpeed + velBoost;
    const half = kTrack.scrollWidth / 2;
    if (half && kx <= -half) kx += half;
    kTrack.style.transform = `translateX(${kx}px)`;
    requestAnimationFrame(kineticLoop);
  }

  /* ============================================= HERO scroll */
  function initHeroReact() {
    if (hasGSAP) {
      // scroll: lines drift opposite directions + fade hero
      gsap.to(".wm-line[data-line='0']", { xPercent: -8, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".wm-line[data-line='1']", { xPercent: 10, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero-foot, .hero-meta", { opacity: 0, y: -30, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "30% top", end: "bottom top", scrub: true } });
    }
  }

  /* ============================================= SCROLL REVEALS */
  function initReveals() {
    if (!hasGSAP) { $$(".reveal-line > span, [data-reveal]").forEach((e) => (e.style.transform = "none", e.style.opacity = 1)); return; }
    // manifesto + contact: line masks (GSAP owns the % so unit matches)
    $$(".reveal-line").forEach((line) => {
      gsap.fromTo(line.querySelector("span"),
        { yPercent: 105 },
        { yPercent: 0, ease: "power3.out", duration: 1.0,
          scrollTrigger: { trigger: line, start: "top 92%" } });
    });
    // section heads
    $$(".section-head h2").forEach((h) => {
      gsap.from(h, { y: 40, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: h, start: "top 90%" } });
    });
    // work items
    $$(".work-item").forEach((it, i) => {
      gsap.from(it, { y: 50, opacity: 0, duration: 0.9, ease: "power3.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: it, start: "top 92%" } });
    });
    // posts
    $$(".jr-item, .jr-feature").forEach((p) => {
      gsap.from(p, { y: 40, opacity: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: p, start: "top 92%" } });
    });
    // quotes / stats
    $$("[data-reveal], .sig .stat, .a-row, .cf-col, .about .a-lead").forEach((el) => {
      gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%" } });
    });
    // toolbox: skills chips + tool cards stagger in
    $$(".tb-block").forEach((block) => {
      gsap.from(block.querySelectorAll(".skill, .tool"), { y: 30, opacity: 0, duration: 0.7,
        ease: "power3.out", stagger: 0.04,
        scrollTrigger: { trigger: block, start: "top 84%" } });
      gsap.from(block.querySelector(".tb-label"), { y: 24, opacity: 0, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: block, start: "top 88%" } });
    });
    // work + contact rounded reveal
    gsap.utils.toArray(".work, .contact").forEach((s) => {
      gsap.fromTo(s, { borderRadius: "120px 120px 0 0" }, { borderRadius: "32px 32px 0 0",
        ease: "power2.out", scrollTrigger: { trigger: s, start: "top 95%", end: "top 60%", scrub: true } });
    });
  }

  /* ====================================================== LOADER */
  function runLoader(done) {
    const loader = $("#loader"), count = $("#loaderCount"), bar = $("#loaderBar");
    const colWrap = $("#loaderCols");
    // build the fluted column field (count scales with viewport width)
    const N = Math.max(14, Math.min(28, Math.round(innerWidth / 78)));
    if (colWrap && !colWrap.childElementCount) {
      for (let i = 0; i < N; i++) colWrap.appendChild(document.createElement("i"));
    }
    const cols = $$("#loaderCols i");

    if (reduce || !hasGSAP) {
      loader.style.display = "none";
      document.body.classList.remove("is-loading");
      done(); return;
    }
    gsap.set(cols, { scaleY: 0.45, opacity: 0, transformOrigin: "50% 50%" });
    const tl = gsap.timeline();
    const counter = { v: 0 };
    // columns grow open from the centre + fade in (soft ends → no hard edges)
    tl.to(cols, { scaleY: 1, opacity: 1, duration: 1.35, ease: "power3.out",
      stagger: { each: 0.04, from: "center" } }, 0.1);
    // the whole field gently breathes (depth parallax) while the count runs
    tl.fromTo(colWrap, { scale: 1.08 }, { scale: 1, duration: 2.6, ease: "power1.out" }, 0.1);
    // counter + progress bar
    tl.to(bar, { scaleX: 1, duration: 2.3, ease: "power1.inOut" }, 0.25);
    tl.to(counter, { v: 100, duration: 2.3, ease: "power1.inOut",
      onUpdate: () => { count.firstChild.textContent = Math.round(counter.v); } }, 0.25);
    // counter slips up shortly after hitting 100
    tl.to(count, { yPercent: -120, opacity: 0, duration: 0.6, ease: "power2.in" }, "+=0.3");
    // columns drift upward + fade out, staggered from the edges → parallax wipe
    tl.to(cols, { yPercent: -60, opacity: 0, duration: 1.0, ease: "power3.inOut",
      stagger: { each: 0.035, from: "edges" } }, "-=0.2");
    // loader lifts the rest of the way, revealing the hero
    tl.to(loader, { yPercent: -100, duration: 1.0, ease: "expo.inOut",
      onStart: () => loader.classList.add("done") }, "-=0.5");
    tl.add(() => { document.body.classList.remove("is-loading"); done(); }, "-=0.55");
    tl.set(loader, { display: "none" });
  }

  /* ====================================================== HERO INTRO */
  function heroIntro() {
    if (reduce || !hasGSAP) {
      $$(".wm-line .ch").forEach((c) => (c.style.transform = "none"));
      $$(".hero-tag, .hero-meta, .hero-contact").forEach((e) => (e.style.opacity = 1));
      return;
    }
    const tl = gsap.timeline();
    tl.to(".wm-line .ch", { yPercent: 0, duration: 1.1, stagger: 0.03, ease: "power4.out" }, 0);
    tl.from(".hero-meta > div", { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 0.4);
    tl.from(".hero-foot > *", { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" }, 0.6);
  }

  function boot() {
    initLenis();
    initHeroReact();
    initReveals();
    kineticLoop();
    scrollMeter();
    if (hasGSAP) ScrollTrigger.refresh();
  }

  // wait for fonts then run loader
  const start = () => runLoader(() => { boot(); heroIntro(); });
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(start);
  } else { addEventListener("load", start); }
})();
