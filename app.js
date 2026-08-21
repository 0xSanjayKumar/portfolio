const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

root.setAttribute('data-mode', 'field');

function setMode(mode) {
  root.setAttribute('data-mode', mode);
  refreshThemeColors();
}
document.getElementById('modeBtn').addEventListener('click', () => {
  setMode(root.getAttribute('data-mode') === 'sim' ? 'field' : 'sim');
});

const scrollProg = document.getElementById('scrollProg');
const sections = [...document.querySelectorAll('main section[id]')];
const navAs = [...document.querySelectorAll('.rail-index a')];

function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  scrollProg.style.width = pct + '%';
  const sy = window.scrollY + 160;
  let cur = sections[0]?.id;
  sections.forEach(s => {
    if (s.offsetTop <= sy) cur = s.id;
  });
  navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});
navAs.forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  burger.classList.remove('open');
}));

const themeColors = { faint: '', mid: '', accent: '', ink: '' };
function refreshThemeColors() {
  const cs = getComputedStyle(root);
  themeColors.faint = cs.getPropertyValue('--point-far').trim();
  themeColors.mid = cs.getPropertyValue('--point').trim();
  themeColors.accent = cs.getPropertyValue('--accent').trim();
  themeColors.ink = cs.getPropertyValue('--ink').trim();
}
refreshThemeColors();

const armCanvas = document.getElementById('ikArm');
function startArm() {
  if (!armCanvas) return;
  const ctx = armCanvas.getContext('2d');
  let w = 0, h = 0;
  let target = { x: 0, y: 0 };
  let hasPointer = false;
  let a1 = -Math.PI / 3, a2 = Math.PI / 2;
  let gripperClosed = false;
  let gripperSpread = 0.5;
  let tipX = 0, tipY = 0;
  let heldPiece = null;
  let pieces = [];
  let homeSlots = [];
  let particles = [];
  let pulses = [];
  const objectSpecs = [
    { fx: 0.60, fy: 0.82, kind: 'bolt' },
    { fx: 0.76, fy: 0.66, kind: 'gear' },
    { fx: 0.66, fy: 0.48, kind: 'resistor' },
    { fx: 0.84, fy: 0.80, kind: 'chip' },
    { fx: 0.52, fy: 0.60, kind: 'cap' }
  ];
  const layoutPieces = () => {
    homeSlots = objectSpecs.map(s => ({ x: w * s.fx, y: h * s.fy }));
    pieces = objectSpecs.map((s, i) => ({ x: homeSlots[i].x, y: homeSlots[i].y, kind: s.kind, held: false, home: true }));
  };
  const spawnBurst = (x, y) => {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.2;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1 });
    }
  };
  const spawnPulse = (x, y) => { pulses.push({ x, y, r: 6, alpha: 1 }); };
  const drawChip = (x, y, held) => {
    const bw = 20, bh = 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = held ? themeColors.accent : themeColors.mid;
    ctx.lineWidth = 1.5;
    [-1, 1].forEach(side => {
      [-4, 0, 4].forEach(i => {
        ctx.beginPath();
        ctx.moveTo(side * bw / 2, i);
        ctx.lineTo(side * (bw / 2 + 4), i);
        ctx.stroke();
      });
    });
    ctx.globalAlpha = 1;
    const r = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-bw / 2, -bh / 2, bw, bh, r);
    else ctx.rect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = held ? themeColors.accent : themeColors.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-bw / 2 + 4, -bh / 2 + 4, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = held ? themeColors.ink : themeColors.faint;
    ctx.fill();
    ctx.restore();
  };
  const drawBolt = (x, y, held) => {
    ctx.save();
    ctx.translate(x, y);
    const r = 8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = held ? themeColors.accent : themeColors.mid;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = themeColors.ink;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  const drawGear = (x, y, held) => {
    ctx.save();
    ctx.translate(x, y);
    const rOuter = 10, rInner = 7, teeth = 8;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2 / teeth) * 0.55;
      const a2b = (i / teeth) * Math.PI * 2 + Math.PI * 2 / teeth;
      ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter);
      ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
      ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
      ctx.lineTo(Math.cos(a2b) * rInner, Math.sin(a2b) * rInner);
    }
    ctx.closePath();
    ctx.fillStyle = held ? themeColors.accent : themeColors.mid;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = themeColors.ink;
    ctx.fill();
    ctx.restore();
  };
  const drawResistor = (x, y, held) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = held ? themeColors.accent : themeColors.mid;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-13, 0); ctx.lineTo(-6, 0);
    ctx.moveTo(6, 0); ctx.lineTo(13, 0);
    ctx.stroke();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-6, -4, 12, 8, 2);
    else ctx.rect(-6, -4, 12, 8);
    ctx.fillStyle = held ? themeColors.accent : themeColors.ink;
    ctx.fill();
    ctx.fillStyle = held ? themeColors.ink : themeColors.faint;
    ctx.globalAlpha = 0.85;
    [-3, 0, 3].forEach(bx => ctx.fillRect(bx, -4, 1.3, 8));
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  const drawCap = (x, y, held) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = held ? themeColors.accent : themeColors.mid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(0, -3);
    ctx.moveTo(0, 3); ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, -3); ctx.lineTo(7, -3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, 3); ctx.quadraticCurveTo(0, 5.5, 7, 3);
    ctx.strokeStyle = held ? themeColors.accent : themeColors.ink;
    ctx.stroke();
    ctx.restore();
  };
  const drawPart = (p) => {
    if (p.kind === 'chip') drawChip(p.x, p.y, p.held);
    else if (p.kind === 'gear') drawGear(p.x, p.y, p.held);
    else if (p.kind === 'resistor') drawResistor(p.x, p.y, p.held);
    else if (p.kind === 'cap') drawCap(p.x, p.y, p.held);
    else drawBolt(p.x, p.y, p.held);
  };
  const resize = () => {
    const cw = armCanvas.clientWidth, ch = armCanvas.clientHeight;
    if (!cw || !ch || (cw === w && ch === h)) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cw;
    h = ch;
    armCanvas.width = w * dpr;
    armCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutPieces();
  };
  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(armCanvas);
  } else {
    window.addEventListener('resize', resize);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  const contactSection = document.getElementById('contact');
  contactSection.addEventListener('pointermove', e => {
    const r = armCanvas.getBoundingClientRect();
    target.x = e.clientX - r.left;
    target.y = e.clientY - r.top;
    hasPointer = true;
  });
  contactSection.addEventListener('pointerleave', () => { hasPointer = false; });

  const tryPick = () => {
    if (heldPiece) return;
    let best = null, bestD = 26;
    pieces.forEach(p => {
      if (p.held) return;
      const d = Math.hypot(p.x - tipX, p.y - tipY);
      if (d < bestD) { bestD = d; best = p; }
    });
    if (best) {
      best.held = true;
      best.home = false;
      heldPiece = best;
      spawnBurst(best.x, best.y);
    }
  };
  const tryRelease = () => {
    if (!heldPiece) return;
    const idx = pieces.indexOf(heldPiece);
    const hs = homeSlots[idx];
    if (hs && Math.hypot(heldPiece.x - hs.x, heldPiece.y - hs.y) < 28) {
      heldPiece.x = hs.x;
      heldPiece.y = hs.y;
      heldPiece.home = true;
      spawnPulse(hs.x, hs.y);
    }
    heldPiece.held = false;
    heldPiece = null;
  };
  armCanvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    gripperClosed = true;
    tryPick();
    if (reducedMotion) drawStatic();
  });
  window.addEventListener('pointerup', () => {
    if (!gripperClosed) return;
    gripperClosed = false;
    tryRelease();
    if (reducedMotion) drawStatic();
  });
  const solveIk = (tx, ty, bx, by, l1, l2) => {
    let dx = tx - bx, dy = ty - by;
    let d = Math.hypot(dx, dy);
    d = Math.max(Math.abs(l1 - l2) + 1, Math.min(l1 + l2 - 1, d));
    const cosA2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    const t2 = Math.acos(Math.max(-1, Math.min(1, cosA2)));
    const t1 = Math.atan2(dy, dx) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
    return [t1, t2];
  };
  const drawStatic = () => {
    render(w * 0.65, h * 0.35, true);
  };
  const render = (tx, ty, instant) => {
    const bx = w * 0.28, by = h * 0.86;
    const l1 = h * 0.42, l2 = h * 0.36;
    const [t1, t2] = solveIk(tx, ty, bx, by, l1, l2);
    if (instant) { a1 = t1; a2 = t2; }
    else {
      a1 += (t1 - a1) * 0.12;
      a2 += (t2 - a2) * 0.12;
    }
    const ex = bx + Math.cos(a1) * l1;
    const ey = by + Math.sin(a1) * l1;
    const wx = ex + Math.cos(a1 + a2) * l2;
    const wy = ey + Math.sin(a1 + a2) * l2;
    tipX = wx; tipY = wy;
    const targetSpread = gripperClosed ? 0.12 : 0.5;
    gripperSpread += (targetSpread - gripperSpread) * (instant ? 1 : 0.25);
    if (heldPiece) { heldPiece.x = wx; heldPiece.y = wy; }
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = themeColors.faint;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    homeSlots.forEach(hs => {
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, 13, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = themeColors.mid;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = themeColors.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tx, ty, 5, 0, Math.PI * 2);
    ctx.moveTo(tx - 8, ty); ctx.lineTo(tx - 3, ty);
    ctx.moveTo(tx + 3, ty); ctx.lineTo(tx + 8, ty);
    ctx.moveTo(tx, ty - 8); ctx.lineTo(tx, ty - 3);
    ctx.moveTo(tx, ty + 3); ctx.lineTo(tx, ty + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = themeColors.mid;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx - 24, by - 2, 48, 10, 3);
    else ctx.rect(bx - 24, by - 2, 48, 10);
    ctx.fill();
    ctx.globalAlpha = 0.65;
    [-14, 14].forEach(ox => {
      ctx.beginPath();
      ctx.arc(bx + ox, by + 3, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.ink;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    const upperGrad = ctx.createLinearGradient(bx, by, ex, ey);
    upperGrad.addColorStop(0, themeColors.mid);
    upperGrad.addColorStop(0.5, themeColors.ink);
    upperGrad.addColorStop(1, themeColors.mid);
    ctx.strokeStyle = upperGrad;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const foreGrad = ctx.createLinearGradient(ex, ey, wx, wy);
    foreGrad.addColorStop(0, themeColors.mid);
    foreGrad.addColorStop(0.5, themeColors.ink);
    foreGrad.addColorStop(1, themeColors.mid);
    ctx.strokeStyle = foreGrad;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(wx, wy);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = themeColors.accent;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.lineTo(wx, wy);
    ctx.stroke();
    ctx.globalAlpha = 1;
    [[bx, by, 7], [ex, ey, 6]].forEach(([jx, jy, jr]) => {
      ctx.strokeStyle = themeColors.mid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(jx + Math.cos(a) * (jr + 1.5), jy + Math.sin(a) * (jr + 1.5));
        ctx.lineTo(jx + Math.cos(a) * (jr + 4), jy + Math.sin(a) * (jr + 4));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = themeColors.accent;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(jx, jy, jr, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.accent;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(jx, jy, jr * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.ink;
      ctx.fill();
    });
    const ga = a1 + a2;
    ctx.strokeStyle = themeColors.accent;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = themeColors.accent;
    ctx.shadowBlur = heldPiece ? 7 : 0;
    [-gripperSpread, gripperSpread].forEach(s => {
      const fx = wx + Math.cos(ga + s) * 13;
      const fy = wy + Math.sin(ga + s) * 13;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.accent;
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    pieces.forEach(p => {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(p.x + 1, p.y + 10, 9, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.ink;
      ctx.fill();
      ctx.globalAlpha = 1;
      drawPart(p);
    });

    pulses.forEach(pu => { pu.r += 1.5; pu.alpha -= 0.04; });
    pulses = pulses.filter(pu => pu.alpha > 0);
    pulses.forEach(pu => {
      ctx.globalAlpha = Math.max(0, pu.alpha);
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      ctx.strokeStyle = themeColors.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    particles.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vx *= 0.94; pt.vy *= 0.94;
      pt.life -= 0.035;
    });
    particles = particles.filter(pt => pt.life > 0);
    particles.forEach(pt => {
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.accent;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillStyle = themeColors.mid;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    const deg1 = Math.round((((a1 * 180 / Math.PI) % 360) + 360) % 360);
    const deg2 = Math.round((((a2 * 180 / Math.PI) % 360) + 360) % 360);
    ctx.fillText(`θ1 ${deg1}° · θ2 ${deg2}° · GRIP ${gripperClosed ? 'CLOSE' : 'OPEN'}`, w - 10, 16);
    ctx.textAlign = 'left';
  };
  if (reducedMotion) {
    drawStatic();
    return;
  }
  let armActive = false;
  const io = new IntersectionObserver(entries => { armActive = entries[0].isIntersecting; }, { threshold: 0.1 });
  io.observe(armCanvas);
  let t = 0;
  const loop = () => {
    if (armActive && !document.hidden) {
      t += 0.012;
      const idleX = w * 0.6 + Math.cos(t) * w * 0.22;
      const idleY = h * 0.42 + Math.sin(t * 1.4) * h * 0.2;
      render(hasPointer ? target.x : idleX, hasPointer ? target.y : idleY, false);
    }
    requestAnimationFrame(loop);
  };
  loop();
}
startArm();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function countUp(el) {
  const end = parseInt(el.dataset.count, 10);
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / 1400, 1);
    el.textContent = Math.round(easeOutCubic(p) * end);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const readoutEl = document.getElementById('readout');
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

const projGrid = document.getElementById('projGrid');
const filterChips = [...document.querySelectorAll('#projFilters .f-chip')];
filterChips.forEach(chip => chip.addEventListener('click', () => {
  filterChips.forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  const f = chip.dataset.filter;
  projGrid.querySelectorAll('.proj-card').forEach(card => {
    card.classList.toggle('hidden', f !== 'all' && card.dataset.type !== f);
  });
}));

const pmodal = document.getElementById('pmodal');
const pmMedia = document.getElementById('pmMedia');
const pmTitle = document.getElementById('pmTitle');
const pmStack = document.getElementById('pmStack');
const pmDesc = document.getElementById('pmDesc');
const pmTags = document.getElementById('pmTags');
const pmCount = document.getElementById('pmCount');
const pmPrev = document.getElementById('pmPrev');
const pmNext = document.getElementById('pmNext');
let pmItems = [];
let pmIdx = 0;
let lastFocused = null;

function renderPmMedia() {
  const item = pmItems[pmIdx];
  pmMedia.innerHTML = '';
  if (item.kind === 'vid') {
    const v = document.createElement('video');
    v.src = item.src;
    v.controls = true;
    v.muted = true;
    v.playsInline = true;
    pmMedia.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = pmTitle.textContent;
    pmMedia.appendChild(img);
  }
  pmCount.textContent = (pmIdx + 1) + ' / ' + pmItems.length;
  const single = pmItems.length <= 1;
  pmPrev.hidden = single;
  pmNext.hidden = single;
  pmCount.hidden = single;
}

function openProject(card) {
  pmItems = card.dataset.media.split('|').map(m => {
    const [kind, src] = m.split(/:(.+)/);
    return { kind, src };
  });
  pmIdx = 0;
  pmTitle.textContent = card.dataset.title;
  pmStack.textContent = card.dataset.stack;
  pmDesc.textContent = card.dataset.desc;
  pmTags.innerHTML = '';
  card.dataset.tags.split(',').forEach(t => {
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = t;
    pmTags.appendChild(s);
  });
  renderPmMedia();
  openDialog(pmodal, card);
}
pmPrev.addEventListener('click', () => { pmIdx = (pmIdx - 1 + pmItems.length) % pmItems.length; renderPmMedia(); });
pmNext.addEventListener('click', () => { pmIdx = (pmIdx + 1) % pmItems.length; renderPmMedia(); });
projGrid.querySelectorAll('.proj-card').forEach(card => card.addEventListener('click', () => openProject(card)));

const brief = document.getElementById('brief');
document.getElementById('briefBtn').addEventListener('click', e => openDialog(brief, e.currentTarget));

const openDialogs = new Set();
function openDialog(el, trigger) {
  lastFocused = trigger || document.activeElement;
  el.hidden = false;
  openDialogs.add(el);
  const focusable = el.querySelector('input, button:not([data-close]), a, [tabindex]');
  (focusable || el.querySelector('[data-close]'))?.focus();
  document.body.style.overflow = 'hidden';
}
function closeDialog(el) {
  el.hidden = true;
  openDialogs.delete(el);
  if (el === pmodal) pmMedia.innerHTML = '';
  if (openDialogs.size === 0) document.body.style.overflow = '';
  lastFocused?.focus();
}
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeDialog(btn.closest('.brief, .pmodal')));
});

document.addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (e.key.toLowerCase() === 'm' && !typing && openDialogs.size === 0) {
    setMode(root.getAttribute('data-mode') === 'sim' ? 'field' : 'sim');
    return;
  }
  if (e.key === 'Escape') {
    openDialogs.forEach(closeDialog);
    return;
  }
  if (!pmodal.hidden && !typing) {
    if (e.key === 'ArrowLeft') pmPrev.click();
    if (e.key === 'ArrowRight') pmNext.click();
  }
});

const barsEl = document.getElementById('ploBars');
if (barsEl) {
  const barsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.bar-row').forEach((row, i) => {
        const fill = row.querySelector('.bar-fill');
        setTimeout(() => { fill.style.width = (parseFloat(row.dataset.value) * 100) + '%'; }, i * 55);
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
  const minV = 0.75, maxV = 1.0;
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
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', data.map((_, j) => {
      const a = angleFor(j);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' '));
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
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', cx + R * Math.cos(a));
    line.setAttribute('y2', cy + R * Math.sin(a));
    line.setAttribute('class', 'radar-axis');
    axesG.appendChild(line);
    const lr = R + 16;
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', cx + lr * Math.cos(a));
    text.setAttribute('y', cy + lr * Math.sin(a));
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
      if (e.isIntersecting) fypVideo.play().catch(() => {});
      else fypVideo.pause();
    });
  }, { threshold: 0.5 });
  fypObserver.observe(fypVideo);
}

const cf = document.getElementById('contactForm');
const cfStatus = document.getElementById('cfStatus');
cf.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('cfName').value.trim();
  const email = document.getElementById('cfEmail').value.trim();
  const msg = document.getElementById('cfMessage').value.trim();
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
  cfStatus.textContent = 'Opening your email client…';
  cfStatus.className = 'form-status ok';
});

const likeBtn = document.getElementById('likeBtn');
const likeCount = document.getElementById('likeCount');
if (likeBtn) {
  const LIKE_NS = 'sanjaykumaru-mechatronics-portfolio';
  const LIKE_KEY = 'likes';
  const already = localStorage.getItem('skLiked') === '1';
  if (already) { likeBtn.classList.add('liked'); likeBtn.setAttribute('aria-pressed', 'true'); }

  fetch(`https://abacus.jasoncameron.dev/get/${LIKE_NS}/${LIKE_KEY}`)
    .then(r => r.json())
    .then(d => { likeCount.textContent = typeof d.value === 'number' ? d.value : 0; })
    .catch(() => { likeCount.textContent = '0'; });

  likeBtn.addEventListener('click', () => {
    if (likeBtn.classList.contains('liked')) return;
    likeBtn.classList.add('liked');
    likeBtn.setAttribute('aria-pressed', 'true');
    localStorage.setItem('skLiked', '1');
    const current = parseInt(likeCount.textContent, 10) || 0;
    likeCount.textContent = current + 1;
    fetch(`https://abacus.jasoncameron.dev/hit/${LIKE_NS}/${LIKE_KEY}`)
      .then(r => r.json())
      .then(d => { if (typeof d.value === 'number') likeCount.textContent = d.value; })
      .catch(() => {});
  });
}
