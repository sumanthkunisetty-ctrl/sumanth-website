/* ============================================================================
   article.js — behaviors for the Perspective template
   Theme · clock · menu · Lenis · cursor · magnetic · reveals · reading bar
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
  if (reduce) document.documentElement.classList.add("no-motion");

  /* ---------------------------------------------------------- THEME */
  (function initTheme() {
    const btn = $("#themeBtn"), tip = $("#themeTip");
    const root = document.documentElement;
    const order = ["light", "dark"];
    const label = { light: "Light", dark: "Dark" };
    const get = () => { var t = root.getAttribute("data-theme") || "dark"; return t === "system" ? "dark" : t; };
    const set = (t) => { root.setAttribute("data-theme", t);
      try { localStorage.setItem("sk-theme", t); } catch (e) {}
      if (tip) tip.textContent = label[t]; };
    if (tip) tip.textContent = label[get()];
    if (btn) btn.addEventListener("click", () => set(order[(order.indexOf(get()) + 1) % order.length]));
  })();

  /* ---------------------------------------------------------- CLOCK */
  const clock = $("#clock");
  (function tick() {
    if (clock) clock.textContent = new Date().toLocaleTimeString("en-US",
      { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/New_York" }) + " ET";
    setTimeout(tick, 1000);
  })();

  /* ---------------------------------------------------------- LENIS */
  let lenis = null;
  if (typeof Lenis !== "undefined" && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.5 });
    lenis.on("scroll", () => { if (hasGSAP) ScrollTrigger.update(); });
    if (hasGSAP) { gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }

  /* ---------------------------------------------------------- CURSOR */
  const cur = $("#cursor"), ring = $("#cursorRing"), label = $("#cursorLabel"), arrow = $("#cursorArrow");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, lx = mx, ly = my;
  if (fine && cur) {
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    (function loop() {
      lx = mx; ly = my; rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      cur.style.transform = `translate(${lx}px,${ly}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      if (arrow) arrow.style.transform = `translate(${lx}px,${ly}px)`;
      if (label) { label.style.left = mx + "px"; label.style.top = my + "px"; }
      requestAnimationFrame(loop);
    })();
    const setC = (v) => document.body.setAttribute("data-cursor", v);
    const clr = () => document.body.removeAttribute("data-cursor");
    $$("a, button, [data-magnetic], .menu-link, .art-nextcard, .sh-btn").forEach((el) => {
      if (el.hasAttribute("data-cursor-skip")) return;
      el.addEventListener("mouseenter", () => setC("hover"));
      el.addEventListener("mouseleave", clr);
    });
  }

  /* ---------------------------------------------------------- MAGNETIC */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.34}px, ${(e.clientY - (r.top + r.height / 2)) * 0.34}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "translate(0,0)";
        setTimeout(() => (el.style.transition = ""), 600);
      });
    });
  }

  /* ---------------------------------------------------------- MENU */
  const menuBtn = $("#menuBtn"), menu = $("#menu"), menuScrim = $("#menuScrim");
  let menuOpen = false;
  function toggleMenu(force) {
    menuOpen = force !== undefined ? force : !menuOpen;
    document.body.classList.toggle("menu-open", menuOpen);
    if (menu) menu.setAttribute("aria-hidden", menuOpen ? "false" : "true");
  }
  if (menuBtn) menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  document.addEventListener("click", (e) => {
    if (!menuOpen) return;
    if (menu && menu.contains(e.target)) return;
    if (menuBtn && menuBtn.contains(e.target)) return;
    toggleMenu(false);
  });
  if (menuScrim) menuScrim.addEventListener("click", () => toggleMenu(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });

  /* ------------------------------------------ SCROLLBAR + READ PROGRESS */
  const thumb = $("#scrollThumb"), pct = $("#scrollPct"), bar = $("#readBar");
  const article = $(".art-body");
  const darkSections = $$(".contact, .art-takeaways");
  function meter() {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? clamp(scrollY / h, 0, 1) : 0;
    if (thumb) thumb.style.transform = `translateY(${p * 233}%)`;
    if (pct) pct.textContent = String(Math.round(p * 100)).padStart(2, "0") + " — 100";
    document.body.classList.toggle("scrolled", scrollY > 20);
    // reading progress measured against the article body
    if (bar && article) {
      const r = article.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const done = clamp((innerHeight * 0.4 - r.top) / Math.max(total, 1), 0, 1);
      bar.style.width = (done * 100) + "%";
    }
    // nav tint over dark blocks
    let navDark = false;
    darkSections.forEach((s) => { const b = s.getBoundingClientRect(); if (b.top <= 36 && b.bottom >= 36) navDark = true; });
    const t = document.documentElement.getAttribute("data-theme");
    const themeDark = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme:dark)").matches);
    document.body.classList.toggle("nav-on-dark", navDark && themeDark);
  }
  addEventListener("scroll", meter, { passive: true });
  meter();

  /* ---------------------------------------------------------- REVEALS */
  if (hasGSAP && !reduce) {
    // H1 line masks — GSAP owns the hidden state (no CSS transform to mis-parse)
    $$(".art-h1 .reveal-line").forEach((line, i) => {
      const span = line.querySelector("span");
      gsap.set(span, { yPercent: 105 });
      gsap.to(span, { yPercent: 0, ease: "power3.out", duration: 1.05, delay: 0.15 + i * 0.09 });
    });
    // dek + byline + cover quick intro (only the blocks this page actually has)
    const intro = [".art-dek", ".t-dek", ".art-byline", ".t-meta", ".art-cover"]
      .filter((s) => document.querySelector(s));
    if (intro.length) {
      gsap.from(intro, { y: 26, opacity: 0, duration: 0.9,
        ease: "power3.out", stagger: 0.12, delay: 0.5 });
    }
    // body blocks fade-up on scroll
    $$("[data-r]").forEach((el) => {
      gsap.to(el, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%" } });
    });
  } else {
    $$(".art-h1 .reveal-line > span").forEach((s) => (s.style.transform = "none"));
    document.documentElement.classList.add("no-motion");
  }
})();
