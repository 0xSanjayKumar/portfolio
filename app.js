const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bootEl = document.getElementById('boot');
const bootLog = document.getElementById('bootLog');
const bootLines = [
  'sk-portfolio v2.1 booting',
  'power rails 3V3 / 5V .... <span class="ok">OK</span>',
  'peripherals init ........ <span class="ok">OK</span>',
  'CAN bus ................. <span class="ok">ONLINE</span>',
  'servos homed ............ <span class="ok">OK</span>',
  'operator console ........ <span class="ok">READY</span>'
];

function runBoot() {
  if (reducedMotion || sessionStorage.getItem('skBooted')) {
    bootEl.remove();
    return;
  }
  let i = 0;
  const step = () => {
    if (i < bootLines.length) {
      bootLog.innerHTML += bootLines[i] + '\n';
      i++;
      setTimeout(step, 130);
    } else {
      setTimeout(() => {
        bootEl.classList.add('done');
        sessionStorage.setItem('skBooted', '1');
        setTimeout(() => bootEl.remove(), 450);
      }, 240);
    }
  };
  step();
}
runBoot();

const storedMode = localStorage.getItem('skMode');
if (storedMode === 'sim' || storedMode === 'field') root.setAttribute('data-mode', storedMode);

const hudMode = document.getElementById('hudMode');
const hudPwr = document.getElementById('hudPwr');
const hudScroll = document.getElementById('hudScroll');
const hudSec = document.getElementById('hudSec');

function setMode(mode) {
  root.setAttribute('data-mode', mode);
  localStorage.setItem('skMode', mode);
  hudMode.textContent = mode.toUpperCase();
  refreshThemeColors();
}
document.getElementById('modeBtn').addEventListener('click', () => {
  setMode(root.getAttribute('data-mode') === 'sim' ? 'field' : 'sim');
});
hudMode.textContent = root.getAttribute('data-mode').toUpperCase();

const scrollProg = document.getElementById('scrollProg');
const sections = [...document.querySelectorAll('main section[id]')];
const navAs = [...document.querySelectorAll('.rail-index a')];

function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  scrollProg.style.width = pct + '%';
  hudScroll.textContent = Math.round(pct) + '%';
  const sy = window.scrollY + 160;
  let cur = sections[0]?.id;
  let curIdx = 0;
  sections.forEach((s, i) => {
    if (s.offsetTop <= sy) { cur = s.id; curIdx = i; }
  });
  navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  hudSec.textContent = cur === 'hero' ? 'HOME' : 'J0' + curIdx + ' ' + cur.toUpperCase();
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

const pcbCanvas = document.getElementById('pcbCanvas');
const netNames = ['VCC 3V3', 'GND', 'SDA', 'SCL', 'UART_TX', 'UART_RX', 'CAN_H', 'CAN_L', 'PWM1', 'PWM2', 'SPI_MOSI', 'SPI_MISO', 'SPI_SCK', 'ENC_A', 'ENC_B', 'ADC_IN0', 'nRST', 'BOOT0', 'STEP', 'DIR'];
const netReadings = ['3.30 V', '0.00 V', '400 kHz', '400 kHz', '115200 bd', '115200 bd', '2.60 V', '2.40 V', '20 kHz', '20 kHz', '8 MHz', '8 MHz', '8 MHz', '1024 cpr', '1024 cpr', '1.82 V', '3.30 V', '0.00 V', '1.2 kHz', 'HIGH'];
let pcbTraces = [];
let pcbVias = [];
let pcbChip = null;
let pcbMouse = { x: -9999, y: -9999 };
let pcbActive = true;
const pcbAvatarEl = document.getElementById('pcbAvatarImg');
let pcbAvatarReady = false;
if (pcbAvatarEl) {
  if (pcbAvatarEl.complete && pcbAvatarEl.naturalWidth) pcbAvatarReady = true;
  else pcbAvatarEl.addEventListener('load', () => { pcbAvatarReady = true; });
}

function buildPcb(w, h) {
  const rand = (a, b) => a + Math.random() * (b - a);
  const snap = v => Math.round(v / 14) * 14;
  pcbTraces = [];
  pcbVias = [];
  const cw = Math.min(190, w * 0.18);
  pcbChip = { x: snap(w * 0.66), y: snap(h * 0.42), w: snap(cw), h: snap(cw) };
  const dirs = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
  const padsPerSide = 7;
  const sides = [
    { dx: 0, dy: -1, along: 'x' },
    { dx: 1, dy: 0, along: 'y' },
    { dx: 0, dy: 1, along: 'x' },
    { dx: -1, dy: 0, along: 'y' }
  ];
  let netIdx = 0;
  sides.forEach(side => {
    for (let p = 1; p <= padsPerSide; p++) {
      const frac = p / (padsPerSide + 1);
      let sx, sy;
      if (side.along === 'x') {
        sx = pcbChip.x + pcbChip.w * frac;
        sy = side.dy < 0 ? pcbChip.y : pcbChip.y + pcbChip.h;
      } else {
        sx = side.dx > 0 ? pcbChip.x + pcbChip.w : pcbChip.x;
        sy = pcbChip.y + pcbChip.h * frac;
      }
      let dirIdx = dirs.indexOf(Math.atan2(side.dy, side.dx) < 0 ? 3 * Math.PI / 2 : Math.atan2(side.dy, side.dx));
      if (dirIdx < 0) dirIdx = side.dx > 0 ? 0 : 4;
      const pts = [{ x: sx, y: sy }];
      let cx = sx, cy = sy;
      const segCount = 2 + Math.floor(rand(0, 3));
      for (let s = 0; s < segCount; s++) {
        const dir = dirs[dirIdx];
        const len = snap(rand(50, 190));
        cx += Math.cos(dir) * len;
        cy += Math.sin(dir) * len;
        cx = Math.max(20, Math.min(w - 20, cx));
        cy = Math.max(20, Math.min(h - 20, cy));
        pts.push({ x: cx, y: cy });
        dirIdx = (dirIdx + (Math.random() < 0.5 ? 1 : 7)) % 8;
      }
      let total = 0;
      const lens = [];
      for (let s = 1; s < pts.length; s++) {
        const l = Math.hypot(pts[s].x - pts[s - 1].x, pts[s].y - pts[s - 1].y);
        lens.push(l);
        total += l;
      }
      pcbTraces.push({
        pts, lens, total,
        net: netNames[netIdx % netNames.length],
        reading: netReadings[netIdx % netReadings.length],
        pulse: Math.random(),
        speed: rand(0.0016, 0.004)
      });
      pcbVias.push({ x: cx, y: cy, r: 4.5 });
      netIdx++;
    }
  });
  for (let k = 0; k < 10; k++) {
    pcbVias.push({ x: snap(rand(30, w - 30)), y: snap(rand(30, h - 30)), r: 3 });
  }
}

function pointOnTrace(tr, t) {
  let d = t * tr.total;
  for (let s = 0; s < tr.lens.length; s++) {
    if (d <= tr.lens[s]) {
      const a = tr.pts[s], b = tr.pts[s + 1];
      const f = tr.lens[s] === 0 ? 0 : d / tr.lens[s];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    d -= tr.lens[s];
  }
  return tr.pts[tr.pts.length - 1];
}

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function traceDistance(tr, px, py) {
  let best = Infinity;
  for (let s = 1; s < tr.pts.length; s++) {
    best = Math.min(best, distToSegment(px, py, tr.pts[s - 1], tr.pts[s]));
  }
  return best;
}

function drawPcb(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  let probed = null;
  let probedDist = 26;
  for (const tr of pcbTraces) {
    const d = traceDistance(tr, pcbMouse.x, pcbMouse.y);
    if (d < probedDist) { probedDist = d; probed = tr; }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const tr of pcbTraces) {
    ctx.beginPath();
    ctx.moveTo(tr.pts[0].x, tr.pts[0].y);
    for (let s = 1; s < tr.pts.length; s++) ctx.lineTo(tr.pts[s].x, tr.pts[s].y);
    if (tr === probed) {
      ctx.strokeStyle = themeColors.accent;
      ctx.lineWidth = 2.4;
      ctx.globalAlpha = 0.95;
    } else {
      ctx.strokeStyle = themeColors.mid;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.32;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  for (const v of pcbVias) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
    ctx.strokeStyle = themeColors.mid;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(v.x, v.y, v.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = themeColors.mid;
    ctx.fill();
  }
  if (pcbAvatarReady) {
    const pad = Math.max(6, pcbChip.w * 0.08);
    const ix = pcbChip.x + pad, iy = pcbChip.y + pad;
    const iw = pcbChip.w - pad * 2, ih = pcbChip.h - pad * 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();
    ctx.globalAlpha = 0.95;
    const scale = Math.max(iw / pcbAvatarEl.naturalWidth, ih / pcbAvatarEl.naturalHeight);
    const dw = pcbAvatarEl.naturalWidth * scale, dh = pcbAvatarEl.naturalHeight * scale;
    ctx.drawImage(pcbAvatarEl, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
    ctx.restore();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = themeColors.mid;
    ctx.lineWidth = 1;
    ctx.strokeRect(ix, iy, iw, ih);
  }
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = themeColors.mid;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(pcbChip.x, pcbChip.y, pcbChip.w, pcbChip.h);
  ctx.beginPath();
  ctx.arc(pcbChip.x + 14, pcbChip.y + 14, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = themeColors.mid;
  ctx.textAlign = 'center';
  ctx.fillText('U1 · STM32', pcbChip.x + pcbChip.w / 2, pcbChip.y + pcbChip.h + 16);
  ctx.fillText('SK-01 REV C', pcbChip.x + pcbChip.w / 2, pcbChip.y + pcbChip.h + 30);
  for (const tr of pcbTraces) {
    tr.pulse = (tr.pulse + tr.speed) % 1;
    const p = pointOnTrace(tr, tr.pulse);
    ctx.globalAlpha = tr === probed ? 1 : 0.7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, tr === probed ? 3.4 : 2.2, 0, Math.PI * 2);
    ctx.fillStyle = themeColors.accent;
    ctx.fill();
  }
  if (probed) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = themeColors.accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(pcbMouse.x, pcbMouse.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pcbMouse.x - 15, pcbMouse.y);
    ctx.lineTo(pcbMouse.x + 15, pcbMouse.y);
    ctx.moveTo(pcbMouse.x, pcbMouse.y - 15);
    ctx.lineTo(pcbMouse.x, pcbMouse.y + 15);
    ctx.stroke();
    const label = probed.net + '  ' + probed.reading;
    ctx.font = '11px "IBM Plex Mono", monospace';
    const tw = ctx.measureText(label).width;
    const lx = Math.min(Math.max(pcbMouse.x + 18, 8), w - tw - 20);
    const ly = Math.max(pcbMouse.y - 16, 20);
    ctx.fillStyle = themeColors.accent;
    ctx.textAlign = 'left';
    ctx.fillText(label, lx, ly);
  }
  ctx.globalAlpha = 1;
}

function startPcb() {
  if (!pcbCanvas || reducedMotion) return;
  const ctx = pcbCanvas.getContext('2d');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pcbCanvas.width = pcbCanvas.clientWidth * dpr;
    pcbCanvas.height = pcbCanvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPcb(pcbCanvas.clientWidth, pcbCanvas.clientHeight);
  };
  resize();
  window.addEventListener('resize', resize);
  const hero = document.getElementById('hero');
  hero.addEventListener('pointermove', e => {
    const r = pcbCanvas.getBoundingClientRect();
    pcbMouse.x = e.clientX - r.left;
    pcbMouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { pcbMouse.x = -9999; pcbMouse.y = -9999; });
  const io = new IntersectionObserver(entries => { pcbActive = entries[0].isIntersecting; }, { threshold: 0.05 });
  io.observe(hero);
  const loop = () => {
    if (pcbActive && !document.hidden) drawPcb(ctx, pcbCanvas.clientWidth, pcbCanvas.clientHeight);
    requestAnimationFrame(loop);
  };
  loop();
}
startPcb();

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
  const objectSpecs = [
    { fx: 0.60, fy: 0.82, kind: 'piece', glyph: '♟' },
    { fx: 0.76, fy: 0.66, kind: 'piece', glyph: '♞' },
    { fx: 0.66, fy: 0.48, kind: 'piece', glyph: '♜' },
    { fx: 0.84, fy: 0.80, kind: 'box' },
    { fx: 0.52, fy: 0.60, kind: 'box' }
  ];
  const layoutPieces = () => {
    homeSlots = objectSpecs.map(s => ({ x: w * s.fx, y: h * s.fy }));
    pieces = objectSpecs.map((s, i) => ({ x: homeSlots[i].x, y: homeSlots[i].y, kind: s.kind, glyph: s.glyph, held: false }));
  };
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
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = armCanvas.clientWidth;
    h = armCanvas.clientHeight;
    armCanvas.width = w * dpr;
    armCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!pieces.length) layoutPieces();
  };
  resize();
  window.addEventListener('resize', resize);
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
    if (best) { best.held = true; heldPiece = best; }
  };
  const tryRelease = () => {
    if (heldPiece) { heldPiece.held = false; heldPiece = null; }
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
    ctx.globalAlpha = 1;
    ctx.fillStyle = themeColors.mid;
    ctx.fillRect(bx - 20, by, 40, 6);
    ctx.lineCap = 'round';
    ctx.strokeStyle = themeColors.ink;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(wx, wy);
    ctx.stroke();
    [[bx, by, 7], [ex, ey, 6]].forEach(([jx, jy, jr]) => {
      ctx.beginPath();
      ctx.arc(jx, jy, jr, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(jx, jy, jr * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.ink;
      ctx.fill();
    });
    const ga = a1 + a2;
    ctx.strokeStyle = themeColors.accent;
    ctx.lineWidth = 3.5;
    [-gripperSpread, gripperSpread].forEach(s => {
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(ga + s) * 13, wy + Math.sin(ga + s) * 13);
      ctx.stroke();
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    pieces.forEach(p => {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(p.x + 1, p.y + (p.kind === 'box' ? 9 : 11), 9, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.ink;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (p.kind === 'box') {
        drawChip(p.x, p.y, p.held);
      } else {
        ctx.font = '22px serif';
        ctx.fillStyle = p.held ? themeColors.accent : themeColors.ink;
        ctx.fillText(p.glyph, p.x, p.y);
      }
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
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
  btn.addEventListener('click', () => closeDialog(btn.closest('.cmdk, .brief, .pmodal')));
});

const cmdk = document.getElementById('cmdk');
const cmdkInput = document.getElementById('cmdkInput');
const cmdkList = document.getElementById('cmdkList');
let cmdSel = 0;

const commands = [
  { label: 'Go to Skills', hint: 'J01', run: () => jump('#skills'), keys: 'goto skills j01' },
  { label: 'Go to Experience', hint: 'J02', run: () => jump('#experience'), keys: 'goto experience meraque j02' },
  { label: 'Go to Final Year Project', hint: 'J03', run: () => jump('#fyp'), keys: 'goto fyp digital twin isaac j03' },
  { label: 'Go to Projects', hint: 'J04', run: () => jump('#projects'), keys: 'goto projects builds j04' },
  { label: 'Go to Education', hint: 'J05', run: () => jump('#education'), keys: 'goto education apu j05' },
  { label: 'Go to Leadership', hint: 'J06', run: () => jump('#leadership'), keys: 'goto leadership imeche j06' },
  { label: 'Go to Strategic Profile', hint: 'J07', run: () => jump('#swot'), keys: 'goto swot strategic j07' },
  { label: 'Go to Programme Outcomes', hint: 'J08', run: () => jump('#outcomes'), keys: 'goto plo outcomes j08' },
  { label: 'Go to Contact', hint: 'J09', run: () => jump('#contact'), keys: 'goto contact email j09' },
  { label: 'Toggle Sim / Field view', hint: 'M', run: () => setMode(root.getAttribute('data-mode') === 'sim' ? 'field' : 'sim'), keys: 'sim field mode theme toggle twin' },
  { label: 'Open 30-second brief', hint: 'recruiters', run: () => openDialog(brief), keys: 'brief recruiter summary quick 30' },
  { label: 'Copy email address', hint: 'clipboard', run: copyEmail, keys: 'email copy contact mail' },
  { label: 'Open LinkedIn', hint: 'new tab', run: () => window.open('https://www.linkedin.com/in/sanjay-kumar-sku', '_blank'), keys: 'linkedin profile social' },
  { label: 'Download CV', hint: 'pdf', run: () => { window.location.href = 'assets/Sanjay_Kumar_CV.pdf'; }, keys: 'cv resume download pdf' },
  { label: 'Call Sanjay', hint: '+60 17-288 6247', run: () => { window.location.href = 'tel:+60172886247'; }, keys: 'call phone tel' }
];

function jump(sel) {
  document.querySelector(sel)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

function copyEmail() {
  navigator.clipboard?.writeText('sanjaykumaru082@gmail.com').then(() => {
    hudPwr.textContent = 'COPIED';
    setTimeout(() => { hudPwr.textContent = '5.00 V'; }, 1800);
  }).catch(() => { window.location.href = 'mailto:sanjaykumaru082@gmail.com'; });
}

function filterCommands(q) {
  const s = q.trim().toLowerCase();
  if (!s) return commands;
  return commands.filter(c => (c.label + ' ' + c.keys).toLowerCase().includes(s));
}

function renderCommands(q) {
  const items = filterCommands(q);
  cmdSel = Math.min(cmdSel, Math.max(0, items.length - 1));
  cmdkList.innerHTML = '';
  items.forEach((c, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.className = i === cmdSel ? 'sel' : '';
    li.innerHTML = `<span>${c.label}</span><span class="ck-hint">${c.hint}</span>`;
    li.addEventListener('click', () => { closeDialog(cmdk); c.run(); });
    li.addEventListener('pointerenter', () => { cmdSel = i; renderCommands(cmdkInput.value); });
    cmdkList.appendChild(li);
  });
  if (!items.length) {
    const li = document.createElement('li');
    li.innerHTML = '<span>No matching command — try "goto", "sim", "brief", "email"</span>';
    cmdkList.appendChild(li);
  }
  return items;
}

function openCmdk() {
  cmdSel = 0;
  cmdkInput.value = '';
  renderCommands('');
  openDialog(cmdk);
  cmdkInput.focus();
}
document.getElementById('cmdBtn').addEventListener('click', openCmdk);
document.getElementById('cmdHint').addEventListener('click', openCmdk);

cmdkInput.addEventListener('input', () => { cmdSel = 0; renderCommands(cmdkInput.value); });
cmdkInput.addEventListener('keydown', e => {
  const items = filterCommands(cmdkInput.value);
  if (e.key === 'ArrowDown') { e.preventDefault(); cmdSel = (cmdSel + 1) % items.length; renderCommands(cmdkInput.value); }
  if (e.key === 'ArrowUp') { e.preventDefault(); cmdSel = (cmdSel - 1 + items.length) % items.length; renderCommands(cmdkInput.value); }
  if (e.key === 'Enter' && items[cmdSel]) { closeDialog(cmdk); items[cmdSel].run(); }
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    cmdk.hidden ? openCmdk() : closeDialog(cmdk);
    return;
  }
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (e.key === '/' && !typing && cmdk.hidden) { e.preventDefault(); openCmdk(); return; }
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
