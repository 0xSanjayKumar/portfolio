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

const plateWrap = document.querySelector('.plate-wrap');
const plate = document.querySelector('.plate');
const plateGlare = document.querySelector('.plate-glare');
if (plateWrap && plate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  plateWrap.addEventListener('mousemove', e => {
    const r = plateWrap.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // swing left/right from top pivot, slight forward tilt toward cursor
    const swingY = ((px - 0.5) * 34).toFixed(2);
    const swingX = ((py - 0.3) * 8).toFixed(2);
    const shadowX = (-(swingY * 0.5)).toFixed(1);
    plate.style.transition = 'transform .1s linear, box-shadow .1s linear';
    plate.style.transform = `rotateY(${swingY}deg) rotateX(${swingX}deg)`;
    plate.style.boxShadow = `${shadowX}px 28px 56px -18px rgba(0,0,0,.8)`;
    plateGlare?.style.setProperty('--gx', `${px * 100}%`);
    plateGlare?.style.setProperty('--gy', `${py * 100}%`);
  });
  plateWrap.addEventListener('mouseleave', () => {
    plate.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1), box-shadow .8s cubic-bezier(.2,.8,.2,1)';
    plate.style.transform = '';
    plate.style.boxShadow = '';
  });
}

const sections = [...document.querySelectorAll('main section[id]')];
const navAs = [...document.querySelectorAll('.rail-index a')];

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

const catList = document.getElementById('catList');
if (catList) {
  const rows = [...catList.querySelectorAll('.cat-row')];
  const panels = [...document.querySelectorAll('.cat-panel')];
  rows.forEach(row => {
    row.addEventListener('click', () => {
      if (row.classList.contains('active')) return;
      rows.forEach(r => { r.classList.remove('active'); r.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('active'));
      row.classList.add('active');
      row.setAttribute('aria-selected', 'true');
      document.getElementById(row.dataset.target)?.classList.add('active');
    });
  });
}

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

document.querySelectorAll('.spec-sheet .spec-row').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.05}s`;
});
document.querySelectorAll('.log-row').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.06}s`;
});
document.querySelectorAll('.plo-grid .plo-item').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.05}s`;
});
document.querySelectorAll('.matrix-cell').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.07}s`;
});

const readoutEl = document.querySelector('.readout');
if (readoutEl) {
  const metricsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('[data-count]').forEach(countUp);
        metricsObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  metricsObserver.observe(readoutEl);
}

const barsEl = document.getElementById('ploBars');
if (barsEl) {
  const barsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.bar-row').forEach((row, i) => {
        const fill = row.querySelector('.bar-fill');
        const value = parseFloat(row.dataset.value);
        setTimeout(() => { fill.style.width = (value * 100) + '%'; }, i * 55);
      });
      barsObserver.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  barsObserver.observe(barsEl);
}

const radarEl = document.getElementById('ploRadar');
if (radarEl && barsEl) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const data = [...barsEl.querySelectorAll('.bar-row')].map(row => ({
    label: row.querySelector('.bar-n').textContent.replace('PLO ', ''),
    value: parseFloat(row.dataset.value)
  }));

  const cx = 150, cy = 150, R = 108;
  const minV = 0.75, maxV = 1.00;
  const rings = 5;
  const n = data.length;
  const angleFor = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const radiusFor = v => R * Math.max(0, Math.min(1, (v - minV) / (maxV - minV)));

  const gridG = radarEl.querySelector('.radar-grid');
  const axesG = radarEl.querySelector('.radar-axes');
  const dotsG = radarEl.querySelector('.radar-dots');
  const labelsG = radarEl.querySelector('.radar-labels');
  const ringLabelsG = radarEl.querySelector('.radar-ring-labels');
  const shape = radarEl.querySelector('.radar-shape');

  for (let i = 1; i <= rings; i++) {
    const r = R * (i / rings);
    const pts = data.map((_, j) => {
      const a = angleFor(j);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    });
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', pts.join(' '));
    poly.setAttribute('class', 'radar-ring');
    gridG.appendChild(poly);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', cx + 3);
    label.setAttribute('y', cy - r);
    label.setAttribute('class', 'radar-ring-label');
    label.textContent = (minV + (maxV - minV) * (i / rings)).toFixed(2);
    ringLabelsG.appendChild(label);
  }

  data.forEach((d, j) => {
    const a = angleFor(j);
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'radar-axis');
    axesG.appendChild(line);

    const lr = R + 16;
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('class', 'radar-label');
    text.setAttribute('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end'));
    text.setAttribute('dominant-baseline', Math.abs(Math.sin(a)) < 0.2 ? 'middle' : (Math.sin(a) > 0 ? 'hanging' : 'auto'));
    text.textContent = d.label;
    labelsG.appendChild(text);

    const r = radiusFor(d.value);
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', cx + r * Math.cos(a));
    dot.setAttribute('cy', cy + r * Math.sin(a));
    dot.setAttribute('r', 3);
    dot.setAttribute('class', 'radar-dot');
    dotsG.appendChild(dot);
  });

  shape.setAttribute('points', data.map((d, j) => {
    const a = angleFor(j);
    const r = radiusFor(d.value);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' '));

  const radarObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      radarObserver.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  radarObserver.observe(radarEl);
}

const fypVideo = document.getElementById('fypVideo');
if (fypVideo) {
  const fypObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        fypVideo.play().catch(() => {});
      } else {
        fypVideo.pause();
      }
    });
  }, { threshold: 0.5 });
  fypObserver.observe(fypVideo);
}

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
