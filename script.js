const scrollProg = document.getElementById('scrollProg');
function updateProg() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProg.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
}
window.addEventListener('scroll', updateProg, { passive: true });

const root = document.documentElement;
const themeBtn = document.getElementById('themeBtn');

const stored = localStorage.getItem('sk-theme');
if (stored) {
  root.setAttribute('data-theme', stored);
} else if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
  root.setAttribute('data-theme', 'light');
}

themeBtn.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('sk-theme', next);
});

const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  burger.classList.toggle('open', open);
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  burger.classList.remove('open');
}));

const sections = [...document.querySelectorAll('main section[id]')];
const navAs = [...document.querySelectorAll('.nav-center a')];

function syncActive() {
  const sy = window.scrollY + 140;
  let cur = sections[0]?.id;
  for (const s of sections) {
    if (s.offsetTop <= sy) cur = s.id;
  }
  navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}
window.addEventListener('scroll', syncActive, { passive: true });
syncActive();

document.querySelectorAll('.gallery').forEach(gallery => {
  const track = gallery.querySelector('.gallery-track');
  const slides = [...gallery.querySelectorAll('.gallery-slide')];
  const prevBtn = gallery.querySelector('.g-btn.g-prev');
  const nextBtn = gallery.querySelector('.g-btn.g-next');
  const dots = [...gallery.querySelectorAll('.g-dot')];

  if (slides.length <= 1) {
    prevBtn?.setAttribute('hidden', '');
    nextBtn?.setAttribute('hidden', '');
    return;
  }

  let cur = 0;

  function go(n) {
    cur = ((n % slides.length) + slides.length) % slides.length;
    track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  }

  prevBtn?.addEventListener('click', () => go(cur - 1));
  nextBtn?.addEventListener('click', () => go(cur + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

  let startX = 0;
  gallery.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(dx < 0 ? cur + 1 : cur - 1);
  }, { passive: true });
});

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function countUp(el) {
  const end = parseInt(el.dataset.count, 10);
  const dur = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(easeOutCubic(p) * end);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

document.querySelectorAll('.projects-grid .proj-card').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 0.06}s`;
});
document.querySelectorAll('.plo-grid .plo-item').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.05}s`;
});
document.querySelectorAll('.skills-grid .skill-group').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.06}s`;
});
document.querySelectorAll('.swot-grid .swot-card').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.07}s`;
});

const metricsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      metricsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });

const metricsEl = document.querySelector('.hero-metrics');
if (metricsEl) metricsObserver.observe(metricsEl);

function initPloRadar() {
  const canvas = document.getElementById('ploRadar');
  const strip  = document.getElementById('ploScores');
  if (!canvas) return;

  const scores = [1.00, 0.83, 0.88, 1.00, 1.00, 1.00, 1.00, 1.00, 0.83, 1.00, 1.00, 1.00];
  const n = scores.length;
  let animId = null;
  let done = false;

  function col() {
    const dk = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      ring:    dk ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.08)',
      ringOut: dk ? 'rgba(255,255,255,0.13)'  : 'rgba(0,0,0,0.15)',
      spoke:   dk ? 'rgba(255,255,255,0.04)'  : 'rgba(0,0,0,0.05)',
      rlbl:    dk ? '#4a4844' : '#a09890',
      albl:    dk ? '#ede9e3' : '#0d0c0a',
      slbl:    dk ? '#c8601a' : '#b85518',
      accent:  dk ? '#c8601a' : '#b85518',
      fill:    dk ? 'rgba(200,96,26,0.15)'    : 'rgba(184,85,24,0.12)',
      dotBg:   dk ? '#08090a' : '#f5f2ec',
    };
  }

  function render(t) {
    const dpr = window.devicePixelRatio || 1;
    const W   = Math.min(canvas.parentElement.clientWidth, 560);
    canvas.style.width  = W + 'px';
    canvas.style.height = W + 'px';
    canvas.width  = W * dpr;
    canvas.height = W * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, W);

    const cx = W / 2, cy = W / 2;
    const R  = W * 0.33;
    const c  = col();

    function angle(i) { return (i / n) * 2 * Math.PI - Math.PI / 2; }
    function pt(i, v)  {
      const a = angle(i);
      return { x: cx + v * R * Math.cos(a), y: cy + v * R * Math.sin(a), a };
    }

    const rings = [0.75, 0.80, 0.85, 0.90, 0.95, 1.00];
    rings.forEach(v => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pt(i, v);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = v === 1.00 ? c.ringOut : c.ring;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    for (let i = 0; i < n; i++) {
      const p = pt(i, 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = c.spoke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const labelAngle = angle(0);
    ctx.font = `9px 'JetBrains Mono', monospace`;
    ctx.fillStyle = c.rlbl;
    rings.forEach(v => {
      const rx = cx + v * R * Math.cos(labelAngle) + 5;
      const ry = cy + v * R * Math.sin(labelAngle);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.toFixed(2), rx, ry);
    });

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pt(i, scores[i] * t);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    scores.forEach((v, i) => {
      const p = pt(i, v * t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle   = c.accent;
      ctx.fill();
      ctx.strokeStyle = c.dotBg;
      ctx.lineWidth   = 2;
      ctx.stroke();
    });

    const lblR = R + 28;
    for (let i = 0; i < n; i++) {
      const a  = angle(i);
      const lx = cx + lblR * Math.cos(a);
      const ly = cy + lblR * Math.sin(a);
      const ca = Math.cos(a), sa = Math.sin(a);

      ctx.font      = `600 10px 'JetBrains Mono', monospace`;
      ctx.fillStyle = c.albl;
      ctx.textAlign    = ca > 0.12 ? 'left' : ca < -0.12 ? 'right' : 'center';
      ctx.textBaseline = sa > 0.12 ? 'top'  : sa < -0.12 ? 'bottom' : 'middle';
      ctx.fillText(i + 1, lx, ly);

      if (t > 0.98) {
        const valR = scores[i] * R;
        const vx = cx + (valR + 12) * Math.cos(a);
        const vy = cy + (valR + 12) * Math.sin(a);
        ctx.font      = `9px 'JetBrains Mono', monospace`;
        ctx.fillStyle = c.slbl;
        ctx.textAlign    = ca > 0.12 ? 'left' : ca < -0.12 ? 'right' : 'center';
        ctx.textBaseline = sa > 0.12 ? 'top'  : sa < -0.12 ? 'bottom' : 'middle';
        ctx.fillText(scores[i].toFixed(2), vx, vy);
      }
    }
  }

  function buildStrip() {
    if (!strip) return;
    strip.innerHTML = scores.map((v, i) =>
      `<div class="plo-sc"><span class="plo-sc-n">PLO ${i + 1}</span><span class="plo-sc-v">${v.toFixed(2)}</span></div>`
    ).join('');
  }

  function startAnim() {
    let p = 0;
    if (animId) cancelAnimationFrame(animId);
    function tick() {
      p = Math.min(p + 0.026, 1);
      render(1 - Math.pow(1 - p, 3));
      if (p < 1) animId = requestAnimationFrame(tick);
      else done = true;
    }
    animId = requestAnimationFrame(tick);
  }

  buildStrip();

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { startAnim(); obs.unobserve(canvas); }
  }, { threshold: 0.2 });
  obs.observe(canvas);

  window.addEventListener('resize', () => { if (done) render(1); });
  new MutationObserver(() => { if (done) render(1); }).observe(
    document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }
  );
}

initPloRadar();

const cf = document.getElementById('contactForm');
const cfStatus = document.getElementById('cf-status');

cf.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const msg = document.getElementById('cf-message').value.trim();

  if (!name || !email || !msg) {
    cfStatus.textContent = 'Please fill in all fields.';
    cfStatus.className = 'form-status err';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    cfStatus.textContent = 'Please enter a valid email.';
    cfStatus.className = 'form-status err';
    return;
  }

  const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
  const body = encodeURIComponent(`${msg}\n\n— ${name}\n${email}`);
  window.location.href = `mailto:sanjaykumaru082@gmail.com?subject=${subject}&body=${body}`;

  cfStatus.textContent = '✓ Opening your email client…';
  cfStatus.className = 'form-status ok';
});
