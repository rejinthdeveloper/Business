/**
 * Rejinth R — Portfolio
 *
 * Progressive enhancements only. The page is readable and navigable without
 * this file; it adds:
 *   1. Current copyright year
 *   2. Mobile navigation toggle
 *   3. Current-section highlight in the navigation
 *   4. Dot-matrix word animation in the hero
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 1. Copyright year ----------------------------------------------------- */

  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = year;
  });

  /* 2. Mobile navigation -------------------------------------------------- */

  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('primary-nav');
  // Keep in sync with the 760px navigation breakpoint in style.css.
  const desktop = window.matchMedia('(min-width: 760px)');

  if (header && toggle && nav) {
    const label = toggle.querySelector('[data-nav-label]');
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a') && !desktop.matches) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });

    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* 3. Current-section highlight ----------------------------------------- */

  const navLinks = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));

  if ('IntersectionObserver' in window && navLinks.length) {
    const linkFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const setCurrent = (id) => {
      navLinks.forEach((a) => {
        if (linkFor.get(id) === a) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };

    // A thin band across the middle of the viewport decides the current section.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section));
  }

  /* 4. Dot-matrix word animation ----------------------------------------- */

  const canvas = document.querySelector('[data-dot-words]');
  if (canvas && canvas.getContext) initDotWords(canvas);

  /**
   * Draws each word as a grid of dots. Dots fly in to form a word, hold, then
   * scatter and regroup into the next one. The pointer gently pushes dots away.
   * With reduced motion the first word is drawn once, without movement.
   */
  function initDotWords(canvas) {
    const ctx = canvas.getContext('2d');
    const words = (canvas.dataset.dotWords || '').split('|').map((w) => w.trim()).filter(Boolean);
    if (!ctx || !words.length) return;

    const CYCLE_MS = 4200;        // time each word stays before the next one forms
    const SPRING = 0.045;         // pull toward the target position
    const FRICTION = 0.82;        // velocity kept per frame
    const REPEL_RADIUS = 56;
    const COLOR_STEPS = 10;
    const TAU = Math.PI * 2;

    const palette = buildPalette();
    const pointer = { x: -1e4, y: -1e4 };
    let particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let fontSize = 0;
    let step = 4;
    let radius = 1.5;
    let wordIndex = 0;
    let colorPhase = Math.random() * TAU;
    let visible = true;
    let rafId = 0;
    let timer = 0;

    function buildPalette() {
      const style = getComputedStyle(canvas);
      const from = parseHex(style.getPropertyValue('--dot-from'), [226, 109, 136]);
      const to = parseHex(style.getPropertyValue('--dot-to'), [31, 122, 140]);
      return Array.from({ length: COLOR_STEPS }, (_, i) => {
        const t = i / (COLOR_STEPS - 1);
        const [r, g, b] = from.map((v, k) => Math.round(v + (to[k] - v) * t));
        return `rgb(${r}, ${g}, ${b})`;
      });
    }

    function parseHex(value, fallback) {
      const hex = value.trim().replace('#', '');
      if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
      return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    }

    const fontFor = (size) => `800 ${size}px Manrope, system-ui, sans-serif`;

    function measure() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));

      // One size for every word, fitted to the longest, so the scale stays steady between words.
      const probe = document.createElement('canvas').getContext('2d');
      fontSize = height * 0.8;
      probe.font = fontFor(fontSize);
      const widest = Math.max(...words.map((word) => probe.measureText(word).width));
      if (widest > width * 0.94) fontSize *= (width * 0.94) / widest;

      step = Math.max(3, Math.round(fontSize / 18));
      radius = step * 0.38;
    }

    // Renders the word off-screen and keeps one point per grid cell that lands on a glyph.
    function samplePoints(text) {
      const w = Math.ceil(width);
      const h = Math.ceil(height);
      if (w < 10 || h < 10) return [];

      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const o = off.getContext('2d');
      o.font = fontFor(fontSize);
      o.textAlign = 'center';
      o.textBaseline = 'alphabetic';
      const metrics = o.measureText(text);
      const baseline = (h + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      o.fillText(text, w / 2, baseline);

      const pixels = o.getImageData(0, 0, w, h).data;
      const points = [];
      const start = Math.floor(step / 2);
      for (let y = start; y < h; y += step) {
        for (let x = start; x < w; x += step) {
          if (pixels[(y * w + x) * 4 + 3] > 128) points.push({ x, y });
        }
      }
      return shuffle(points);
    }

    function shuffle(list) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }

    // Bands of rose and teal that drift across the word, with some per-dot variation.
    function colorFor(x, y) {
      const wave = 0.5 + 0.38 * Math.sin((x / width) * TAU * 0.9 + y * 0.012 + colorPhase);
      const t = Math.min(1, Math.max(0, wave + (Math.random() - 0.5) * 0.35));
      return Math.round(t * (COLOR_STEPS - 1));
    }

    function setWord(text, animate) {
      const points = samplePoints(text);
      const now = performance.now();
      const count = Math.max(points.length, particles.length);
      colorPhase += 1.7;

      for (let i = 0; i < count; i++) {
        let p = particles[i];
        if (!p) {
          p = { x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0, tx: 0, ty: 0, a: 0, ta: 0, c: 0, delay: 0 };
          particles.push(p);
        }

        const target = points[i];
        if (target) {
          p.tx = target.x;
          p.ty = target.y;
          p.ta = 1;
          p.c = colorFor(target.x, target.y);
          // Assemble roughly left to right, with some randomness.
          p.delay = animate ? now + (target.x / width) * 650 + Math.random() * 450 : 0;
        } else {
          // Not needed for this word: drift off and fade out.
          p.tx = Math.random() * width;
          p.ty = Math.random() * height;
          p.ta = 0;
          p.delay = 0;
        }

        if (animate) {
          p.vx += (Math.random() - 0.5) * 9;
          p.vy += (Math.random() - 0.5) * 9;
        } else {
          p.x = p.tx;
          p.y = p.ty;
          p.a = p.ta;
          p.vx = 0;
          p.vy = 0;
        }
      }

      if (!animate) particles = particles.filter((p) => p.ta > 0);
    }

    // Advances the simulation one frame. Returns true while anything is still moving.
    function update(now) {
      const interactive = !reduceMotion.matches;
      let moving = false;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (now >= p.delay) {
          p.vx += (p.tx - p.x) * SPRING;
          p.vy += (p.ty - p.y) * SPRING;
        } else {
          moving = true;
        }

        if (interactive) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < REPEL_RADIUS * REPEL_RADIUS) {
            const dist = Math.sqrt(distSq) || 1;
            const force = (1 - dist / REPEL_RADIUS) * 2.4;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;
        p.a += (p.ta - p.a) * 0.08;

        if (p.ta === 0 && p.a < 0.02) {
          particles.splice(i, 1);
          continue;
        }

        if (Math.abs(p.vx) + Math.abs(p.vy) > 0.02 || Math.abs(p.ta - p.a) > 0.01) moving = true;
      }

      return moving;
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (p.a < 0.01) continue;
        ctx.globalAlpha = Math.min(1, p.a);
        ctx.fillStyle = palette[p.c];
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      rafId = 0;
      const moving = update(now);
      draw();
      // Stop drawing once everything has settled; the next word or pointer move wakes it.
      if (moving && visible) rafId = requestAnimationFrame(frame);
    }

    function wake() {
      if (!rafId && visible && !reduceMotion.matches) rafId = requestAnimationFrame(frame);
    }

    function nextWord() {
      wordIndex = (wordIndex + 1) % words.length;
      setWord(words[wordIndex], true);
      wake();
    }

    function startCycle() {
      if (!timer && words.length > 1 && !reduceMotion.matches && !document.hidden) {
        timer = setInterval(nextWord, CYCLE_MS);
      }
    }

    function stopCycle() {
      clearInterval(timer);
      timer = 0;
    }

    function snapToCurrentWord() {
      measure();
      setWord(words[wordIndex], false);
      draw();
    }

    function start() {
      measure();
      if (reduceMotion.matches) {
        setWord(words[0], false);
        draw();
        return;
      }
      setWord(words[0], true);
      wake();
      startCycle();
    }

    // Pointer interaction (mouse and pen; touch scrolling is left alone).
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      wake();
    });

    canvas.addEventListener('pointerleave', () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
      wake();
    });

    // Pause when off-screen or in a background tab.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) {
          startCycle();
          wake();
        } else {
          stopCycle();
        }
      }).observe(canvas);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopCycle();
      else if (visible) startCycle();
    });

    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) {
        stopCycle();
        snapToCurrentWord();
      } else {
        startCycle();
      }
    });

    // Re-fit the words when the stage changes width (ignored until the first word has started).
    let started = false;
    let resizeTimer = 0;
    let lastWidth = 0;
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        const current = canvas.getBoundingClientRect().width;
        if (!started || Math.abs(current - lastWidth) < 1) return;
        lastWidth = current;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(snapToCurrentWord, 150);
      }).observe(canvas);
    }

    // Wait for the display font so the dots trace the right letter shapes.
    const fontReady = document.fonts && document.fonts.load
      ? document.fonts.load(fontFor(64), words.join('')).catch(() => null)
      : Promise.resolve();
    fontReady.then(() => {
      lastWidth = canvas.getBoundingClientRect().width;
      started = true;
      start();
    });
  }
})();
