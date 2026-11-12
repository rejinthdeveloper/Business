const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

// ---------- Hero name: split into letters for the entrance animation ----------
const heroTitle = document.querySelector('.hero h1');
if (heroTitle && !reduceMotion) {
  heroTitle.setAttribute('aria-label', heroTitle.textContent.replace(/\s+/g, ' ').trim());
  let c = 0;
  [...heroTitle.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        // spaces stay as text so they keep their width between inline-block letters
        if (/\s/.test(ch)) { frag.append(ch); continue; }
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = ch;
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--c', c++);
        frag.append(span);
      }
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add('ch');
      node.setAttribute('aria-hidden', 'true');
      node.style.setProperty('--c', c++);
    }
  });
}

// ---------- Hero stats: count up once the cards have risen in ----------
if (!reduceMotion) {
  document.querySelectorAll('.stats dt').forEach((dt, i) => {
    const m = dt.textContent.trim().match(/^(\d+)(.*)$/);
    if (!m) return;
    const target = Number(m[1]), suffix = m[2];
    dt.textContent = '0' + suffix;
    setTimeout(() => {
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / 1400);
        dt.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 1050 + i * 90);
  });
}

// ---------- Scroll reveal: sections fade up, their items stagger in as they enter ----------
const revealEls = document.querySelectorAll('.reveal');
const items = reduceMotion ? [] : [...document.querySelectorAll(
  '.feature, .card, .timeline > li, .skills > div, .edu > li, .extras > li'
)];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  revealEls.forEach((el) => io.observe(el));

  const itemIo = new IntersectionObserver((entries) => {
    let n = 0; // stagger only among items that arrive in the same batch
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.style.setProperty('--i', n++);
      el.classList.add('in');
      // drop the stagger delay afterwards so hover effects respond immediately
      // (ignore transitionend bubbling up from children such as the DBT flow dots)
      const done = (e) => {
        if (e.target !== el) return;
        el.style.removeProperty('--i');
        el.removeEventListener('transitionend', done);
      };
      el.addEventListener('transitionend', done);
      itemIo.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => { el.classList.add('rv'); itemIo.observe(el); });
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

// ---------- Active nav link with a sliding pill ----------
const nav = document.querySelector('.nav');
const navLinks = [...nav.querySelectorAll('a')];
const pill = document.createElement('span');
pill.className = 'nav-pill';
pill.setAttribute('aria-hidden', 'true');
nav.append(pill);
let activeLink = null;

function setActive(link) {
  activeLink = link;
  navLinks.forEach((a) => a.classList.toggle('active', a === link));
  if (link) {
    pill.style.setProperty('--x', `${link.offsetLeft}px`);
    pill.style.setProperty('--w', `${link.offsetWidth}px`);
  }
  pill.classList.toggle('on', Boolean(link));
}
if ('IntersectionObserver' in window) {
  const navIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActive(navLinks.find((a) => a.getAttribute('href') === '#' + entry.target.id) || null);
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => {
    const section = document.querySelector(a.getAttribute('href'));
    if (section) navIo.observe(section);
  });
}

// ---------- Scroll effects: progress bar, sticky header, timeline fill, parallax ----------
const topbar = document.querySelector('.topbar');
const progress = document.getElementById('progress');
const heroInner = document.getElementById('heroInner');
const orbs = [...document.querySelectorAll('.orb-wrap')];
const timeline = document.querySelector('.timeline');
const tlItems = timeline ? [...timeline.children] : [];
let mouseX = 0, mouseY = 0, ticking = false;

function onFrame() {
  ticking = false;
  // reads first, then writes, to avoid forcing extra layouts
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = root.scrollHeight - vh;
  const tlRect = timeline ? timeline.getBoundingClientRect() : null;
  const tlTops = tlItems.map((li) => li.getBoundingClientRect().top);

  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  topbar.classList.toggle('scrolled', y > 10);
  if (activeLink && y < vh * 0.4) setActive(null);

  if (timeline) {
    // the line fills up to a point 62% down the viewport; dots light as it reaches them
    const trigger = vh * 0.62;
    const lineTop = tlRect.top + 8;
    const lineHeight = tlRect.height - 8 - 38;
    const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (trigger - lineTop) / lineHeight));
    timeline.style.setProperty('--p', p.toFixed(4));
    tlItems.forEach((li, i) => li.classList.toggle('lit', reduceMotion || tlTops[i] + 10 <= trigger));
  }

  if (reduceMotion) return;
  orbs.forEach((orb) => {
    const speed = parseFloat(orb.dataset.speed) || 0;
    const m = parseFloat(orb.dataset.mouse) || 0;
    orb.style.transform = `translate3d(${mouseX * m}px, ${y * speed + mouseY * m}px, 0)`;
  });
  if (y < vh * 1.2) {
    heroInner.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
    heroInner.style.opacity = Math.max(0, 1 - y / (vh * 0.75));
  }
}
const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', () => { if (activeLink) setActive(activeLink); requestFrame(); });
window.addEventListener('pointermove', (e) => {
  mouseX = e.clientX / window.innerWidth - 0.5;
  mouseY = e.clientY / window.innerHeight - 0.5;
  requestFrame();
}, { passive: true });
onFrame();

// ---------- Cursor spotlight + border glow on cards ----------
document.querySelectorAll('.feature, .card').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

// ---------- Magnetic buttons (mouse only) ----------
if (!reduceMotion && finePointer) {
  document.querySelectorAll('.btn, .contact-links a').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${(e.clientX - r.left - r.width / 2) * 0.2}px`);
      el.style.setProperty('--ty', `${(e.clientY - r.top - r.height / 2) * 0.3}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--tx');
      el.style.removeProperty('--ty');
    });
  });
}

// ---------- Hero particle network ----------
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
const pointer = { x: -9999, y: -9999 };
let particles = [], w = 0, h = 0, colors = [], running = false, heroVisible = true;
const LINK = 130;

function readColors() { colors = [css('--accent'), css('--accent-2'), css('--accent-3')]; }

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = rect.width; h = rect.height;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(90, Math.floor((w * h) / 14000));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r: Math.random() * 1.6 + 0.8,
    c: Math.floor(Math.random() * 3),
  }));
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!reduceMotion) {
      // gentle push away from the cursor
      const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < 14000) { p.x += dx * 0.012; p.y += dy * 0.012; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
      if (d < LINK) {
        ctx.globalAlpha = (1 - d / LINK) * 0.35;
        ctx.strokeStyle = colors[p.c];
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    const pd = Math.hypot(p.x - pointer.x, p.y - pointer.y);
    if (pd < 180) {
      ctx.globalAlpha = (1 - pd / 180) * 0.6;
      ctx.strokeStyle = colors[1];
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colors[p.c];
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function loop() {
  if (!running) return;
  draw();
  requestAnimationFrame(loop);
}
function updateRunning() {
  const should = heroVisible && !document.hidden && !reduceMotion;
  if (should && !running) { running = true; requestAnimationFrame(loop); }
  if (!should) running = false;
}

readColors();
resize();
draw();
window.addEventListener('resize', () => { resize(); draw(); });
canvas.parentElement.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
});
canvas.parentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
document.addEventListener('visibilitychange', updateRunning);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateRunning(); })
    .observe(canvas.parentElement);
}
updateRunning();

// ---------- Theme toggle (saved choice wins; otherwise follow the OS) ----------
const toggle = document.getElementById('themeToggle');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : darkQuery.matches);
const syncTheme = () => {
  toggle.innerHTML = isDark() ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
  readColors();
  draw();
};
toggle.addEventListener('click', () => {
  const apply = () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    syncTheme();
  };
  if (!document.startViewTransition || reduceMotion) { apply(); return; }
  // new theme spreads out in a circle from the toggle button
  const r = toggle.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.classList.add('theme-switching'); // colour transitions off, so the new snapshot is final
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
  vt.finished.finally(() => root.classList.remove('theme-switching'));
});
darkQuery.addEventListener('change', syncTheme);
syncTheme();

document.getElementById('year').textContent = new Date().getFullYear();
