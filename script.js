// Weighted Spin Wheel Implementation
// Segments (visual order); weights for tasks are base weights and will be dynamically scaled
const segments = [
  { label: 'Pushups 30, girls 15', baseWeight: 25, color: '#ff8a3d', kind: 'task' },
  { label: 'Plank 2 min', baseWeight: 35, color: '#ffcf33', kind: 'task' },
  { label: 'Squats 50, girls 60', baseWeight: 25, color: '#38f9d7', kind: 'task' },
  { label: 'YouTube + Music Subscription', baseWeight: 0, color: '#ff2d55', kind: 'subscription' },
  { label: 'Pushups 60, girls 30', fixedPct: 25, color: '#7a8597', kind: 'fixed' }
];

// Spin counter to enable rules (persist across reloads)
let spinCount = Number(localStorage.getItem('spinCount') || 0);

function getEffectiveWeights() {
  // Subscription: 0% before 20 spins, then 6%
  const SUB = spinCount >= 20 ? 6 : 0;
  // Sum fixed outcomes (e.g., Pushups 60, girls 30 at fixed 25%)
  const fixedTotal = segments.filter(s => s.kind === 'fixed').reduce((a, s) => a + (s.fixedPct || 0), 0);
  const remaining = Math.max(0, 100 - fixedTotal - SUB);
  // Distribute the remainder proportionally across task base weights
  const baseSum = segments.filter(s => s.kind === 'task').reduce((a, s) => a + (s.baseWeight || 0), 0);
  const scale = baseSum > 0 ? remaining / baseSum : 0;

  return segments.map(s => {
    if (s.kind === 'fixed') return s.fixedPct || 0;
    if (s.kind === 'subscription') return SUB;
    if (s.kind === 'task') return (s.baseWeight || 0) * scale; // scaled tasks
    return 0;
  });
}

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const overlay = document.getElementById('resultOverlay');
const resultText = document.getElementById('resultText');
const closeModal = document.getElementById('closeModal');

// Draw wheel (equal slice sizes; probabilities only affect selection logic)
const radius = canvas.width / 2;
const center = { x: radius, y: radius };

function drawWheel(highlightIndex = -1) {
  const total = segments.length;
  const sliceAngle = (Math.PI * 2) / total;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  segments.forEach((seg, i) => {
    const startAngle = i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    // slice
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.arc(center.x, center.y, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    // shading
    const gradient = ctx.createRadialGradient(center.x, center.y, radius * 0.2, center.x, center.y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = gradient;
    ctx.fill();

    if (i === highlightIndex) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.restore();
    }

    // label
    ctx.save();
    const labelRadius = radius * 0.55;
    const x = center.x + Math.cos(midAngle) * labelRadius;
    const y = center.y + Math.sin(midAngle) * labelRadius;
    ctx.translate(x, y);
    if (midAngle > Math.PI / 2 && midAngle < Math.PI * 1.5) ctx.rotate(Math.PI);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f1218';
    ctx.font = '600 18px system-ui';
    const chord = 2 * labelRadius * Math.sin(sliceAngle / 2) - 20;
  const lines = breakIntoLines(ctx, seg.label, chord, 18);
    const lineHeight = 20;
    const totalHeight = (lines.length - 1) * lineHeight;
    lines.forEach((ln, idx) => ctx.fillText(ln, 0, idx * lineHeight - totalHeight / 2));
    ctx.restore();
  });
}

function wrapText(context, text, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (let w of words) {
    const testLine = line + w + ' ';
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line.trim());
      line = w + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  const totalHeight = (lines.length - 1) * lineHeight;
  lines.forEach((l, idx) => {
    context.fillText(l, 0, (idx * lineHeight) - totalHeight / 2);
  });
}

// New line-break helper for upright text along chord
function breakIntoLines(context, text, maxWidth, baseSize) {
  const words = text.split(' ');
  let lines = [];
  let current = '';
  words.forEach(w => {
    const test = current ? current + ' ' + w : w;
    if (context.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

drawWheel();

// Spin button is absolutely centered within wrapper via CSS.

let isSpinning = false;
let currentRotation = 0; // radians

function weightedRandomIndex() {
  const weights = getEffectiveWeights();
  const total = weights.reduce((a, b) => a + b, 0) || 0;
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc) return i;
  }
  return weights.length - 1; // fallback
}

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;

  const selectedIndex = weightedRandomIndex();
  const totalSegments = segments.length;
  const sliceAngle = (Math.PI * 2) / totalSegments;
  const sliceCenter = (selectedIndex * sliceAngle) + sliceAngle / 2; // chosen slice center
  const pointerAngle = -Math.PI / 2; // fixed pointer pointing up
  const TAU = Math.PI * 2;
  const normalize = (a) => { a = a % TAU; if (a < 0) a += TAU; return a; };
  // We want (sliceCenter + finalRotation) % TAU == pointerAngle
  // finalRotation = currentRotation + delta
  // => deltaNeeded = pointerAngle - (sliceCenter + currentRotation) (mod TAU)
  const deltaNeeded = normalize(pointerAngle - (sliceCenter + (currentRotation % TAU)));
  const rotateTo = currentRotation + TAU * 6 + deltaNeeded; // add full spins

  const start = performance.now();
  const duration = 5000; // ms
  const startRotation = currentRotation;
  const delta = rotateTo - startRotation;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animate(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(t);
    currentRotation = startRotation + delta * eased;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(currentRotation); // positive rotation
  ctx.translate(-center.x, -center.y);
  drawWheel();
  ctx.restore();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      currentRotation = currentRotation % (Math.PI * 2);
      finalize(selectedIndex);
    }
  }

  requestAnimationFrame(animate);
}

function finalize(index) {
  // Add flash ring
  const wrapper = document.querySelector('.wheel-wrapper');
  const ring = document.createElement('div');
  ring.className = 'flash-ring';
  wrapper.appendChild(ring);
  setTimeout(() => ring.remove(), 1100);

  // confetti
  spawnConfetti();

  // highlight slice (static redraw with equal slice layout)
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(currentRotation);
  ctx.translate(-center.x, -center.y);
  drawWheel(index);
  ctx.restore();

  setTimeout(() => {
    showResult(segments[index].label);
    isSpinning = false;
    spinBtn.disabled = false;
  // increment spin counter for rule effect and persist
  spinCount += 1;
  localStorage.setItem('spinCount', String(spinCount));
  }, 650); // delay to allow ring/confetti
}

function showResult(text) {
  resultText.textContent = text;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  closeModal.focus();
}

closeModal.addEventListener('click', () => hideModal());
overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('show')) hideModal(); });

function hideModal() {
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
  spinBtn.focus();
}

spinBtn.addEventListener('click', spin);

function spawnConfetti() {
  let container = document.getElementById('confetti');
  if (!container) {
    container = document.createElement('div');
    container.id = 'confetti';
    document.querySelector('.wheel-wrapper').appendChild(container);
  }
  const colors = ['#ffcf33','#ff8a3d','#ff2d55','#38f9d7','#ffffff'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--c', colors[Math.floor(Math.random()*colors.length)]);
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = (Math.random() * 0.2) + 's';
    piece.style.animationDuration = (3 + Math.random() * 1.5) + 's';
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}
