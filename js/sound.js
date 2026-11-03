// لمّة · الأصوات (تتولّد بالمتصفح، بدون ملفات) + احتفال الفوز
let ac = null;
let master = null;

const DEFAULTS = { taps: true, msgs: true, games: true, style: 'soft' };
export const SOUND_STYLES = { soft: 'ناعم', bubble: 'فقاعة', glass: 'زجاجي' };
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
      // ضاغط خفيف يمنع الصوت الحاد والتقطيع
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.12;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 7500;
      master.connect(lp).connect(comp).connect(ac.destination);
    } catch (e) { return null; }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
// الآيفون ما يسمح بالصوت إلا بعد أول لمسة
// قبل المايك (تسجيل أو مكالمة) لازم وضع الصوت يسمح بالتسجيل
export function micMode(on) {
  try { if (navigator.audioSession) navigator.audioSession.type = on ? 'play-and-record' : 'auto'; } catch (e) { /* ignore */ }
}
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

// نغمة ناعمة مثل الماريمبا: موجة أساسية + توافقية خفيفة تختفي بسرعة
function pluck(f, { t = 0.3, vol = 0.1, at = 0, bright = 0.25 } = {}) {
  tone({ f, t, vol, at, attack: 0.006 });
  if (bright) tone({ f: f * 2.01, t: t * 0.35, vol: vol * bright, at, attack: 0.004 });
}
// "ووش" هوائي: ضوضاء تمر من فلتر يتحرك
function whoosh({ t = 0.2, vol = 0.09, at = 0, from = 700, to = 3200, q = 1.6 } = {}) {
  const c = ctx();
  if (!c) return;
  const now = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * t));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(from, now);
  bp.frequency.exponentialRampToValueAtTime(to, now + t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + t * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  s.connect(bp).connect(g).connect(master);
  s.start(now);
  s.stop(now + t + 0.02);
}
// فقاعة: نغمة ترتفع بسرعة وتختفي
function bubble(f, { vol = 0.12, at = 0, t = 0.11 } = {}) {
  tone({ f, f2: f * 1.9, t, vol, at, attack: 0.003 });
}

// أصوات الرسائل بثلاث أنماط تختارها من الإعدادات
const MSG_SOUNDS = {
  soft: {
    send: () => { whoosh({ t: 0.17, vol: 0.07 }); pluck(1175, { t: 0.16, vol: 0.05, at: 0.07, bright: 0 }); },
    receive: () => { pluck(988, { t: 0.22, vol: 0.075 }); },
    notify: () => { pluck(1319, { t: 0.28, vol: 0.08 }); pluck(988, { t: 0.4, vol: 0.07, at: 0.11 }); },
  },
  bubble: {
    send: () => { bubble(520, { vol: 0.11 }); },
    receive: () => { bubble(380, { vol: 0.1, t: 0.09 }); bubble(560, { vol: 0.06, t: 0.08, at: 0.07 }); },
    notify: () => { bubble(440, { vol: 0.1 }); bubble(660, { vol: 0.09, at: 0.1 }); },
  },
  glass: {
    send: () => { pluck(1568, { t: 0.18, vol: 0.06, bright: 0.4 }); },
    receive: () => { pluck(2093, { t: 0.35, vol: 0.05, bright: 0.5 }); },
    notify: () => { pluck(1760, { t: 0.4, vol: 0.06, bright: 0.5 }); pluck(2349, { t: 0.5, vol: 0.05, at: 0.12, bright: 0.5 }); },
  },
};
const msgSound = (k) => () => (MSG_SOUNDS[soundPrefs().style] || MSG_SOUNDS.soft)[k]();

const SFX = {
  tap: () => { tone({ f: 1500, f2: 900, t: 0.035, type: 'sine', vol: 0.05 }); },
  toggle: () => { tone({ f: 900, f2: 1300, t: 0.06, vol: 0.07 }); },
  send: msgSound('send'),
  receive: msgSound('receive'),
  notify: msgSound('notify'),
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
const lastPlay = {};
export function sfx(name, force) {
  const grp = GROUP[name] || 'games';
  if (!force && !soundPrefs()[grp]) return;
  // لو وصلت رسايل كثيرة ورا بعض، صوت واحد يكفي
  if (name === 'receive' || name === 'notify') {
    const now = Date.now();
    if (now - (lastPlay[name] || 0) < 900) return;
    lastPlay[name] = now;
  }
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
