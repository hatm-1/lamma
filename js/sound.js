// لمّة · الأصوات (تتولّد بالمتصفح، بدون ملفات) + احتفال الفوز
let ac = null;
let master = null;

const DEFAULTS = { taps: true, msgs: true, games: true };
export function soundPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('lamma-sound') || '{}') }; } catch (e) { return { ...DEFAULTS }; }
}
export function setSoundPref(k, v) {
  const p = { ...soundPrefs(), [k]: v };
  try { localStorage.setItem('lamma-sound', JSON.stringify(p)); } catch (e) { /* ignore */ }
}

function ctx() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    try {
      ac = new A();
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
    } catch (e) { return null; }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
// الآيفون ما يسمح بالصوت إلا بعد أول لمسة
export function unlockAudio() {
  const once = () => {
    const c = ctx();
    if (c) { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(master); s.start(0); }
    removeEventListener('pointerdown', once, true);
    removeEventListener('keydown', once, true);
  };
  addEventListener('pointerdown', once, true);
  addEventListener('keydown', once, true);
}

function tone({ f = 440, f2, t = 0.08, type = 'sine', vol = 0.15, at = 0, attack = 0.004, curve = 'exp' }) {
  const c = ctx();
  if (!c) return;
  const now = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f2, now + t);
    else o.frequency.linearRampToValueAtTime(f2, now + t);
  }
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.connect(g).connect(master);
  o.start(now);
  o.stop(now + t + 0.02);
}
function noise({ t = 0.03, vol = 0.12, at = 0, hp = 2000 }) {
  const c = ctx();
  if (!c) return;
  const now = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * t));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const s = c.createBufferSource();
  s.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(filt).connect(g).connect(master);
  s.start(now);
}

const SFX = {
  tap: () => { tone({ f: 1500, f2: 900, t: 0.035, type: 'sine', vol: 0.06 }); },
  toggle: () => { tone({ f: 900, f2: 1300, t: 0.06, vol: 0.08 }); },
  send: () => { tone({ f: 520, f2: 1040, t: 0.12, type: 'sine', vol: 0.12 }); noise({ t: 0.06, vol: 0.03, hp: 4000 }); },
  receive: () => { tone({ f: 880, t: 0.09, vol: 0.1 }); tone({ f: 1320, t: 0.14, vol: 0.09, at: 0.08 }); },
  notify: () => { tone({ f: 1046, t: 0.1, vol: 0.1 }); tone({ f: 1568, t: 0.18, vol: 0.09, at: 0.09 }); },
  tick: () => { noise({ t: 0.018, vol: 0.22, hp: 2500 }); tone({ f: 2600, t: 0.02, type: 'triangle', vol: 0.05 }); },
  pop: () => { tone({ f: 420, f2: 820, t: 0.09, type: 'triangle', vol: 0.14 }); },
  drop: () => { tone({ f: 300, f2: 90, t: 0.16, type: 'sine', vol: 0.22 }); noise({ t: 0.04, vol: 0.06, hp: 800, at: 0.1 }); },
  correct: () => { tone({ f: 784, t: 0.1, vol: 0.12 }); tone({ f: 1175, t: 0.18, vol: 0.12, at: 0.09 }); },
  wrong: () => { tone({ f: 220, f2: 160, t: 0.25, type: 'square', vol: 0.05 }); },
  key: () => { noise({ t: 0.012, vol: 0.1, hp: 3000 }); },
  flip: () => { tone({ f: 600, f2: 900, t: 0.05, type: 'triangle', vol: 0.05 }); },
  win: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, t: 0.22, type: 'triangle', vol: 0.12, at: i * 0.09 })); },
  lose: () => { [392, 349, 311].forEach((f, i) => tone({ f, t: 0.25, type: 'sine', vol: 0.1, at: i * 0.14 })); },
  ding: () => { tone({ f: 1318, t: 0.5, type: 'sine', vol: 0.14 }); tone({ f: 1976, t: 0.4, type: 'sine', vol: 0.05, at: 0.01 }); },
};
const GROUP = { tap: 'taps', toggle: 'taps', key: 'taps', send: 'msgs', receive: 'msgs', notify: 'msgs' };
export function sfx(name) {
  const grp = GROUP[name] || 'games';
  if (!soundPrefs()[grp]) return;
  try { SFX[name]?.(); } catch (e) { /* ignore */ }
}

// صوت خفيف لكل ضغطة على زر
export function bindTapSounds() {
  addEventListener('pointerdown', (e) => {
    const b = e.target.closest?.('button, .row, [data-a], label.check, .gtile, .word-card');
    if (!b || b.disabled || e.target.closest('input, textarea, .kb, .opts, .xo, .c4, .pad, .rx-pick')) return;
    sfx('tap');
  }, { passive: true });
}

// احتفال (قصاصات ملوّنة)
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const cols = ['#25D366', '#E8A33D', '#3B82F6', '#E5484D', '#7C5CFF', '#F5C451'];
  const ps = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const t0 = performance.now();
  const step = (now) => {
    const el = now - t0;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - el / 2600);
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    if (el < 2600) requestAnimationFrame(step); else cv.remove();
  };
  requestAnimationFrame(step);
}
