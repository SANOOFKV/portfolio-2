/* ===========================================================
   Sanoof Padikkal — portfolio
   Scroll-driven animation: GSAP + ScrollTrigger, Lenis smooth scroll.
   Degrades to fully-visible static content when GSAP is unavailable
   or the visitor prefers reduced motion.
   =========================================================== */
(function () {
  'use strict';

  /* ---------- text splitting helpers ---------- */
  function splitChars(el) {
    const text = el.getAttribute('data-chars');
    if (text == null) return [];
    el.textContent = '';
    const chars = [];
    // Per-character spans are announced letter-by-letter by many screen
    // readers ("S… A… N…"), so expose the whole string once via aria-label
    // and hide the individual characters.
    el.setAttribute('aria-label', text);
    const mk = c => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      s.style.whiteSpace = 'pre';
      s.setAttribute('aria-hidden', 'true');
      chars.push(s);
      return s;
    };
    // Group each word in a nowrap wrapper. Without this, every character is its
    // own inline-block and the line can break mid-word ("EX / ECUTIVE").
    text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        for (const c of part) el.appendChild(mk(c));
      } else {
        const word = document.createElement('span');
        word.className = 'ch-word';
        for (const c of part) word.appendChild(mk(c));
        el.appendChild(word);
      }
    });
    return chars;
  }
  function splitWords(el) {
    const text = el.getAttribute('data-words');
    if (text == null) return [];
    el.textContent = '';
    const spans = [];
    // Same reasoning as splitChars: announce the sentence once, hide the
    // per-word masks so the reveal markup isn't read as fragments.
    el.setAttribute('aria-label', text);
    text.split(' ').forEach((word, i, arr) => {
      const mask = document.createElement('span');
      mask.className = 'w';
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      // Space as a separate text node OUTSIDE the overflow-hidden mask so it
      // isn't trimmed. In flex containers whitespace-only nodes are ignored.
      if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
      spans.push(inner);
    });
    return spans;
  }

  // Build all split text up front so layout is correct.
  document.querySelectorAll('[data-chars]').forEach(splitChars);
  document.querySelectorAll('[data-words]').forEach(splitWords);

  const hasGSAP = typeof window.gsap !== 'undefined';
  // Honoured everywhere: scroll animations, smooth scroll, and the ambient
  // canvas fields (which are motion too, and the easiest thing to forget).
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Runs a canvas draw loop only while the relevant section is on screen.
     Four canvases looping permanently is real battery drain on mobile, and
     most of them sit behind other sections for the bulk of the page.
     `proxies` exists because the portrait canvas lives in a position:fixed
     stage that always intersects the viewport — it has to be gated on the
     sections it is actually visible behind. */
  function animate(draw, proxies) {
    draw();                    // paint one frame so it is never blank
    if (REDUCED) return;       // reduced motion: that single frame is all
    let id = null;
    const tick = () => { draw(); id = requestAnimationFrame(tick); };
    const start = () => { if (id === null) id = requestAnimationFrame(tick); };
    const stop = () => { if (id !== null) { cancelAnimationFrame(id); id = null; } };
    const els = (proxies || []).filter(Boolean);
    if (!els.length || !('IntersectionObserver' in window)) { start(); return; }
    const visible = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
      visible.size ? start() : stop();
    }, { rootMargin: '10% 0px' });
    els.forEach(el => io.observe(el));
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : (visible.size && start()));
  }

  /* ---------- custom cursor ---------- */
  const cursor = document.getElementById('cursor');
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a, .menu-bar, .ico, .email-hover').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('big'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
  });

  /* ---------- canvas: dot field (portrait stage) ---------- */
  function dotField(canvas, proxies) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dots = [];
    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      const gap = 34 * devicePixelRatio;
      dots = [];
      for (let x = gap; x < w; x += gap)
        for (let y = gap; y < h; y += gap)
          dots.push({ x, y, ph: Math.random() * Math.PI * 2 });
    }
    resize();
    window.addEventListener('resize', resize);
    let t = 0;
    animate(() => {
      ctx.clearRect(0, 0, w, h);
      t += 0.02;
      ctx.fillStyle = 'rgba(36,36,36,0.28)';
      for (const d of dots) {
        const r = (1.2 + Math.sin(t + d.ph) * 1) * devicePixelRatio;
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.3, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }, proxies);
  }
  // The portrait stage is position:fixed, so gate it on the sections it shows behind.
  dotField(document.getElementById('dotField'),
    [document.querySelector('.hero'), document.querySelector('.roles')]);

  /* ---------- canvas: particle field (dark + footer bg) ---------- */
  function particleField(canvas, color) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, parts = [];
    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      const count = Math.min(120, Math.floor((w * h) / (30000 * devicePixelRatio)));
      parts = [];
      for (let i = 0; i < count; i++)
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3 * devicePixelRatio,
          vy: (Math.random() - 0.5) * 0.3 * devicePixelRatio,
          r: (Math.random() * 1.6 + 0.4) * devicePixelRatio
        });
    }
    resize();
    window.addEventListener('resize', resize);
    animate(() => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      ctx.strokeStyle = color.line;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y;
          const dist = Math.hypot(dx, dy);
          const max = 130 * devicePixelRatio;
          if (dist < max) {
            ctx.globalAlpha = (1 - dist / max) * 0.4;
            ctx.beginPath();
            ctx.moveTo(parts[i].x, parts[i].y);
            ctx.lineTo(parts[j].x, parts[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = color.dot;
      for (const p of parts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }, [canvas]);
  }
  particleField(document.getElementById('darkField'), { dot: 'rgba(255,232,98,0.9)', line: 'rgba(255,232,98,1)' });
  particleField(document.getElementById('footerBg'), { dot: 'rgba(36,36,36,0.5)', line: 'rgba(36,36,36,1)' });

  /* ---------- canvas: footer morphing blob ---------- */
  function blob(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    }
    resize();
    window.addEventListener('resize', resize);
    let t = 0;
    animate(() => {
      ctx.clearRect(0, 0, w, h);
      t += 0.012;
      const cxp = w / 2, cyp = h / 2;
      const base = Math.min(w, h) * 0.32;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
        const r = base * (1 + 0.18 * Math.sin(a * 3 + t) + 0.12 * Math.sin(a * 5 - t * 1.3));
        const x = cxp + Math.cos(a) * r;
        const y = cyp + Math.sin(a) * r;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#242424');
      g.addColorStop(1, '#4a4a4a');
      ctx.fillStyle = g;
      ctx.fill();
    }, [canvas]);
  }
  blob(document.getElementById('footerBlob'));

  /* ===========================================================
     Put every animated element in its final, visible state. Used both when
     GSAP is unavailable and when the visitor asked for reduced motion —
     in either case the content must be fully readable without animation.
     =========================================================== */
  function revealAll() {
    document.querySelectorAll(
      '.ch,.w span,.tag,.pill-available,.works-head p,.footer-credit p,.menu,.hero-meta span,.bar,.h,.guide.anim,.stamp,.ledger-line,.ledger-date-in,.ledger-company,.ledger-logo,.ledger-points li,.worked-label,.worked-mark,.worked-dot'
    ).forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    document.getElementById('portraitStage').style.transform = 'translateY(0)';
    document.getElementById('scribble').style.clipPath = 'inset(0 0 0 0)';
    document.getElementById('menu').style.transform = 'translateX(-50%)';
    document.querySelectorAll('.mobile-cream').forEach(el => { el.style.opacity = 0; });
    const wipe = document.getElementById('designWipe');
    if (wipe) wipe.style.transform = 'translateY(-100%)';
    const pt = document.querySelector('.pill-available .type');
    if (pt) pt.textContent = 'Turning ad spend into enrollments.';
  }

  if (!hasGSAP || REDUCED) {
    revealAll();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll (Lenis) ---------- */
  // Lenis animates its own scroll position, so ScrollTrigger must read from
  // Lenis's frame rather than native scroll events, or scrubbed timelines
  // lag a frame behind and visibly jitter. Driving lenis.raf from gsap.ticker
  // keeps both on one clock; lagSmoothing(0) stops GSAP from swallowing
  // frames during heavy canvas work and desyncing the two.
  // REDUCED already returned early above, so only the availability check remains.
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis; // handy for debugging / programmatic scrolling
  }

  // Anchor navigation has to go through Lenis, otherwise a native jump
  // desyncs it from the position it thinks it's at.
  function scrollToTarget(hash) {
    if (hash === '#' || hash === '') {
      lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.querySelector(hash);
    if (!el) return;
    lenis ? lenis.scrollTo(el) : el.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- intro timeline ---------- */
  gsap.set('.hero-name .ch', { yPercent: 120, opacity: 0 });
  const introTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  introTl
    .to('.guide.anim', { scaleY: 1, duration: 1.1, stagger: 0.1 }, 0)
    .to('.hero-name .ch', { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.045, ease: 'power4.out' }, 0.2)
    .to('.hero-lines .bar', { scaleX: 1, duration: 1.1 }, 0.5)
    .to('.hero-meta span', { y: 0, duration: 0.8 }, 0.7)
    .to('.pill-available', { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)' }, 0.9)
    // Type the pill copy in behind the blinking caret; the pill grows around it.
    .call(typePill, null, 1.5);

  function typePill() {
    const el = document.querySelector('.pill-available .type');
    if (!el) return;
    const copy = 'Turning ad spend into enrollments.';
    let i = 0;
    const id = setInterval(() => {
      el.textContent = copy.slice(0, ++i);
      if (i >= copy.length) clearInterval(id);
    }, 55);
  }

  /* ---------- portrait reveal (scroll-driven) ---------- */
  gsap.to('#portraitStage', {
    y: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('#scribble', {
    clipPath: 'inset(0 0% 0 0)', ease: 'none',
    scrollTrigger: { trigger: '.roles', start: 'top bottom', end: 'top center', scrub: true }
  });
  // Mobile-only cream veil lifts as the portrait rises.
  gsap.to('.mobile-cream', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------- column curtain wipes ---------- */
  // Cream columns retract upward in sequence, revealing the yellow stage behind.
  gsap.to('.strip .col', {
    scaleY: 0, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.strip', start: 'top 95%', end: 'bottom 45%', scrub: true }
  });
  gsap.to('.footer .fcols .col', {
    scaleY: 0, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.footer', start: 'top 95%', end: 'top 25%', scrub: true }
  });

  /* ---------- role pills ---------- */
  gsap.to('.roles .tag', {
    opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
    scrollTrigger: { trigger: '.roles', start: 'top 60%' }
  });

  /* ---------- dark section quote ---------- */
  gsap.to('.dark-quote .w span', {
    y: 0, duration: 1, stagger: 0.08, ease: 'power4.out',
    scrollTrigger: { trigger: '.dark-sec', start: 'top 30%' }
  });

  /* ---------- designing experiences (scrubbed timeline) ---------- */
  const designTl = gsap.timeline({
    scrollTrigger: { trigger: '.design-sec', start: 'top top', end: 'bottom bottom', scrub: 0.6 }
  });
  designTl
    .to('.design-lead .w span', { y: 0, opacity: 1, duration: 1, stagger: 0.06 })
    .to('.design-big .ch', { y: 0, opacity: 1, duration: 1, stagger: 0.02 }, '-=0.4')
    .fromTo('#designWipe', { yPercent: 0, y: 0 }, { yPercent: -100, y: 0, duration: 1.2, ease: 'power2.inOut' }, '<0.2')
    .fromTo('.design-frame .shot', { scale: 1.15 }, { scale: 1, duration: 1.4, ease: 'power2.out' }, '<')
    .to({}, { duration: 1 });

  /* ---------- design frame custom hover cursor ---------- */
  const frame = document.getElementById('designFrame');
  const dCursor = document.getElementById('designCursor');
  if (frame && dCursor) {
    frame.addEventListener('mouseenter', () => { cursor.style.opacity = 0; gsap.to(dCursor, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }); });
    frame.addEventListener('mouseleave', () => { cursor.style.opacity = 1; gsap.to(dCursor, { opacity: 0, scale: 0, duration: 0.3 }); });
    frame.addEventListener('mousemove', e => {
      const r = frame.getBoundingClientRect();
      dCursor.style.left = (e.clientX - r.left) + 'px';
      dCursor.style.top = (e.clientY - r.top) + 'px';
    });
  }

  /* ---------- section headings (Skills, Experience) ---------- */
  // Two .works-head blocks now, so trigger each on its own scroll position.
  document.querySelectorAll('.works-head').forEach(head => {
    gsap.to(head.querySelectorAll('h2 .ch'), {
      y: 0, duration: 1, stagger: 0.03, ease: 'power4.out',
      scrollTrigger: { trigger: head, start: 'top 78%' }
    });
    const p = head.querySelector('p');
    if (p) gsap.to(p, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: head, start: 'top 62%' }
    });
  });

  /* ---------- dark section "worked at" strip ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.dark-sec', start: 'top 20%' } })
    .to('.worked-label', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.3)
    .to('.worked-mark, .worked-dot', { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, 0.4);

  /* ---------- skills & tools: stamp-in ---------- */
  document.querySelectorAll('.taggroup').forEach(group => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: group, start: 'top 80%' } });
    tl.to(group.querySelectorAll('.taggroup-label .ch'), { y: 0, duration: 0.7, stagger: 0.03, ease: 'power4.out' })
      .to(group.querySelectorAll('.stamp'), {
        opacity: 1, scale: 1, rotate: 0, duration: 0.5,
        stagger: 0.035, ease: 'back.out(1.7)'
      }, '-=0.3');
  });

  /* ---------- experience ledger ---------- */
  document.querySelectorAll('.ledger-row').forEach(row => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 80%' } });
    tl.to(row.querySelector('.ledger-line'), { scaleY: 1, duration: 0.8, ease: 'power3.inOut' })
      .to(row.querySelector('.ledger-date-in'), { y: 0, duration: 0.7, ease: 'power4.out' }, '-=0.5')
      .to(row.querySelectorAll('.ledger-role .ch'), { y: 0, duration: 0.7, stagger: 0.02, ease: 'power4.out' }, '-=0.5')
      .to(row.querySelectorAll('.ledger-company, .ledger-logo'), { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4')
      .to(row.querySelectorAll('.ledger-points li'), { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, '-=0.3');
  });

  /* ---------- footer reveals ---------- */
  gsap.to('.footer-divider .h', {
    scaleX: 1, duration: 1.1, ease: 'power3.inOut',
    scrollTrigger: { trigger: '.footer-cta', start: 'top 85%' }
  });
  const footTl = gsap.timeline({ scrollTrigger: { trigger: '.footer-cta', start: 'top 75%' } });
  footTl
    .to('.footer-cta .lead .ch', { y: 0, duration: 0.9, stagger: 0.02, ease: 'power4.out' })
    .to('.footer-cta .big .ch', { y: 0, duration: 0.9, stagger: 0.02, ease: 'power4.out' }, '-=0.6')
    .to('.reach-label .ch', { y: 0, duration: 0.8, stagger: 0.03, ease: 'power4.out' }, '-=0.7')
    .to('.footer-credit p', { opacity: 0.6, y: 0, duration: 0.8, stagger: 0.1 }, '-=0.3');

  /* ---------- floating menu ---------- */
  // xPercent (not x:'-50%'): GSAP parses the CSS translateX(-50%) into `x` as
  // pixels, so passing x:'-50%' stacks a second offset and pushes the menu a
  // full width off-centre. xPercent owns the centring, x:0 clears the px channel.
  gsap.set('#menu', { xPercent: -50, x: 0 });
  gsap.to('#menu', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 1.4 });
  const menu = document.getElementById('menu');
  document.getElementById('menuBar').addEventListener('click', () => menu.classList.toggle('open'));
  document.querySelectorAll('.menu-links a').forEach(a =>
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href') || '';
      if (hash.startsWith('#')) {
        e.preventDefault();
        scrollToTarget(hash);
      }
      menu.classList.remove('open');
    })
  );

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
