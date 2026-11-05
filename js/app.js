// لمّة · التطبيق
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';
import { deriveFromPassphrase, importKey, encJSON, decJSON, encBytes, decBytes } from './crypto.js';
import { initCalls, startCall, inCall } from './calls.js';
import { setPill } from './callui.js';
import { sfx, unlockAudio, bindTapSounds, soundPrefs, setSoundPref, confetti, SOUND_STYLES, haptic } from './sound.js';
import { initGames, loadGames, renderGamesPane, onGameChange, openGame, gameIsOpen, closeGame, GICON, GINFO, myTurns, chatGamesSheet, chatGameFlag } from './games.js';

// ================= أدوات =================
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  send: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  reply: svg('<path d="M9.5 7 4.5 12l5 5M4.5 12h10a5 5 0 0 1 5 5v1"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>'),
  download: svg('<path d="M12 4.5v10M7.5 10.5l4.5 4.5 4.5-4.5M5 19.5h14"/>'),
  info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>'),
  trash: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/>'),
  users: svg('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6"/><circle cx="16.8" cy="9.3" r="2.5"/><path d="M16.3 14.8c2.1 0 3.6 1.2 4.3 3.6"/>'),
  check: svg('<path d="M5 12.5 10 17.5 19 7"/>'),
  sliders: svg('<path d="M4 7h9M18 7h2M4 17h3M12 17h8"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="9.5" cy="17" r="2.3"/>'),
  pen: svg('<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="m13 7 4 4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  logout: svg('<path d="M10 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H10M14.5 8l4 4-4 4M18.5 12H9.5"/>'),
  bell: svg('<path d="M6 16.5v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>'),
  install: svg('<rect x="6.5" y="2.5" width="11" height="19" rx="2.8"/><path d="M12 7.5v6.5M9.3 11.5 12 14.2l2.7-2.7"/>'),
  moon: svg('<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>'),
  mail: svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  play: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1.2"/><rect x="13.5" y="5.5" width="4" height="13" rx="1.2"/></svg>',
  clock: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>'),
  image: svg('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="m4 17.5 5-4.5 4 3.5 3-2.5 4.5 3.5"/>'),
  camera: svg('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.3" r="3.4"/>'),
  chat: svg('<path d="M4 11.5C4 7.4 7.6 4.5 12 4.5s8 2.9 8 7-3.6 7-8 7c-1 0-2-.2-2.9-.5L5 19.5l1.2-3.4A6.6 6.6 0 0 1 4 11.5z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  sparkle: svg('<path d="M12 3.5 13.8 10 20.5 12l-6.7 2-1.8 6.5-1.8-6.5L3.5 12l6.7-2z"/>'),
  out: svg('<path d="M7 17 17 7M9.5 7H17v7.5"/>'),
  in: svg('<path d="M17 7 7 17M14.5 17H7V9.5"/>'),
  chevron: svg('<path d="m14.5 6-6 6 6 6"/>'),
  share: svg('<path d="M12 15V3.5M8 7.5l4-4 4 4M6.5 11H5.5v9h13v-9h-1"/>'),
  back: svg('<path d="m9 5 7 7-7 7"/>'),
  forward: svg('<path d="M14.5 6.5 20 12l-5.5 5.5M20 12H10a6 6 0 0 0-6 6v.5"/>'),
  star: svg('<path d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>'),
  starFill: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><path d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/></svg>',
  timer: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9.5 3h5"/>'),
  bellOff: svg('<path d="M6 16.5v-5a6 6 0 0 1 9.5-4.9M18 11.5v5l1.5 2H8M10 20.5a2 2 0 0 0 4 0M4 4l16 16"/>'),
  block: svg('<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  user: svg('<circle cx="12" cy="9" r="3.6"/><path d="M5 19.5c1.3-3 3.9-4.5 7-4.5s5.7 1.5 7 4.5"/>'),
  userPlus: svg('<circle cx="10" cy="9" r="3.4"/><path d="M3.5 19.5c1.2-2.9 3.6-4.4 6.5-4.4s5.3 1.5 6.5 4.4M18.5 8v6M15.5 11h6"/>'),
  palette: svg('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.3-1-1.5-1-2.7 0-1 .8-1.6 1.8-1.6h2.2a3.5 3.5 0 0 0 3.5-3.5C20.5 7 16.7 3.5 12 3.5z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.3" r="1.2"/><circle cx="15" cy="7.8" r="1.2"/>'),
  broom: svg('<path d="M14 4 9.5 13M6 13.5h7.5l2 6.5h-11.5zM8.5 20l.6-3M12 20l-.2-3"/>'),
  card: svg('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16.3c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h3.5M14.5 13.5h3"/>'),
  speaker: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  minimize: svg('<path d="M4.5 19.5 10 14M10 14H5.5M10 14v4.5M19.5 4.5 14 10M14 10h4.5M14 10V5.5"/>'),
  more: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  del: svg('<path d="M20 6.5H9l-5.5 5.5L9 17.5h11zM12.5 9.5l5 5M17.5 9.5l-5 5"/>'),
  mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
  phone: svg('<path d="M6.6 3.8 9 3.5l1.6 4-2 1.5a11 11 0 0 0 6.4 6.4l1.5-2 4 1.6-.3 2.4a2 2 0 0 1-2 1.7A15.6 15.6 0 0 1 4.9 5.8a2 2 0 0 1 1.7-2z"/>'),
  video: svg('<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3z"/>'),
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOC = 'ar-u-ca-gregory-nu-latn';
const fTime = new Intl.DateTimeFormat(LOC, { hour: 'numeric', minute: '2-digit' });
const fWeek = new Intl.DateTimeFormat(LOC, { weekday: 'long' });
const fDate = new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'long', year: 'numeric' });
const fShort = new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'numeric' });
const ts = (x) => (typeof x === 'number' ? x : Date.parse(x));
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const DAY = 864e5;
function dayLabel(t) {
  const now = Date.now();
  if (sameDay(t, now)) return 'اليوم';
  if (sameDay(t, now - DAY)) return 'أمس';
  if (now - t < 6 * DAY) return fWeek.format(t);
  return fDate.format(t);
}
function listTime(t) {
  if (!t) return '';
  t = ts(t);
  const now = Date.now();
  if (sameDay(t, now)) return fTime.format(t);
  if (sameDay(t, now - DAY)) return 'أمس';
  if (now - t < 6 * DAY) return fWeek.format(t);
  return fShort.format(t);
}
const dur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
function lastSeen(t) {
  if (!t) return '';
  t = ts(t);
  if (Date.now() - t < 90e3) return 'متصل قبل شوي';
  const d = sameDay(t, Date.now()) ? 'اليوم' : sameDay(t, Date.now() - DAY) ? 'أمس' : fShort.format(t);
  return `آخر ظهور ${d} ${fTime.format(t)}`;
}
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), ms);
}
function linkify(s) {
  return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
// الدخول برقم الجوال أو بالإيميل
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
function phoneFromEmail(email) {
  const e = String(email || '');
  return e.endsWith('@' + CONFIG.AUTH_DOMAIN) ? e.split('@')[0] : '';
}
function normPhone(s) {
  s = String(s || '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/\D/g, '');
  if (s.startsWith('00')) s = s.slice(2);
  if (s.length === 10 && s.startsWith('05')) s = '966' + s.slice(1);
  if (s.length === 9 && s.startsWith('5')) s = '966' + s;
  return s;
}
const COLORS = ['#9E2B25', '#C8932E', '#2E7D6B', '#3B5BA5', '#7A4E9E', '#B4572F', '#5E7D2E', '#A23D6E'];
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const touch = matchMedia('(pointer: coarse)').matches;
const KEYSLOT = 'lamma-key:' + CONFIG.SUPABASE_URL;

// ================= سجل الأخطاء (تشوفه من الإعدادات وترسله) =================
const APP_VER = '1.9.2';
const LOGK = 'lamma-log';
function logErr(kind, msg) {
  try {
    const arr = JSON.parse(localStorage.getItem(LOGK) || '[]');
    const t = String(msg || '').slice(0, 400);
    if (arr.length && arr[arr.length - 1].m === t) { arr[arr.length - 1].n = (arr[arr.length - 1].n || 1) + 1; }
    else arr.push({ t: Date.now(), k: kind, m: t });
    localStorage.setItem(LOGK, JSON.stringify(arr.slice(-60)));
  } catch (e) { /* ignore */ }
}
addEventListener('error', (e) => logErr('خطأ', `${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => logErr('وعد', e.reason?.message || e.reason?.name || String(e.reason)));
{
  const ce = console.error.bind(console);
  console.error = (...a) => { logErr('سجل', a.map((x) => (x?.message || (typeof x === 'object' ? JSON.stringify(x) : String(x)))).join(' ')); ce(...a); };
}

// ================= الحالة =================
const S = {
  me: null, key: null,
  members: new Map(), chats: [], open: null, reply: null,
  stories: [], seen: new Set(), views: new Map(),
  online: new Set(), typing: new Map(),
  tab: 'chats', filter: '',
  blocked: new Set(), stars: new Set(), unlocked: new Set(),
};
let sb;

function show(id) {
  for (const s of ['boot', 'auth', 'family', 'main']) $('#' + s).classList.toggle('hidden', s !== id);
}

// ================= الثيم =================
// الألوان القابلة للتغيير (كل لون له نسخة فاتحة وداكنة)
const ACCENTS = {
  green: { n: 'أخضر', l: '#1DAA61', d: '#25D366', ol: '#FFFFFF', od: '#0B0B0B' },
  blue: { n: 'أزرق', l: '#0A7CFF', d: '#3B9BFF', ol: '#FFFFFF', od: '#FFFFFF' },
  sadu: { n: 'سدو', l: '#9E2B25', d: '#E0645A', ol: '#FFFFFF', od: '#FFFFFF' },
  purple: { n: 'بنفسجي', l: '#7A4E9E', d: '#B08BE0', ol: '#FFFFFF', od: '#0B0B0B' },
  gold: { n: 'ذهبي', l: '#B07A12', d: '#E8B64C', ol: '#FFFFFF', od: '#0B0B0B' },
  pink: { n: 'وردي', l: '#C2416F', d: '#F06292', ol: '#FFFFFF', od: '#0B0B0B' },
  teal: { n: 'فيروزي', l: '#0F8B8D', d: '#2CC4C7', ol: '#FFFFFF', od: '#0B0B0B' },
};
const MINE = {
  green: { l: '#D9FDD3', d: '#144D37' }, blue: { l: '#DCEBFF', d: '#1D3A5C' }, sadu: { l: '#F6DCC8', d: '#5A2620' },
  purple: { l: '#ECE0F7', d: '#3E2A55' }, gold: { l: '#FBEBC8', d: '#4A3816' }, pink: { l: '#FBE0EA', d: '#56243A' },
  gray: { l: '#E9E9EB', d: '#2C2C2E' },
};
const THEIRS = {
  white: { l: '#FFFFFF', d: '#1F1F21' }, gray: { l: '#F0F0F2', d: '#2A2A2D' }, sand: { l: '#FFF8EE', d: '#2A221C' },
  mist: { l: '#EAF0F6', d: '#1E2730' }, mint: { l: '#EFFAF3', d: '#17241C' },
};
function colorPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('lamma-colors') || '{}'); } catch (e) { /* ignore */ }
  return { accent: 'green', mine: 'green', theirs: 'white', ...p };
}
function themeMode() { try { return localStorage.getItem('lamma-theme') || 'dark'; } catch (e) { return 'dark'; } }
const isDark = () => { const m = themeMode(); return m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); };
function applyColors() {
  const p = colorPrefs(), d = isDark(), st = document.documentElement.style;
  const a = ACCENTS[p.accent] || ACCENTS.green;
  st.setProperty('--primary', d ? a.d : a.l);
  st.setProperty('--on-primary', d ? a.od : a.ol);
  st.setProperty('--mine', (MINE[p.mine] || MINE.green)[d ? 'd' : 'l']);
  st.setProperty('--theirs', (THEIRS[p.theirs] || THEIRS.white)[d ? 'd' : 'l']);
}
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('lamma-theme', t); } catch (e) { /* ignore */ }
  applyColors();
}
applyTheme(themeMode());
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyColors); } catch (e) { /* ignore */ }

// ================= الكيبورد في الآيفون =================
// الآيفون لما يطلع الكيبورد يزحلق الصفحة كلها لفوق. هنا نرجّعها مكانها
// ونخلي شاشة المحادثة بطول المساحة اللي فوق الكيبورد بالضبط
function fitViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  const msgs = $('#msgs');
  let raf = 0, lastH = 0, nearBottom = true;
  msgs.addEventListener('scroll', () => { nearBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80; }, { passive: true });
  const editing = () => { const a = document.activeElement; return !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(checkbox|radio|file|button|submit|range|color)$/i.test(a.type)) || a.isContentEditable); };
  const apply = () => {
    raf = 0;
    if (window.scrollY || root.scrollTop || document.body.scrollTop) window.scrollTo(0, 0);
    // iOS 26 فيه خلل: بعد ما ينزل الكيبورد يظل يحسب الشاشة أقصر. فإذا ما فيه كتابة، نرجّع الشاشة كاملة ونتجاهل أرقامه
    if (!editing()) {
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vvt');
      // وفيه خلل ثاني: التطبيق المثبّت أحياناً ما يوصل لآخر الشاشة (يبقى شريط أسود تحت خارج التطبيق).
      // في هالحالة المسافة المحجوزة لخط الآيفون اللي تحت ما لها داعي، فنشيلها عشان شريط الكتابة والتبويبات ينزلون
      const gap = standalone ? Math.round((screen.height || 0) - window.innerHeight) : 0;
      if (gap > 20 && gap < 160 && Math.abs((screen.width || 0) - window.innerWidth) < 4) root.style.setProperty('--safe-b', '4px');
      else root.style.removeProperty('--safe-b');
      document.body.classList.remove('kb');
      lastH = 0;
      return;
    }
    const h = Math.round(vv.height);
    const top = Math.max(0, Math.round(vv.offsetTop));
    const kb = window.innerHeight - h > 140;
    root.style.setProperty('--vvh', h + 'px');
    root.style.setProperty('--vvt', top + 'px');
    document.body.classList.toggle('kb', kb);
    if (h !== lastH) {
      const grew = lastH && h > lastH;
      lastH = h;
      // لما الكيبورد يطلع، خل آخر رسالة باينة (إذا كنت أصلاً تحت)
      if (S.open && nearBottom && !grew) requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
    }
  };
  const q = () => { if (!raf) raf = requestAnimationFrame(apply); };
  vv.addEventListener('resize', q);
  vv.addEventListener('scroll', q);
  addEventListener('scroll', q, { passive: true });
  addEventListener('focusout', () => { [60, 300, 700].forEach((t) => setTimeout(q, t)); });
  addEventListener('focusin', () => { [60, 300, 600].forEach((t) => setTimeout(q, t)); });
  // والكيبورد طالع: السحب على أي مكان ما ينسحب (يمنع الشاشة تطلع وتعلق)، إلا الأماكن اللي تنسحب أصلاً
  addEventListener('touchmove', (e) => {
    if (!document.body.classList.contains('kb')) return;
    if (e.target.closest?.('.msgs, .sheet, textarea, .pane, .game-body, .info-body, #game, #info, .sv-foot')) return;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  apply();
}

// ================= البداية =================
async function boot() {
  document.title = CONFIG.APP_NAME;
  if (CONFIG.SUPABASE_URL.includes('YOUR-PROJECT')) {
    $('#bootMsg').innerHTML = 'عدّل ملف <b>js/config.js</b> وحط رابط ومفتاح Supabase';
    return;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  fitViewport();
  unlockAudio();
  bindTapSounds();
  sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  // رابط «نسيت كلمة المرور» من الإيميل يرجع هنا
  sb.auth.onAuthStateChange?.((event) => { if (event === 'PASSWORD_RECOVERY') setTimeout(newPasswordSheet, 300); });
  const { data } = await sb.auth.getSession();
  if (!data.session) return showAuth();
  S.me = data.session.user.id;
  S.phone = phoneFromEmail(data.session.user.email);
  await afterLogin();
}

async function afterLogin() {
  $('#bootMsg').textContent = 'جاري التحميل…';
  show('boot');
  const { data: st, error } = await sb.rpc('family_status');
  if (error) {
    $('#bootMsg').textContent = 'ما قدرنا نوصل للسيرفر. تأكد إنك شغّلت ملف setup.sql';
    console.error(error);
    return;
  }
  if (!st.member) return showFamily(st.exists ? 'join' : 'create');
  let raw = null;
  try { raw = localStorage.getItem(KEYSLOT); } catch (e) { /* ignore */ }
  if (raw) {
    try {
      const key = await importKey(raw);
      await decJSON(key, st.enc_check);
      S.key = key;
      return start();
    } catch (e) { /* المفتاح المحفوظ غلط */ }
  }
  showFamily('unlock', st.enc_check);
}

// ---------- الدخول ----------
function showAuth() {
  show('auth');
  let mode = 'in';
  $('#authSeg').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    mode = b.dataset.m;
    $$('#authSeg button').forEach((x) => x.classList.toggle('on', x === b));
    $('#authBtn').textContent = mode === 'in' ? 'دخول' : 'إنشاء حساب';
    $('#forgotBtn').classList.toggle('hidden', mode !== 'in');
    $('#pass').autocomplete = mode === 'in' ? 'current-password' : 'new-password';
    $('#authErr').textContent = '';
  };
  $('#forgotBtn').onclick = async () => {
    const v = $('#phone').value.trim();
    if (!isEmail(v)) {
      $('#authErr').textContent = isEmail(v) || v.includes('@') ? 'اكتب إيميلك صح'
        : 'استرجاع كلمة المرور يشتغل للحسابات اللي بالإيميل بس. لو حسابك بالجوال، اطلب من صاحب التطبيق يمسح حسابك من Supabase وسجّل من جديد';
      return;
    }
    const { error } = await sb.auth.resetPasswordForEmail(v.toLowerCase(), { redirectTo: location.origin + location.pathname });
    $('#authErr').textContent = error ? (/rate/i.test(error.message) ? 'طلبات كثيرة، جرّب بعد ساعة' : 'ما قدرنا نرسل الرابط') : '';
    if (!error) toast('أرسلنا رابط لإيميلك. افتحه من نفس الجوال', 4500);
  };
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault();
    const raw = $('#phone').value.trim();
    const password = $('#pass').value;
    const byEmail = raw.includes('@');
    const phone = byEmail ? '' : normPhone(raw);
    if (byEmail && !isEmail(raw)) return ($('#authErr').textContent = 'اكتب إيميل صحيح، مثل name@gmail.com');
    if (!byEmail && phone.length < 8) return ($('#authErr').textContent = 'اكتب رقم جوال صحيح أو إيميل');
    if (password.length < 6) return ($('#authErr').textContent = 'كلمة المرور 6 خانات على الأقل');
    const email = byEmail ? raw.toLowerCase() : `${phone}@${CONFIG.AUTH_DOMAIN}`;
    $('#authBtn').disabled = true;
    $('#authErr').textContent = '';
    const r = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    $('#authBtn').disabled = false;
    if (r.error) {
      const m = r.error.message || '';
      $('#authErr').textContent =
        /invalid login/i.test(m) ? (byEmail ? 'الإيميل أو كلمة المرور غلط' : 'الرقم أو كلمة المرور غلط')
        : /already registered|already exists/i.test(m) ? (byEmail ? 'الإيميل مسجّل من قبل، اختر «دخول»' : 'الرقم مسجّل من قبل، اختر «دخول»')
        : /invalid.*email|email.*invalid/i.test(m) ? 'الإيميل غير مقبول، جرّب إيميل ثاني'
        : /rate limit/i.test(m) ? 'محاولات كثيرة، جرّب بعد دقائق'
        : /signups not allowed/i.test(m) ? 'التسجيل مقفل من إعدادات Supabase'
        : m;
      return;
    }
    if (!r.data.session) {
      $('#authErr').textContent = 'لازم تطفي «Confirm email» من إعدادات Supabase (شوف الدليل)';
      return;
    }
    S.me = r.data.session.user.id;
    S.phone = phone;
    afterLogin();
  };
}

function newPasswordSheet() {
  openSheet(`<h3>كلمة مرور جديدة</h3><div class="form">
    <label>كلمة المرور الجديدة<input id="np1" type="password" autocomplete="new-password" minlength="6"></label>
    <label>أعد كتابتها<input id="np2" type="password" autocomplete="new-password"></label>
    <button class="btn" id="npGo">حفظ</button></div>`);
  $('#npGo').onclick = async () => {
    const a = $('#np1').value, b = $('#np2').value;
    if (a.length < 6) return toast('6 خانات على الأقل');
    if (a !== b) return toast('الكلمتين مو متطابقتين');
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) return toast('ما تغيّرت، جرّب مرة ثانية');
    closeSheet();
    toast('تم تغيير كلمة المرور');
    if (!S.me) location.reload();
  };
}

// ---------- العائلة ----------
function showFamily(mode, encCheck) {
  show('family');
  const t = {
    create: ['أنشئ عائلتك', 'أنت أول واحد! اختر كلمة سر للعائلة وأعطها لأهلك', 'إنشاء العائلة'],
    join: ['انضم لعائلتك', 'اكتب كلمة سر العائلة اللي أعطاك إياها أهلك', 'انضمام'],
    unlock: ['أهلاً من جديد', 'اكتب كلمة سر العائلة لفتح الرسائل على هذا الجهاز', 'فتح'],
  }[mode];
  $('#famTitle').textContent = t[0];
  $('#famSub').textContent = t[1];
  $('#famBtn').textContent = t[2];
  $('#famNameL').classList.toggle('hidden', mode === 'unlock');
  $('#famPass2L').classList.toggle('hidden', mode !== 'create');
  $('#famHint').classList.toggle('hidden', mode === 'unlock');
  $('#famOut').onclick = logout;
  $('#famForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#famName').value.trim();
    const pass = $('#famPass').value;
    const err = (m) => { $('#famErr').textContent = m; $('#famBtn').disabled = false; $('#famErr').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    if (mode !== 'unlock' && !name) return err('اكتب اسمك');
    if (mode === 'create' && pass.trim().length < 8) return err('كلمة سر العائلة 8 خانات على الأقل');
    if (mode === 'create' && pass !== $('#famPass2').value) return err('كلمتا السر مو متطابقتين');
    if (!pass.trim()) return err('اكتب كلمة سر العائلة');
    $('#famBtn').disabled = true;
    $('#famErr').textContent = '';
    $('#famBtn').textContent = 'لحظة…';
    try {
      const { raw, token } = await deriveFromPassphrase(pass);
      const key = await importKey(raw);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      if (mode === 'create') {
        const check = await encJSON(key, { ok: 'lamma' });
        const { error } = await sb.rpc('create_family', { token, check_value: check, my_name: name, my_phone: S.phone, my_color: color });
        if (error) throw new Error(/exists/.test(error.message) ? 'العائلة موجودة، ارجع وانضم لها' : error.message);
      } else if (mode === 'join') {
        const { error } = await sb.rpc('join_family', { token, my_name: name, my_phone: S.phone, my_color: color });
        if (error) throw new Error(/wrong/.test(error.message) ? 'كلمة سر العائلة غلط' : error.message);
      } else {
        try { await decJSON(key, encCheck); } catch (x) { throw new Error('كلمة سر العائلة غلط'); }
      }
      try { localStorage.setItem(KEYSLOT, raw); } catch (x) { /* ignore */ }
      S.key = key;
      $('#famPass').value = $('#famPass2').value = '';
      start();
    } catch (x) {
      $('#famBtn').textContent = t[2];
      err(x.message || 'صار خطأ');
    }
  };
}

async function logout() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub && S.me) { await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  } catch (e) { /* ignore */ }
  try { localStorage.removeItem(KEYSLOT); } catch (e) { /* ignore */ }
  await sb.auth.signOut();
  location.reload();
}

// ================= تشغيل التطبيق =================
async function start() {
  show('boot');
  sb.rpc('purge_expired').then(() => {}, () => {});
  initGames({
    sb, me: () => S.me, members: () => S.members, chats: () => S.chats, chatOf, chatName, nameOf, short, avatar, chatAvatar, esc, toast,
    openSheet, closeSheet, sendTo, notify, hydrate, ICON, listTime, memberRows, openDirect,
    openChat: (id) => openChat(id), tab: () => S.tab, onBadge: () => badge(), sfx, confetti, ask,
    isHere: (uid) => S.online.has(uid), mediaError, inCall, voicePill: setPill, haptic,
  });
  await Promise.all([loadMembers(), loadChats(), loadStories(), loadBlocks(), loadGames()]);
  show('main');
  renderList();
  renderStories();
  renderSettings();
  bindMain();
  subscribe();
  presence();
  initCalls({
    sb, me: S.me, toast, hydrate, mediaError,
    member: (id) => S.members.get(id),
    avatar: (id, cls) => avatar(id, cls),
    notify,
    logCall: (chatId, c) => sendTo(chatId, 'call', { c }),
    isBlocked: (id) => S.blocked.has(id),
    openChat: (id) => { if (id && S.open?.id !== id) openChat(id); },
    menu: (items) => openSheet(items.map((it, i) => `<button class="act" data-i="${i}">${esc(it.label)}</button>`).join(''), (e) => {
      const i = e.target.closest('[data-i]')?.dataset.i;
      if (i === undefined) return;
      closeSheet();
      items[i].run();
    }),
  });
  setupPush(false);
  installTip();
  touchSeen();
  setInterval(touchSeen, 120e3);
  const q = new URLSearchParams(location.search).get('chat');
  if (q) { history.replaceState(null, '', location.pathname); openChat(q); }
  navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.open) openChat(e.data.open); });
}

async function loadBlocks() {
  const { data } = await sb.from('blocks').select('blocked').eq('blocker', S.me);
  S.blocked = new Set((data || []).map((r) => r.blocked));
}
async function loadMembers() {
  const { data } = await sb.from('members').select('*');
  S.members = new Map((data || []).map((m) => [m.id, m]));
}

async function decSafe(body) {
  try { return await decJSON(S.key, body); } catch (e) { return { t: 'ما قدرنا نفك تشفير الرسالة', bad: 1 }; }
}

async function loadChats() {
  const { data, error } = await sb.rpc('my_chats');
  if (error) { console.error(error); return; }
  S.chats = await Promise.all((data || []).map(async (c) => ({
    id: c.id, name: c.name, emoji: c.emoji, is_direct: c.is_direct, other: c.other,
    last_at: c.last_at, unread: Number(c.unread) || 0,
    photo: c.photo, ttl: c.ttl_seconds, muted_until: c.muted_until, role: c.role,
    last: c.last_id ? { id: c.last_id, sender: c.last_sender, kind: c.last_kind, created_at: c.last_time, b: await decSafe(c.last_body) } : null,
  })));
  // محادثات خاصة فاضية ما نعرضها
  S.chats = S.chats.filter((c) => !c.is_direct || c.last || S.open?.id === c.id);
  sortChats();
  badge();
}
const sortChats = () => S.chats.sort((a, b) => ts(b.last_at) - ts(a.last_at));
function chatOf(id) { return S.chats.find((c) => c.id === id); }
function chatName(c) { return c.is_direct ? (S.members.get(c.other)?.name || 'فرد من العائلة') : (c.name || 'قروب'); }
function nameOf(id) { return id === S.me ? 'أنت' : (S.members.get(id)?.name || 'فرد من العائلة'); }
// الاسم المختصر: "أم فهد" تبقى كاملة، "محمد العتيبي" تصير "محمد"
function short(id) {
  const w = nameOf(id).trim().split(/\s+/);
  return /^(أبو|ابو|أم|ام|بو|عبد|عبدال)$/.test(w[0]) && w[1] ? w[0] + ' ' + w[1] : w[0];
}

// ================= الصور الرمزية والوسائط =================
function avatar(id, cls = '', online = false) {
  const m = S.members.get(id);
  const init = esc([...(m?.name || '؟').replace(/^(أبو|ابو|أم|ام)\s+/, '')][0] || '؟');
  return `<span class="av ${cls}" style="background:${esc(m?.color || '#8B7766')}">${m?.avatar ? `<img data-media="${esc(m.avatar)}" data-type="image/jpeg" alt="">` : init}${online ? '<i class="on"></i>' : ''}</span>`;
}
function chatAvatar(c, cls = '') {
  if (c.is_direct) return avatar(c.other, cls, S.online.has(c.other));
  if (c.photo) return `<span class="av group ${cls}" style="background:${hashColor(c.id)}"><img data-media="${esc(c.photo)}" data-type="image/jpeg" alt=""></span>`;
  return `<span class="av group ${cls}" style="background:${hashColor(c.id)}">${ICON.users}</span>`;
}

const mediaCache = new Map();
function loadMedia(path, type) {
  if (!mediaCache.has(path)) {
    mediaCache.set(path, (async () => {
      let enc;
      const cacheKey = new Request(location.origin + '/__media/' + path);
      try {
        const box = await caches.open('lamma-media');
        const hit = await box.match(cacheKey);
        if (hit) enc = await hit.arrayBuffer();
        else {
          const { data, error } = await sb.storage.from('media').download(path);
          if (error) throw error;
          enc = await data.arrayBuffer();
          box.put(cacheKey, new Response(enc.slice(0))).catch(() => {});
        }
      } catch (e) {
        if (!enc) {
          const { data, error } = await sb.storage.from('media').download(path);
          if (error) throw error;
          enc = await data.arrayBuffer();
        }
      }
      const plain = await decBytes(S.key, enc);
      return URL.createObjectURL(new Blob([plain], type ? { type } : {}));
    })());
    mediaCache.get(path).catch(() => mediaCache.delete(path));
  }
  return mediaCache.get(path);
}
function hydrate(root = document) {
  $$('img[data-media]:not([data-ok])', root).forEach((img) => {
    img.dataset.ok = '1';
    loadMedia(img.dataset.media, img.dataset.type).then((u) => { img.src = u; }).catch(() => { img.alt = ''; });
  });
}
const newPath = () => `${S.me}/${crypto.randomUUID()}`;
async function uploadTo(path, blob) {
  const enc = await encBytes(S.key, await blob.arrayBuffer());
  const { error } = await sb.storage.from('media').upload(path, new Blob([enc], { type: 'application/octet-stream' }), { contentType: 'application/octet-stream' });
  if (error) throw error;
}
async function compressImage(file, max = 1600, q = 0.82) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {
    try { bmp = await createImageBitmap(file); } catch (e2) {
      // بعض صيغ الآيفون: نفكها عن طريق عنصر صورة
      const url = URL.createObjectURL(file);
      bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
  return { blob, w, h };
}

// ================= قائمة المحادثات =================
const tick = (cls) => `<svg class="tk ${cls}" viewBox="0 0 20 12" aria-hidden="true"><path d="M1.5 6.5 5 10l7-8.5${cls.includes('two') ? 'M8.5 9.6l.4.4 7-8.5' : ''}"/></svg>`;
function kindIcon(kind, b) {
  if (kind === 'image') return ICON.image;
  if (kind === 'voice') return ICON.mic;
  if (kind === 'call') return b?.c?.v ? ICON.video : ICON.phone;
  if (kind === 'story') return ICON.reply;
  if (kind === 'contact') return ICON.user;
  if (kind === 'game') return GICON[b?.k] || GICON.pad;
  return '';
}
function previewHTML(kind, b, sender, isGroup) {
  const who = isGroup && sender && kind !== 'call' && kind !== 'system' ? `<em>${esc(sender === S.me ? 'أنت' : short(sender))}:</em> ` : '';
  const ic = !b?.bad ? kindIcon(kind, b) : ICON.lock;
  const missed = kind === 'call' && b?.c?.st !== 'ok';
  return `${who}${ic ? `<i class="pv${missed ? ' miss' : ''}">${ic}</i>` : ''}${esc(preview(kind, b))}`;
}
function emptyState(icon, text, sub = '') {
  return `<div class="empty"><span class="empty-ic">${icon}</span><b>${text}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
}
const GROUP_COLORS = ['#9E2B25', '#2E7D6B', '#3B5BA5', '#7A4E9E', '#B4572F', '#5E7D2E', '#A23D6E', '#C8932E'];
const hashColor = (id) => GROUP_COLORS[[...String(id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % GROUP_COLORS.length];

// إشعار داخل التطبيق ينزل من فوق
function banner({ uid, title, html, chat }) {
  const el = $('#banner');
  el.innerHTML = `${avatar(uid, 'sm')}<div class="bn"><div class="bn-top"><b>${esc(title)}</b><time>الآن</time></div><p>${html}</p></div>`;
  hydrate(el);
  el.style.transform = '';
  el.classList.add('show');
  try { navigator.vibrate?.(25); } catch (e) { /* ignore */ }
  const hide = () => { el.classList.remove('show'); el.style.transform = ''; };
  clearTimeout(banner.t);
  banner.t = setTimeout(hide, 4500);
  let sy = 0, dy = 0, on = false;
  el.onpointerdown = (e) => { on = true; sy = e.clientY; dy = 0; el.style.transition = 'none'; clearTimeout(banner.t); };
  el.onpointermove = (e) => { if (!on) return; dy = Math.min(0, e.clientY - sy); el.style.transform = `translateY(${dy}px)`; };
  el.onpointerup = el.onpointercancel = (e) => {
    if (!on) return;
    on = false;
    el.style.transition = '';
    if (dy < -30) return hide();
    el.style.transform = '';
    if (e.type === 'pointerup' && dy > -6) { hide(); if (chat) openChat(chat); return; }
    banner.t = setTimeout(hide, 3000);
  };
}

// اسحب لتحت عشان تقفل (القصص والصور)
function swipeDown(v, { onTap, onStart, onEnd } = {}) {
  let sy = 0, t0 = 0, dy = 0, on = false;
  v.onpointerdown = (e) => {
    if (e.target.closest('button,input,textarea')) return;
    on = true; sy = e.clientY; t0 = Date.now(); dy = 0;
    v.style.transition = 'none';
    onStart?.();
  };
  v.onpointermove = (e) => {
    if (!on) return;
    dy = Math.max(0, e.clientY - sy);
    if (dy > 4) { v.style.transform = `translateY(${dy}px) scale(${Math.max(0.86, 1 - dy / 1600)})`; v.style.borderRadius = '28px'; }
  };
  const end = (e, cancel) => {
    if (!on) return;
    on = false;
    v.style.transition = 'transform .24s ease, opacity .24s ease, border-radius .24s';
    if (dy > 90) { v.style.transform = 'translateY(100%)'; v.style.opacity = '0'; setTimeout(() => history.back(), 200); return; }
    v.style.transform = ''; v.style.borderRadius = '';
    onEnd?.();
    if (!cancel && dy < 8 && Date.now() - t0 < 300) onTap?.(e);
  };
  v.onpointerup = (e) => end(e);
  v.onpointercancel = (e) => end(e, true);
}
function preview(kind, b, sender, isGroup) {
  let t;
  if (b?.bad) t = b.t;
  else if (kind === 'image') t = b.t || 'صورة';
  else if (kind === 'voice') t = 'رسالة صوتية ' + dur(b.m?.d || 0);
  else if (kind === 'call') t = (b.c?.v ? 'مكالمة فيديو' : 'مكالمة صوتية') + (b.c?.st === 'ok' ? ' · ' + dur(b.c.d) : b.c?.st === 'declined' ? ' مرفوضة' : ' فائتة');
  else if (kind === 'story') t = b.t || 'رد على قصة';
  else if (kind === 'contact') t = 'جهة اتصال: ' + (b.ct?.n || '');
  else if (kind === 'game') t = (GINFO[b.k]?.n || 'لعبة') + (b.t && b.t !== GINFO[b.k]?.n ? ': ' + b.t : '');
  else t = b?.t || '';
  if (isGroup && sender && kind !== 'call') t = (sender === S.me ? 'أنت' : short(sender)) + ': ' + t;
  return t;
}
function listTick(c) { return c.last?.pending ? '' : `<i class="pv">${tick('two')}</i>`; }
function typingIn(chatId) {
  const now = Date.now();
  const who = [];
  for (const [k, at] of S.typing) {
    const [c, u] = k.split(':');
    if (c === chatId && u !== S.me && now - at < 4000) who.push(u);
  }
  return who;
}
function renderList() {
  const ul = $('#chatList');
  const f = S.filter.trim();
  const rows = S.chats.filter((c) => {
    if (!f) return true;
    return chatName(c).includes(f) || (c.last && preview(c.last.kind, c.last.b).includes(f));
  });
  if (!rows.length) {
    ul.innerHTML = `<li>${f ? emptyState(ICON.search, 'ما فيه نتائج') : emptyState(ICON.chat, 'ما فيه محادثات بعد', 'اضغط زر الإضافة فوق وابدأ أول محادثة')}</li>`;
    return;
  }
  ul.innerHTML = rows.map((c) => {
    const ty = typingIn(c.id);
    const locked = isLocked(c.id);
    const muted = isMuted(c);
    const sub = locked
      ? `<span><i class="pv">${ICON.lock}</i>محادثة مقفلة</span>`
      : ty.length
        ? `<span class="typing">${c.is_direct ? 'يكتب…' : esc(short(ty[0])) + ' يكتب…'}</span>`
        : `<span>${c.last ? (c.last.sender === S.me && !['call', 'system'].includes(c.last.kind) ? listTick(c) : '') + previewHTML(c.last.kind, c.last.b, c.last.sender, !c.is_direct) : '<i>لا توجد رسائل بعد</i>'}</span>`;
    const flags = (muted ? ICON.bellOff : '') + (c.ttl ? ICON.timer : '');
    return `<li class="row chatrow${c.unread ? ' unread' : ''}" data-id="${c.id}">
      ${chatAvatar(c)}
      <div class="row-main">
        <div class="row-text"><b>${esc(chatName(c))}</b>${sub}</div>
        <div class="row-side"><time>${listTime(c.last?.created_at || c.last_at)}</time>
          ${c.unread ? `<span class="count${muted ? ' muted' : ''}">${c.unread > 99 ? '99+' : c.unread}</span>` : flags ? `<span class="flags">${flags}</span>` : ''}</div>
      </div></li>`;
  }).join('');
  hydrate(ul);
}
const isMuted = (c) => !!(c && c.muted_until && ts(c.muted_until) > Date.now());
function gamesBadge() {
  const el = $('#gamesBadge');
  if (!el) return;
  const n = myTurns();
  el.textContent = n;
  el.classList.toggle('hidden', !n);
}
function badge() {
  gamesBadge();
  const n = S.chats.reduce((a, c) => a + (c.unread ? 1 : 0), 0);
  const b = $('#unreadBadge');
  b.textContent = n;
  b.classList.toggle('hidden', !n);
  try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch (e) { /* ignore */ }
}

function bindMain() {
  $('#tabs').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    S.tab = b.dataset.t;
    $('#main').dataset.tab = S.tab;
    $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    for (const p of ['chats', 'stories', 'calls', 'games', 'settings']) $('#pane-' + p).classList.toggle('hidden', p !== S.tab);
    $('#pageTitle').textContent = { chats: 'الدردشات', stories: 'القصص', calls: 'المكالمات', games: 'الألعاب', settings: 'الإعدادات' }[S.tab];
    $('#searchBar').classList.toggle('hidden', S.tab !== 'chats');
    $('#fab').classList.toggle('hidden', S.tab === 'settings' || S.tab === 'games');
    $('#camBtn').classList.toggle('hidden', S.tab === 'settings' || S.tab === 'calls' || S.tab === 'games');
    if (S.tab === 'games') renderGamesPane();
    if (S.tab === 'settings') renderSettings();
    if (S.tab === 'calls') renderCalls();
    $$('.pane').forEach((x) => { x.scrollTop = 0; });
  };
  $('#chatList').onclick = (e) => { const r = e.target.closest('.row'); if (r) openChat(r.dataset.id); };
  $('#fab').onclick = () => (S.tab === 'stories' ? addStorySheet() : S.tab === 'calls' ? callPickSheet() : newChatSheet());
  $('#camBtn').onclick = () => addStorySheet();
  $('#menuBtn').onclick = () => openSheet(`
    <button class="act" data-a="group"><span class="ic">${ICON.users}</span>قروب جديد</button>
    <button class="act" data-a="read"><span class="ic">${ICON.check}</span>اعتبر الكل مقروء</button>
    <button class="act" data-a="set"><span class="ic">${ICON.sliders}</span>الإعدادات</button>`, (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'group') return newGroupSheet();
    closeSheet();
    if (a === 'set') $('#tabs [data-t=settings]').click();
    if (a === 'read') {
      S.chats.forEach((c) => {
        if (!c.unread || !c.last) return;
        c.unread = 0;
        sb.from('chat_members').update({ last_read: c.last.created_at }).eq('chat_id', c.id).eq('user_id', S.me).then(() => {});
      });
      renderList(); badge();
    }
  });
  meTab();
  $('#searchInp').oninput = (e) => { S.filter = e.target.value; renderList(); };
  bindChat();
  addEventListener('popstate', onBack);
  document.addEventListener('visibilitychange', () => {
    // «متصل» يعني فاتح التطبيق قدامه. إذا طلع، نشيله عشان توصله الإشعارات بدل ما نحسبه موجود
    if (document.hidden) { touchSeen(); S.unlocked.clear(); try { S.pres?.untrack(); } catch (e) { /* ignore */ } return; }
    try { S.pres?.track({ at: Date.now() }); } catch (e) { /* ignore */ }
    resync();
    markRead();
  });
  addEventListener('online', () => resync(true));
}

// ================= التحديث الفوري =================
function subscribe() {
  const on = (ch, table, event, fn) => ch.on('postgres_changes', { event, schema: 'public', table }, (p) => fn(p).catch?.((e) => console.error(e)));
  const ch = sb.channel('lamma-db');
  on(ch, 'messages', 'INSERT', async (p) => onMessage(p.new));
  on(ch, 'messages', 'DELETE', async (p) => onMessageGone(p.old.id));
  on(ch, 'reactions', '*', async (p) => onReaction(p));
  on(ch, 'chat_members', '*', async (p) => onChatMember(p));
  on(ch, 'chats', 'UPDATE', async (p) => {
    const c = chatOf(p.new.id);
    if (c) {
      Object.assign(c, { name: p.new.name, emoji: p.new.emoji, photo: p.new.photo, ttl: p.new.ttl_seconds });
      renderList();
      if (S.open?.id === c.id) { S.open.chat = c; renderHeader(); }
    }
  });
  on(ch, 'members', '*', async (p) => {
    if (p.eventType === 'DELETE') S.members.delete(p.old.id);
    else S.members.set(p.new.id, p.new);
    renderList();
    if (S.open) renderHeader();
    if (S.tab === 'settings') renderSettings();
    meTab();
  });
  on(ch, 'stories', 'INSERT', async (p) => {
    if (S.stories.some((s) => s.id === p.new.id)) return;
    S.stories.push({ ...p.new, b: await decSafe(p.new.body) });
    renderStories();
  });
  on(ch, 'stories', 'DELETE', async (p) => { S.stories = S.stories.filter((s) => s.id !== p.old.id); renderStories(); });
  on(ch, 'story_views', 'INSERT', async (p) => {
    const v = p.new;
    if (v.user_id === S.me) S.seen.add(v.story_id);
    else {
      const arr = S.views.get(v.story_id) || [];
      if (!arr.some((x) => x.user_id === v.user_id)) arr.push(v);
      S.views.set(v.story_id, arr);
    }
    renderStories();
  });
  on(ch, 'games', '*', async (p) => onGameChange('games', p));
  on(ch, 'game_moves', '*', async (p) => onGameChange('game_moves', p));
  ch.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { console.warn('realtime', status); setTimeout(healRealtime, 3000); }
  });
  S.ch = ch;
}
// بعد ما يرجع الجوال من النوم، الاتصال الفوري أحياناً يكون مقطوع: نرجّعه
function healRealtime() {
  const st = S.ch?.state;
  if (!S.ch || st === 'joined' || st === 'joining') return;
  if (Date.now() - (S.healT || 0) < 8000) return;
  S.healT = Date.now();
  try { sb.removeChannel(S.ch); } catch (e) { /* ignore */ }
  subscribe();
  resync(true);
}

let resyncT = 0;
async function resync(force) {
  if (!force && Date.now() - resyncT < 4000) return;
  resyncT = Date.now();
  healRealtime();
  await loadChats();
  renderList();
  if (S.open) await loadOpenMessages(true);
  await Promise.all([loadStories(), loadGames().catch(() => {})]);
  renderStories();
  if (S.tab === 'games') renderGamesPane();
  badge();
}

async function onMessage(row) {
  let c = chatOf(row.chat_id);
  const b = await decSafe(row.body);
  if (!c) { await loadChats(); renderList(); c = chatOf(row.chat_id); if (!c) return; }
  const viewing = S.open?.id === row.chat_id && !document.hidden;
  if (!c.last || ts(row.created_at) >= ts(c.last.created_at)) {
    c.last = { id: row.id, sender: row.sender, kind: row.kind, created_at: row.created_at, b };
    c.last_at = row.created_at;
  }
  if (row.sender !== S.me && !viewing) c.unread++;
  S.typing.delete(row.chat_id + ':' + row.sender);
  sortChats();
  renderList();
  badge();
  if (S.open?.id === row.chat_id) {
    const ex = S.open.msgs.find((m) => m.id === row.id);
    if (ex) { ex.created_at = row.created_at; ex.pending = false; }
    else S.open.msgs.push({ ...row, b });
    renderMsgs(row.sender === S.me);
    markRead();
    if (row.sender !== S.me && !document.hidden && row.kind !== 'system') sfx('receive');
  } else if (row.sender !== S.me && !document.hidden && !isMuted(c)) {
    sfx('notify');
    banner({
      uid: row.sender,
      title: c.is_direct ? nameOf(row.sender) : `${nameOf(row.sender)} · ${chatName(c)}`,
      html: isLocked(c.id) ? 'رسالة جديدة في محادثة مقفلة' : previewHTML(row.kind, b),
      chat: row.chat_id,
    });
  }
}
async function onMessageGone(id) {
  if (S.open) {
    const n = S.open.msgs.length;
    S.open.msgs = S.open.msgs.filter((m) => m.id !== id);
    if (S.open.msgs.length !== n) renderMsgs();
  }
  if (S.chats.some((c) => c.last?.id === id)) { await loadChats(); renderList(); }
}
async function onReaction(p) {
  if (!S.open) return;
  const r = p.eventType === 'DELETE' ? p.old : p.new;
  if (!S.open.msgs.some((m) => m.id === r.message_id)) return;
  const map = S.open.rx.get(r.message_id) || new Map();
  if (p.eventType === 'DELETE') map.delete(r.user_id);
  else map.set(r.user_id, r.emoji);
  S.open.rx.set(r.message_id, map);
  renderMsgs();
}
async function onChatMember(p) {
  const r = p.eventType === 'DELETE' ? p.old : p.new;
  if (p.eventType === 'INSERT' && r.user_id === S.me) { await loadChats(); renderList(); return; }
  if (r.user_id === S.me && p.eventType === 'UPDATE') {
    const c = chatOf(r.chat_id);
    if (c) { c.muted_until = r.muted_until; c.role = r.role; renderList(); }
  }
  if (p.eventType === 'DELETE' && r.user_id === S.me) {
    S.chats = S.chats.filter((x) => x.id !== r.chat_id);
    renderList();
    if (S.open?.id === r.chat_id) { toast('ما عدت عضو في هذا القروب'); history.back(); }
    return;
  }
  if (S.open?.id === r.chat_id) {
    if (p.eventType === 'DELETE') { S.open.reads.delete(r.user_id); S.open.roles?.delete(r.user_id); }
    else { S.open.reads.set(r.user_id, r.last_read); if (r.role) S.open.roles?.set(r.user_id, r.role); }
    if (p.eventType !== 'UPDATE') renderHeader();
    clearTimeout(onChatMember.t);
    onChatMember.t = setTimeout(() => renderMsgs(), 150);
  }
}

// ---------- متصل / يكتب ----------
function presence() {
  S.pres = sb.channel('lamma-online', { config: { presence: { key: S.me } } });
  S.pres
    .on('presence', { event: 'sync' }, () => {
      S.online = new Set(Object.keys(S.pres.presenceState()));
      renderList();
      if (S.open) renderHeader();
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (!payload?.c || payload.u === S.me) return;
      S.typing.set(payload.c + ':' + payload.u, Date.now());
      refreshTyping();
      setTimeout(refreshTyping, 4200);
    })
    .subscribe(async (s) => { if (s === 'SUBSCRIBED') await S.pres.track({ at: Date.now() }); });
}
function refreshTyping() {
  if (S.tab === 'chats') renderList();
  if (S.open) renderHeader();
}
let typingSent = 0;
function sendTyping() {
  if (!S.open || !S.pres || Date.now() - typingSent < 2500) return;
  typingSent = Date.now();
  S.pres.send({ type: 'broadcast', event: 'typing', payload: { c: S.open.id, u: S.me } });
}
function touchSeen() {
  if (S.me) sb.from('members').update({ last_seen: new Date().toISOString() }).eq('id', S.me).then(() => {});
}

// ================= شاشة المحادثة =================
const PAGE = 60;
async function openChat(id) {
  if (isLocked(id) && !S.unlocked.has(id)) {
    if (!(await pinSheet('enter'))) return;
    S.unlocked.add(id);
  }
  let c = chatOf(id);
  if (!c) {
    await loadChats();
    c = chatOf(id);
    if (!c) {
      // محادثة خاصة جديدة بدون رسائل
      const { data } = await sb.rpc('my_chats');
      const r = (data || []).find((x) => x.id === id);
      if (!r) return toast('ما لقينا المحادثة');
      c = { id: r.id, name: r.name, emoji: r.emoji, is_direct: r.is_direct, other: r.other, last_at: r.last_at, unread: 0, last: null, photo: r.photo, ttl: r.ttl_seconds, muted_until: r.muted_until, role: r.role };
      S.chats.unshift(c);
    }
  }
  const wasOpen = !!S.open;
  if (S.open) cacheOpen();
  // لو فتحتها قبل، نعرض آخر نسخة على طول (بدون شاشة فاضية) ونحدّث من السيرفر وراها
  const cached = S.msgCache?.get(id);
  S.open = cached ? { ...cached, id, chat: c } : { id, chat: c, msgs: [], rx: new Map(), reads: new Map(), more: false };
  S.reply = null;
  $('#replyBox').classList.add('hidden');
  $('#msgInp').value = '';
  autosize();
  syncSend();
  renderHeader();
  syncComposer();
  $('#msgs').innerHTML = '';
  delete $('#msgs').dataset.chat;
  if (cached) renderMsgs(true);
  const scr = $('#chat');
  scr.classList.remove('off');
  if (!wasOpen) history.pushState({ chat: id }, '');
  await loadOpenMessages(!!cached);
  c.unread = 0;
  renderList();
  badge();
  markRead();
}
function cacheOpen() {
  const o = S.open;
  if (!o) return;
  S.msgCache = S.msgCache || new Map();
  S.msgCache.set(o.id, { msgs: o.msgs.filter((m) => !m.pending), rx: o.rx, reads: o.reads, roles: o.roles, stars: o.stars, more: o.more });
  if (S.msgCache.size > 12) S.msgCache.delete(S.msgCache.keys().next().value);
}
function closeChat() {
  if (!S.open) return;
  cacheOpen();
  S.open = null;
  stopVoice();
  $('#chat').classList.add('off');
  $('#msgInp').blur();
  renderList();
}
function onBack() {
  if (!$('#viewer').classList.contains('hidden')) { closeViewer(); return; }
  if (!$('#sheetWrap').classList.contains('hidden')) { closeSheet(); if (S.open || infoIsOpen() || gameIsOpen()) history.pushState({ keep: 1 }, ''); return; }
  if (gameIsOpen()) { closeGame(); return; }
  if (infoIsOpen()) { infoClose(); return; }
  closeChat();
}

async function loadOpenMessages(keep) {
  const o = S.open;
  const { data } = await sb.from('messages').select('*').eq('chat_id', o.id).order('created_at', { ascending: false }).limit(PAGE);
  if (S.open !== o) return;
  const rows = (data || []).reverse();
  const decoded = await Promise.all(rows.map(async (r) => ({ ...r, b: await decSafe(r.body) })));
  if (keep) {
    const pend = o.msgs.filter((m) => m.pending && !decoded.some((d) => d.id === m.id));
    o.msgs = [...decoded, ...pend];
  } else o.msgs = decoded;
  o.more = rows.length === PAGE;
  await Promise.all([loadReads(o), loadRx(o, rows.map((r) => r.id)), loadStars(o)]);
  renderMsgs(true);
}
async function loadStars(o) {
  const { data } = await sb.from('stars').select('message_id').eq('chat_id', o.id);
  o.stars = new Set((data || []).map((r) => r.message_id));
}
function syncComposer() {
  const c = S.open?.chat;
  const blocked = c && c.is_direct && S.blocked.has(c.other);
  let bar = $('#blockedBar');
  if (!bar) {
    bar = document.createElement('button');
    bar.id = 'blockedBar';
    bar.className = 'blocked-bar hidden';
    $('#composer').after(bar);
    bar.onclick = () => toggleBlock(S.open.chat.other);
  }
  bar.classList.toggle('hidden', !blocked);
  $('#composer').classList.toggle('hidden', !!blocked);
  if (blocked) bar.innerHTML = `حظرت ${esc(nameOf(c.other))}. <b>اضغط لإلغاء الحظر</b>`;
}
async function loadOlder() {
  const o = S.open;
  const first = o.msgs.find((m) => !m.pending);
  if (!first) return;
  const { data } = await sb.from('messages').select('*').eq('chat_id', o.id).lt('created_at', first.created_at).order('created_at', { ascending: false }).limit(PAGE);
  const rows = (data || []).reverse();
  const decoded = await Promise.all(rows.map(async (r) => ({ ...r, b: await decSafe(r.body) })));
  o.msgs = [...decoded, ...o.msgs];
  o.more = rows.length === PAGE;
  await loadRx(o, rows.map((r) => r.id));
  const box = $('#msgs');
  const fromBottom = box.scrollHeight - box.scrollTop;
  renderMsgs();
  box.scrollTop = box.scrollHeight - fromBottom;
}
async function loadReads(o) {
  const { data } = await sb.from('chat_members').select('user_id,last_read,role').eq('chat_id', o.id);
  o.reads = new Map((data || []).map((r) => [r.user_id, r.last_read]));
  o.roles = new Map((data || []).map((r) => [r.user_id, r.role]));
  renderHeader();
}
async function loadRx(o, ids) {
  if (!ids.length) return;
  const { data } = await sb.from('reactions').select('*').in('message_id', ids);
  for (const r of data || []) {
    const m = o.rx.get(r.message_id) || new Map();
    m.set(r.user_id, r.emoji);
    o.rx.set(r.message_id, m);
  }
}

function renderHeader() {
  const o = S.open;
  if (!o) return;
  const c = o.chat;
  let sub;
  const ty = typingIn(c.id);
  if (ty.length) sub = c.is_direct ? 'يكتب…' : ty.map((u) => short(u)).join('، ') + ' يكتب…';
  else if (c.is_direct) sub = S.online.has(c.other) ? 'متصل الآن' : lastSeen(S.members.get(c.other)?.last_seen);
  else {
    const ids = [...o.reads.keys()];
    sub = ids.length ? ids.sort((a, b) => (a === S.me) - (b === S.me)).map((u) => short(u)).join('، ') : 'اضغط لمعلومات القروب';
  }
  $('#chatWho').innerHTML = `${chatAvatar(c, 'sm')}<div><b>${esc(chatName(c))}</b><small>${c.ttl ? `<i class="pv">${ICON.timer}</i>` : ''}${esc(sub)}</small></div>`;
  hydrate($('#chatWho'));
  $('#callGroup').classList.toggle('hidden', !c.is_direct);
  $('#chatGamesDot')?.classList.toggle('hidden', !chatGameFlag(c.id));
}

function ticks(m) {
  if (m.failed) return '<span class="tk-fail">!</span>';
  if (m.pending) return `<i class="tkc">${ICON.clock}</i>`;
  const others = [...S.open.reads.entries()].filter(([u]) => u !== S.me);
  const t = ts(m.created_at);
  const read = others.filter(([, r]) => ts(r) >= t).length;
  if (others.length && read === others.length) return tick('two read');
  if (read > 0) return tick('two');
  return tick('one');
}

function msgHTML(m, prev) {
  const mine = m.sender === S.me;
  const b = m.b || {};
  const group = !S.open.chat.is_direct;
  const newDay = !prev || !sameDay(ts(prev.created_at), ts(m.created_at));
  const gap = newDay || prev.sender !== m.sender || ts(m.created_at) - ts(prev.created_at) > 5 * 60e3 || prev.kind === 'call' || prev.kind === 'system';
  const rx = S.open.rx.get(m.id);
  const rxStr = rx && rx.size ? Object.entries([...rx.values()].reduce((a, e) => ((a[e] = (a[e] || 0) + 1), a), {})).map(([e, n]) => e + (n > 1 ? n : '')).join(' ') : '';
  let out = newDay ? `<div class="day">${dayLabel(ts(m.created_at))}</div>` : '';
  if (m.kind === 'system') return out + `<div class="sys" data-id="${m.id}">${esc(b.t || '')}</div>`;
  let inner = '';
  if (b.f) inner += `<div class="fwd">${ICON.forward}محوّلة</div>`;
  if (group && !mine && gap && m.kind !== 'call') {
    inner += `<div class="who" style="color:${esc(S.members.get(m.sender)?.color || 'var(--primary)')}">${esc(nameOf(m.sender))}</div>`;
  }
  if (b.r) inner += `<div class="quote" data-jump="${esc(b.r.id)}"><b>${esc(b.r.n)}</b><span>${esc(b.r.t)}</span></div>`;
  if (m.kind === 'story' && b.s) {
    inner += `<div class="quote story-q"><i style="background:${esc(b.s.bg || '#555')}">${b.s.p ? ICON.image : ''}</i><div><b>رد على ${mine ? 'قصة ' + esc(short(S.open.chat.other)) : 'قصتك'}</b><span>${esc(b.s.t || 'صورة')}</span></div></div>`;
  }
  if (m.kind === 'image' && b.m) {
    inner += `<img class="pic" data-media="${esc(b.m.p)}" data-type="${esc(b.m.type || '')}" data-view="1" alt=""${b.m.w ? ` style="aspect-ratio:${b.m.w}/${b.m.h}"` : ''}>`;
  }
  if (m.kind === 'voice' && b.m) {
    inner += `<div class="voice" data-voice="${esc(b.m.p)}" data-type="${esc(b.m.type || '')}"><button class="play" aria-label="تشغيل">${ICON.play}</button><div class="bar"><i></i></div><small>${dur(b.m.d || 0)}</small></div>`;
  }
  if (m.kind === 'call' && b.c) {
    const missed = b.c.st !== 'ok';
    const label = b.c.v ? 'مكالمة فيديو' : 'مكالمة صوتية';
    inner += `<div class="callrow${missed ? ' missed' : ''}"><span class="ic">${b.c.v ? ICON.video : ICON.phone}</span><div>${label}<br><small class="muted">${b.c.st === 'ok' ? dur(b.c.d) : b.c.st === 'declined' ? 'مرفوضة' : mine ? 'ما رد' : 'فائتة'}</small></div></div>`;
  }
  if (m.kind === 'game' && b.g) {
    const gi = GINFO[b.k] || GINFO.who;
    inner += `<div class="gcard" data-open-game="${esc(b.g)}"><span class="gc-ic" style="background:${gi.c}">${GICON[b.k] || ''}</span>
      <div><small>${esc(gi.n)}</small><b>${esc(b.t || gi.n)}</b></div></div><button class="ctc-btn" data-open-game="${esc(b.g)}">${b.k === 'word' ? 'العب كلمة اليوم' : 'العب'}</button>`;
  }
  if (m.kind === 'contact' && b.ct) {
    inner += `<div class="ctc"><span class="av sm" style="background:${esc(S.members.get(b.ct.u)?.color || '#888')}">${ICON.user}</span><div><b>${esc(b.ct.n)}</b><small dir="ltr">${esc(fmtPhone(b.ct.p))}</small></div></div>
      <button class="ctc-btn" data-msg-user="${esc(b.ct.u)}">مراسلة</button>`;
  }
  if (b.t && m.kind !== 'call' && m.kind !== 'game') inner += `<div class="txt${b.bad ? ' deleted' : ''}">${linkify(b.t)}</div>`;
  const starred = S.open.stars?.has(m.id);
  inner += `<div class="meta">${starred ? `<i class="st">${ICON.starFill}</i>` : ''}<span>${fTime.format(ts(m.created_at))}</span>${mine ? ticks(m) : ''}</div>`;
  if (rxStr) inner += `<span class="rxs">${rxStr}</span>`;
  out += `<div class="m${mine ? ' me' : ''}${gap ? ' gap' : ''}${rxStr ? ' has-rx' : ''}" data-id="${m.id}"><div class="bub">${inner}</div></div>`;
  return out;
}

function renderMsgs(forceBottom) {
  const o = S.open;
  if (!o) return;
  const box = $('#msgs');
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
  const hid = hiddenMsgs();
  const list = hid.size ? o.msgs.filter((m) => !hid.has(m.id)) : o.msgs;
  // نحدّث بس الرسائل اللي تغيّرت (بدل ما نعيد رسم المحادثة كلها) عشان ما تنط الشاشة وما ترمش الصور
  const want = [];
  if (o.more) want.push(['__more', '<button class="btn ghost more" id="moreBtn">رسائل أقدم</button>']);
  if (!list.length) want.push(['__empty', emptyState(o.chat.is_direct ? ICON.chat : ICON.users, 'ابدأ المحادثة', 'الرسائل مشفرة من طرف لطرف')]);
  list.forEach((m, i) => want.push([String(m.id), msgHTML(m, list[i - 1])]));
  const old = new Map();
  for (const el of box.children) if (el.dataset.k) old.set(el.dataset.k, el);
  if (box.dataset.chat !== o.id) { old.clear(); box.dataset.chat = o.id; }
  // الرسالة اللي كانت مؤقتة (tmp) وصارت حقيقية: نعيد استخدام صورتها المحمّلة
  const tpl = document.createElement('template');
  const nodes = want.map(([k, h]) => {
    const ex = old.get(k);
    if (ex && ex._h === h) { old.delete(k); return ex; }
    tpl.innerHTML = `<div class="mw" data-k="${esc(k)}">${h}</div>`;
    const el = tpl.content.firstElementChild;
    el._h = h;
    if (ex) {
      $$('img[data-media]', ex).forEach((oi) => {
        const ni = el.querySelector(`img[data-media="${CSS.escape(oi.dataset.media)}"]`);
        if (ni && oi.src) { ni.src = oi.src; ni.dataset.ok = '1'; }
      });
      old.delete(k);
    }
    return el;
  });
  const prevTop = box.scrollTop;
  box.replaceChildren(...nodes);
  hydrate(box);
  if (S.voice) {
    const el = box.querySelector(`[data-voice="${CSS.escape(S.voice.path)}"]`);
    if (el) { S.voice.el = el; el.querySelector('.play').innerHTML = S.voice.audio.paused ? ICON.play : ICON.pause; voiceProgress(); }
  }
  if (forceBottom || near) box.scrollTop = box.scrollHeight;
  else box.scrollTop = prevTop;
  $$('img.pic:not([data-wired])', box).forEach((img) => {
    img.dataset.wired = '1';
    if (img.complete && img.naturalWidth) return;
    img.addEventListener('load', () => {
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 400;
      if (forceBottom || atBottom) box.scrollTop = box.scrollHeight;
    }, { once: true });
  });
}

// "حذف عندي": الرسالة تختفي من جوالك بس
function hiddenMsgs() {
  if (!S.hidden) { try { S.hidden = new Set(JSON.parse(localStorage.getItem('lamma-hidden') || '[]')); } catch (e) { S.hidden = new Set(); } }
  return S.hidden;
}
function hideMsg(id) {
  const h = hiddenMsgs();
  h.add(id);
  try { localStorage.setItem('lamma-hidden', JSON.stringify([...h].slice(-3000))); } catch (e) { /* ignore */ }
  renderMsgs();
}

function markRead() {
  const o = S.open;
  if (!o || document.hidden) return;
  const last = [...o.msgs].reverse().find((m) => !m.pending);
  if (!last) return;
  if (o.myRead && ts(o.myRead) >= ts(last.created_at)) return;
  o.myRead = last.created_at;
  o.reads.set(S.me, last.created_at);
  sb.from('chat_members').update({ last_read: last.created_at }).eq('chat_id', o.id).eq('user_id', S.me).then(() => {});
  const c = chatOf(o.id);
  if (c && c.unread) { c.unread = 0; renderList(); badge(); }
}

// ---------- الإرسال ----------
function notify(chatId, kind, to) {
  sb.functions.invoke('notify', { body: { chat_id: chatId, kind, to } }).catch(() => {});
}
async function sendTo(chatId, kind, b) {
  const id = crypto.randomUUID();
  const local = { id, chat_id: chatId, sender: S.me, kind, b, created_at: new Date().toISOString(), pending: true };
  const o = S.open?.id === chatId ? S.open : null;
  if (o) { o.msgs.push(local); renderMsgs(true); }
  if (['text', 'image', 'voice', 'story', 'contact'].includes(kind)) sfx('send');
  try {
    const body = await encJSON(S.key, b);
    const { data, error } = await sb.from('messages').insert({ id, chat_id: chatId, kind, body }).select('created_at').single();
    if (error) throw error;
    local.pending = false;
    local.created_at = data.created_at;
    const c = chatOf(chatId);
    if (c) { c.last = { ...local }; c.last_at = data.created_at; sortChats(); renderList(); }
    if (kind !== 'call' && kind !== 'system') notify(chatId, kind);
  } catch (e) {
    console.error(e);
    local.failed = true;
    const c = chatOf(chatId);
    toast(c?.is_direct && kind !== 'system' ? 'ما انرسلت. ممكن تكون محظور، أو ما فيه إنترنت' : 'ما انرسلت الرسالة، تأكد من الإنترنت');
  }
  if (o && S.open === o) renderMsgs();
  return local;
}
function replyRef() {
  if (!S.reply) return undefined;
  const r = S.reply;
  S.reply = null;
  $('#replyBox').classList.add('hidden');
  return r;
}
function sendText() {
  const v = $('#msgInp').value.trim();
  if (!v || !S.open) return;
  $('#msgInp').value = '';
  autosize();
  syncSend();
  sendTo(S.open.id, 'text', { t: v, r: replyRef() });
}
function autosize() {
  const t = $('#msgInp');
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 140) + 'px';
}
function syncSend() {
  const has = !!$('#msgInp').value.trim();
  const b = $('#sendBtn');
  if (b.dataset.m === String(has)) return;
  b.dataset.m = String(has);
  b.innerHTML = has ? ICON.send : ICON.mic;
  b.setAttribute('aria-label', has ? 'إرسال' : 'تسجيل صوت');
}

function bindChat() {
  $('#chatBack').onclick = () => history.back();
  $('#chatWho').onclick = () => (S.open.chat.is_direct ? openContactInfo(S.open.chat.other, S.open.id) : openGroupInfo(S.open.id));
  bindSwipeReply();
  $('#callBtn').onclick = () => startCall(S.open.chat.other, S.open.id, false);
  $('#chatGamesBtn').onclick = () => chatGamesSheet(S.open.id, S.open.chat.is_direct ? S.open.chat.other : null);
  $('#vidBtn').onclick = () => startCall(S.open.chat.other, S.open.id, true);
  const inp = $('#msgInp');
  inp.oninput = () => { autosize(); syncSend(); sendTyping(); };
  inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !touch) { e.preventDefault(); sendText(); } };
  $('#sendBtn').onclick = () => {
    if ($('#msgInp').value.trim()) { S.lastSend = Date.now(); return sendText(); }
    // ضغطة ثانية بالغلط بعد الإرسال ما تبدأ تسجيل صوتي
    if (Date.now() - (S.lastSend || 0) < 900) return;
    startRec();
  };
  $('#attachBtn').onclick = () => $('#fileInp').click();
  $('#fileInp').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) imageSheet(f); };
  $('#replyX').onclick = () => { S.reply = null; $('#replyBox').classList.add('hidden'); };
  $('#recX').onclick = () => stopRec(false);
  $('#recSend').onclick = () => stopRec(true);
  $('#msgs').onclick = async (e) => {
    if (Date.now() - (S.suppressClick || 0) < 250) return;
    if (e.target.id === 'moreBtn') return loadOlder();
    const og = e.target.closest('[data-open-game]');
    if (og) return openGame(og.dataset.openGame);
    const mu = e.target.closest('[data-msg-user]');
    if (mu) { const id = mu.dataset.msgUser === S.me ? null : await openDirect(mu.dataset.msgUser); if (id) openChat(id); return; }
    if (e.target.closest('.sys')) return;
    if (e.target.closest('a')) return;
    const play = e.target.closest('.play');
    if (play) return toggleVoice(play.closest('.voice'));
    if (e.target.closest('.voice')) return;
    const jump = e.target.closest('[data-jump]');
    if (jump) return jumpTo(jump.dataset.jump);
    if (e.target.dataset.view && e.target.src) return viewImage(e.target.src, e.target.closest('.m')?.dataset.id);
    const m = e.target.closest('.m');
    if (m) msgSheet(m.dataset.id);
  };
}

// ---------- قائمة خيارات الرسالة ----------
const RX = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
function msgSheet(id) {
  const o = S.open;
  const m = o.msgs.find((x) => x.id === id);
  if (m?.failed) {
    return openSheet(`<p class="ask-t">ما انرسلت هذي الرسالة</p>
      <button class="act" data-a="retry"><span class="ic">${ICON.send}</span>أعد الإرسال</button>
      <button class="act red" data-a="drop"><span class="ic">${ICON.trash}</span>احذفها</button>`, (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      closeSheet();
      o.msgs = o.msgs.filter((x) => x !== m);
      renderMsgs();
      if (a === 'retry') sendTo(o.id, m.kind, m.b);
    });
  }
  if (!m || m.pending) return;
  const mine = m.sender === S.me;
  const myRx = o.rx.get(id)?.get(S.me);
  const hasText = m.b?.t && !m.b.bad;
  openSheet(`
    <div class="rx-pick">${RX.map((e) => `<button data-rx="${e}" class="${e === myRx ? 'on' : ''}">${e}</button>`).join('')}</div>
    ${m.kind !== 'call' ? `<button class="act" data-a="reply"><span class="ic">${ICON.reply}</span>رد</button>` : ''}
    ${m.kind !== 'call' ? `<button class="act" data-a="fwd"><span class="ic">${ICON.forward}</span>تحويل</button>` : ''}
    <button class="act" data-a="star"><span class="ic">${o.stars?.has(id) ? ICON.starFill : ICON.star}</span>${o.stars?.has(id) ? 'إزالة النجمة' : 'تمييز بنجمة'}</button>
    ${hasText ? `<button class="act" data-a="copy"><span class="ic">${ICON.copy}</span>نسخ</button>` : ''}
    ${m.kind === 'image' ? `<button class="act" data-a="save"><span class="ic">${ICON.download}</span>حفظ الصورة</button>` : ''}
    ${mine ? `<button class="act" data-a="info"><span class="ic">${ICON.info}</span>مين قرأها</button>` : ''}
    <button class="act red" data-a="hide"><span class="ic">${ICON.trash}</span>حذف عندي</button>
    ${mine ? `<button class="act red" data-a="del"><span class="ic">${ICON.trash}</span>حذف عند الجميع</button>` : ''}
  `, async (e) => {
    const rxb = e.target.closest('[data-rx]');
    if (rxb) {
      closeSheet();
      const emoji = rxb.dataset.rx;
      const map = o.rx.get(id) || new Map();
      if (myRx === emoji) {
        map.delete(S.me);
        o.rx.set(id, map); renderMsgs();
        await sb.from('reactions').delete().eq('message_id', id).eq('user_id', S.me);
      } else {
        map.set(S.me, emoji);
        o.rx.set(id, map); renderMsgs();
        const { error } = await sb.from('reactions').upsert({ message_id: id, user_id: S.me, emoji });
        if (error) toast('ما انحفظ التفاعل');
      }
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    closeSheet();
    if (a === 'reply') {
      startReply(m.id);
    } else if (a === 'fwd') {
      forwardSheet([m]);
    } else if (a === 'star') {
      toggleStar(m);
    } else if (a === 'copy') {
      navigator.clipboard?.writeText(m.b.t).then(() => toast('تم النسخ'), () => toast('ما قدرنا ننسخ'));
    } else if (a === 'save') {
      saveImage(await loadMedia(m.b.m.p, m.b.m.type));
    } else if (a === 'info') {
      readInfoSheet(m);
    } else if (a === 'hide') {
      if (!(await ask('تحذف الرسالة من جوالك بس؟ أهلك بيظل يشوفونها', 'حذف عندي', true))) return;
      hideMsg(m.id);
    } else if (a === 'del') {
      if (!(await ask('تحذف الرسالة عند الجميع؟', 'حذف عند الجميع', true))) return;
      const { error } = await sb.from('messages').delete().eq('id', m.id);
      if (error) return toast('ما انحذفت');
      if (m.b?.m?.p) sb.storage.from('media').remove([m.b.m.p]);
      onMessageGone(m.id);
    }
  });
}
function startReply(id) {
  const m = S.open?.msgs.find((x) => x.id === id);
  if (!m || m.pending || m.kind === 'call' || m.kind === 'system') return;
  const t = m.kind === 'image' ? (m.b.t ? 'صورة: ' + m.b.t : 'صورة') : m.kind === 'voice' ? 'رسالة صوتية' : m.kind === 'contact' ? 'جهة اتصال: ' + (m.b.ct?.n || '') : (m.b.t || '').slice(0, 120);
  S.reply = { id: m.id, n: nameOf(m.sender), t };
  $('#replyName').textContent = S.reply.n;
  $('#replyText').textContent = t;
  $('#replyBox').classList.remove('hidden');
  $('#msgInp').focus();
}
async function toggleStar(m) {
  const o = S.open;
  o.stars = o.stars || new Set();
  if (o.stars.has(m.id)) {
    o.stars.delete(m.id); renderMsgs();
    await sb.from('stars').delete().eq('message_id', m.id).eq('user_id', S.me);
  } else {
    o.stars.add(m.id); renderMsgs();
    const { error } = await sb.from('stars').insert({ message_id: m.id, chat_id: m.chat_id, user_id: S.me });
    if (error) { o.stars.delete(m.id); renderMsgs(); toast('ما انحفظت النجمة'); }
  }
}
// اسحب الرسالة على جنب عشان ترد عليها
function bindSwipeReply() {
  const box = $('#msgs');
  let st = null;
  let lp = 0;
  const cancelLP = () => { clearTimeout(lp); lp = 0; };
  box.addEventListener('pointerdown', (e) => {
    const m = e.target.closest('.m');
    if (!m || e.target.closest('.play,a,button,.bar')) return;
    st = { m, x: e.clientX, y: e.clientY, dx: 0, on: false };
    // ضغطة مطوّلة على أي رسالة (حتى الصور) تفتح الخيارات
    cancelLP();
    if (!m.querySelector('.sys') && m.dataset.id) {
      lp = setTimeout(() => {
        lp = 0;
        st = null;
        S.suppressClick = Date.now() + 400;
        try { navigator.vibrate?.(12); } catch (x) { /* ignore */ }
        m.classList.add('held');
        setTimeout(() => m.classList.remove('held'), 260);
        msgSheet(m.dataset.id);
      }, 430);
    }
  });
  box.addEventListener('contextmenu', (e) => { if (e.target.closest('.m')) e.preventDefault(); });
  box.addEventListener('scroll', cancelLP, { passive: true });
  addEventListener('pointermove', (e) => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (lp && Math.hypot(dx, dy) > 8) cancelLP();
    if (!st.on) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 0.7) { st = null; return; }
      if (Math.abs(dx) < 18 || Math.abs(dx) < Math.abs(dy) * 2) return;
      st.on = true;
      st.m.classList.add('swiping');
    }
    st.dx = Math.max(-84, Math.min(84, dx));
    st.m.querySelector('.bub').style.transform = `translateX(${st.dx}px)`;
    st.m.style.setProperty('--sw', Math.min(1, Math.abs(st.dx) / 60).toFixed(2));
    st.m.dataset.dir = st.dx > 0 ? 'r' : 'l';
    if (Math.abs(st.dx) >= 60 && !st.buzz) { st.buzz = 1; try { navigator.vibrate?.(10); } catch (x) { /* ignore */ } }
  });
  const end = () => {
    cancelLP();
    if (!st) return;
    const s = st;
    st = null;
    if (!s.on) return;
    const b = s.m.querySelector('.bub');
    b.style.transition = 'transform .2s ease';
    b.style.transform = '';
    s.m.style.setProperty('--sw', 0);
    setTimeout(() => { b.style.transition = ''; s.m.classList.remove('swiping'); }, 220);
    S.suppressClick = Date.now();
    if (Math.abs(s.dx) >= 60) startReply(s.m.dataset.id);
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
}
async function jumpTo(id) {
  const o = S.open;
  if (!o) return;
  if (!o.msgs.some((m) => m.id === id)) {
    const { data: t } = await sb.from('messages').select('created_at').eq('id', id).single();
    if (!t) return toast('الرسالة ما عادت موجودة');
    const { data } = await sb.from('messages').select('*').eq('chat_id', o.id).order('created_at', { ascending: true }).limit(2000);
    const rows = (data || []).filter((r) => ts(r.created_at) >= ts(t.created_at));
    o.msgs = await Promise.all(rows.map(async (r) => ({ ...r, b: await decSafe(r.body) })));
    o.more = true;
    await loadRx(o, rows.map((r) => r.id));
    renderMsgs();
  }
  const el = $(`#msgs [data-id="${CSS.escape(id)}"]`);
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1300); }
}
function forwardSheet(msgs) {
  pickChats('تحويل إلى', async (ids) => {
    for (const cid of ids) {
      for (const m of msgs) {
        let kind = m.kind, b = { ...m.b };
        delete b.r;
        if (kind === 'story') { kind = 'text'; delete b.s; }
        b.f = 1;
        await sendTo(cid, kind, b);
      }
    }
    toast(ids.length > 1 ? `تم التحويل لـ ${ids.length} محادثات` : 'تم التحويل');
  });
}
function pickChats(title, onDone) {
  const rows = S.chats.map((c) => `<label class="check">${chatAvatar(c, 'sm')}<span style="flex:1">${esc(chatName(c))}</span><input type="checkbox" value="${c.id}"></label>`).join('');
  openSheet(`<h3>${esc(title)}</h3>${rows || emptyState(ICON.chat, 'ما فيه محادثات')}
    <div class="form" style="margin-top:12px"><button class="btn" id="pickGo" disabled>إرسال</button></div>`);
  const go = $('#pickGo');
  $('#sheet').onchange = () => {
    const n = $$('#sheet input:checked').length;
    go.disabled = !n;
    go.textContent = n ? `إرسال (${n})` : 'إرسال';
  };
  go.onclick = () => {
    const ids = $$('#sheet input:checked').map((x) => x.value);
    closeSheet();
    if (ids.length) onDone(ids);
  };
}
// تأكيد بشكل آيفون بدل نافذة المتصفح
function ask(title, okLabel, danger) {
  return new Promise((res) => {
    let done = false;
    const fin = (v) => { if (done) return; done = true; res(v); };
    openSheet(`<p class="ask-t">${esc(title)}</p>
      <button class="act ask-ok${danger ? ' red' : ''}" data-a="ok">${esc(okLabel)}</button>
      <button class="act ask-no" data-a="no">إلغاء</button>`, (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      fin(a === 'ok');
      closeSheet();
    }, () => fin(false));
  });
}
function readInfoSheet(m) {
  const t = ts(m.created_at);
  const rows = [...S.open.reads.entries()].filter(([u]) => u !== S.me).map(([u, r]) => {
    const read = ts(r) >= t;
    return `<div class="row">${avatar(u, 'sm')}<div class="row-main"><div class="row-top"><b>${esc(nameOf(u))}</b><time>${read ? tick('two read') + ' ' + listTime(r) : 'ما قرأها بعد'}</time></div></div></div>`;
  }).join('');
  openSheet(`<h3>معلومات الرسالة</h3>${rows || '<p class="empty">ما فيه أحد ثاني</p>'}`);
}

// ---------- الصور ----------
function imageSheet(file) {
  const url = URL.createObjectURL(file);
  openSheet(`<h3>إرسال صورة</h3><img class="preview-img" src="${url}" alt="">
    <div class="form"><input id="capInp" placeholder="أضف تعليق (اختياري)"><button class="btn" id="imgSend">إرسال</button></div>`, null, () => URL.revokeObjectURL(url));
  $('#imgSend').onclick = async () => {
    const caption = $('#capInp').value.trim();
    const chatId = S.open.id;
    closeSheet();
    try {
      const { blob, w, h } = await compressImage(file);
      const path = newPath();
      mediaCache.set(path, Promise.resolve(URL.createObjectURL(blob)));
      const r = replyRef();
      const o = S.open?.id === chatId ? S.open : null;
      const tmp = { id: 'tmp-' + path, chat_id: chatId, sender: S.me, kind: 'image', b: { m: { p: path, type: 'image/jpeg', w, h }, t: caption, r }, created_at: new Date().toISOString(), pending: true };
      if (o) { o.msgs.push(tmp); renderMsgs(true); }
      await uploadTo(path, blob);
      if (o) o.msgs = o.msgs.filter((x) => x !== tmp);
      await sendTo(chatId, 'image', tmp.b);
    } catch (e) {
      console.error(e);
      toast('ما انرسلت الصورة');
      if (S.open) { S.open.msgs = S.open.msgs.filter((x) => !String(x.id).startsWith('tmp-')); renderMsgs(); }
    }
  };
}
// حفظ الصورة: في الآيفون تطلع قائمة المشاركة وفيها «حفظ الصورة»
async function saveImage(url) {
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], 'lamma-' + Date.now() + '.jpg', { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    const l = document.createElement('a');
    l.href = URL.createObjectURL(file); l.download = file.name; l.click();
    setTimeout(() => URL.revokeObjectURL(l.href), 5000);
  } catch (e) {
    if (e?.name !== 'AbortError') toast('افتح الصورة واضغط عليها مطوّل واختر «حفظ في الصور»', 3500);
  }
}
function viewImage(src, msgId) {
  const v = $('#viewer');
  const m = msgId ? S.open?.msgs.find((x) => x.id === msgId && !x.pending) : null;
  const mine = m?.sender === S.me;
  v.className = 'overlay imgview';
  const btn = (a, ic, l, red) => `<button data-a="${a}" class="${red ? 'red' : ''}"><span>${ic}</span><small>${l}</small></button>`;
  v.innerHTML = `<img src="${esc(src)}" alt=""><button class="glass-btn dark sv-close" data-a="x" aria-label="إغلاق">${ICON.close}</button>
    ${m ? `<div class="iv-bar">${btn('reply', ICON.reply, 'رد')}${btn('fwd', ICON.forward, 'تحويل')}${btn('save', ICON.download, 'حفظ')}${btn('del', ICON.trash, mine ? 'حذف' : 'حذف عندي', true)}</div>` : ''}`;
  v.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'x') return history.back();
    if (!m) return;
    if (a === 'save') return saveImage(src);
    history.back();
    await new Promise((r) => setTimeout(r, 180));
    if (a === 'reply') startReply(m.id);
    else if (a === 'fwd') forwardSheet([m]);
    else if (a === 'del') {
      if (!mine) {
        if (await ask('تحذف الصورة من جوالك بس؟ أهلك بيظل يشوفونها', 'حذف عندي', true)) hideMsg(m.id);
        return;
      }
      const choice = await ask('تحذف الصورة عند الجميع؟', 'حذف عند الجميع', true);
      if (!choice) return;
      const { error } = await sb.from('messages').delete().eq('id', m.id);
      if (error) return toast('ما انحذفت');
      if (m.b?.m?.p) sb.storage.from('media').remove([m.b.m.p]);
      onMessageGone(m.id);
    }
  };
  swipeDown(v, { onTap: () => v.classList.toggle('bare') });
  history.pushState({ v: 1 }, '');
}

// ---------- الرسائل الصوتية ----------
let rec = null;
async function startRec() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('جهازك ما يدعم التسجيل');
  try {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'auto') navigator.audioSession.type = 'auto'; } catch (x) { /* ignore */ }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    rec = { mr, stream, chunks: [], started: Date.now(), chat: S.open.id };
    mr.ondataavailable = (e) => e.data.size && rec?.chunks.push(e.data);
    mr.start(250);
    $('#composer').classList.add('hidden');
    $('#recBar').classList.remove('hidden');
    $('#recTime').textContent = '0:00';
    rec.timer = setInterval(() => {
      const s = (Date.now() - rec.started) / 1000;
      $('#recTime').textContent = dur(s);
      if (s > 300) stopRec(true);
    }, 250);
  } catch (e) {
    try { rec?.stream?.getTracks().forEach((t) => t.stop()); } catch (x) { /* ignore */ }
    rec = null;
    mediaError(e, 'mic');
  }
}
// لما يرفض الجوال المايك أو الكاميرا: نشرح السبب بالضبط وكيف تحله
function mediaError(e, what) {
  const name = e?.name || '';
  const thing = what === 'cam' ? 'الكاميرا والمايك' : 'المايك';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return toast(`ما لقينا ${thing} في جهازك`);
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return toast(`${thing} مشغول في تطبيق ثاني (مكالمة أو تسجيل). سكّره وجرّب`, 4500);
  if (name !== 'NotAllowedError' && name !== 'PermissionDeniedError' && name !== 'SecurityError') return toast(`ما اشتغل ${thing} (${name || e?.message || 'خطأ'})`, 4500);
  openSheet(`<h3>اسمح بـ${thing}</h3><div class="form perm-help">
    <p>الجوال مانع لمّة من ${thing}. هذا يتعدل من إعدادات الجوال، مو من التطبيق:</p>
    ${isIOS ? `<ol>
      <li>افتح <b>الإعدادات</b> في الآيفون</li>
      <li>اختر <b>التطبيقات</b> ثم <b>Safari</b> (لمّة تتبع Safari لأنها مضافة للشاشة الرئيسية)</li>
      <li>نزّل تحت لـ <b>الميكروفون</b>${what === 'cam' ? ' و<b>الكاميرا</b>' : ''} واختر <b>اسأل</b> أو <b>سماح</b></li>
      <li>إذا ما تغيّر شي: <b>الإعدادات ← مدة استخدام الجهاز ← قيود المحتوى والخصوصية ← الميكروفون</b> وخلها «سماح»</li>
      <li>سكّر لمّة بالكامل (اسحبها من قائمة التطبيقات) وافتحها من جديد</li>
    </ol>` : `<ol>
      <li>اضغط مطوّل على أيقونة لمّة ← <b>معلومات التطبيق</b> ← <b>الأذونات</b></li>
      <li>فعّل <b>الميكروفون</b>${what === 'cam' ? ' و<b>الكاميرا</b>' : ''}</li>
      <li>أو من Chrome: اضغط القفل جنب الرابط ← <b>الأذونات</b> ← سماح</li>
    </ol>`}
    <button class="btn" id="permOk">فهمت</button>
  </div>`);
  $('#permOk').onclick = closeSheet;
}
function stopRec(send) {
  if (!rec) return;
  const r = rec;
  rec = null;
  clearInterval(r.timer);
  $('#recBar').classList.add('hidden');
  $('#composer').classList.remove('hidden');
  r.mr.onstop = async () => {
    r.stream.getTracks().forEach((t) => t.stop());
    const d = (Date.now() - r.started) / 1000;
    if (!send || d < 0.8) return;
    const type = (r.mr.mimeType || 'audio/webm').split(';')[0];
    const blob = new Blob(r.chunks, { type });
    try {
      const path = newPath();
      mediaCache.set(path, Promise.resolve(URL.createObjectURL(blob)));
      await uploadTo(path, blob);
      await sendTo(r.chat, 'voice', { m: { p: path, type, d: Math.round(d) }, r: replyRef() });
    } catch (e) {
      console.error(e);
      toast('ما انرسلت الرسالة الصوتية');
    }
  };
  r.mr.stop();
}
async function toggleVoice(el) {
  const path = el.dataset.voice;
  if (S.voice?.path === path) {
    const a = S.voice.audio;
    if (a.paused) a.play(); else a.pause();
    return;
  }
  stopVoice();
  el.querySelector('.play').classList.add('loading');
  try {
    const url = await loadMedia(path, el.dataset.type);
    const audio = new Audio(url);
    S.voice = { path, audio, el };
    audio.ontimeupdate = voiceProgress;
    audio.onplay = audio.onpause = () => { if (S.voice?.audio === audio) S.voice.el.querySelector('.play').innerHTML = audio.paused ? ICON.play : ICON.pause; };
    audio.onended = () => stopVoice();
    await audio.play();
    el.querySelector('.play').classList.remove('loading');
  } catch (e) {
    el.querySelector('.play').classList.remove('loading');
    toast('ما قدرنا نشغل الرسالة');
  }
}
function voiceProgress() {
  const v = S.voice;
  if (!v) return;
  const d = v.audio.duration;
  const p = isFinite(d) && d > 0 ? (v.audio.currentTime / d) * 100 : 0;
  const i = v.el.querySelector('.bar i');
  if (i) i.style.width = p + '%';
  const s = v.el.querySelector('small');
  if (s) s.textContent = dur(v.audio.currentTime);
}
function stopVoice() {
  if (!S.voice) return;
  const v = S.voice;
  S.voice = null;
  v.audio.pause();
  const p = v.el.querySelector('.play');
  if (p) p.innerHTML = ICON.play;
  const i = v.el.querySelector('.bar i');
  if (i) i.style.width = '0';
}

// ================= القوائم المنبثقة =================
let sheetClose = null;
function openSheet(html, onClick, onClose) {
  const w = $('#sheetWrap');
  $('#sheet').innerHTML = html;
  w.classList.remove('hidden');
  hydrate($('#sheet'));
  $('#sheet').onclick = onClick || null;
  w.onclick = (e) => { if (e.target === w) closeSheet(); };
  sheetClose = onClose || null;
}
function closeSheet() {
  $('#sheetWrap').classList.add('hidden');
  $('#sheet').innerHTML = '';
  if (sheetClose) { const f = sheetClose; sheetClose = null; f(); }
}

function memberRows(filter = () => true, checkbox = false) {
  return [...S.members.values()].filter((m) => m.id !== S.me && filter(m)).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map((m) =>
    checkbox
      ? `<label class="check">${avatar(m.id, 'sm')}<span style="flex:1">${esc(m.name)}</span><input type="checkbox" value="${m.id}"></label>`
      : `<div class="row" data-u="${m.id}">${avatar(m.id, 'sm', S.online.has(m.id))}<div class="row-main"><div class="row-top"><b>${esc(m.name)}</b></div><div class="row-sub"><span>${esc(m.about || (S.online.has(m.id) ? 'متصل الآن' : lastSeen(m.last_seen)))}</span></div></div></div>`
  ).join('');
}
async function openDirect(uid) {
  const { data, error } = await sb.rpc('open_direct', { other: uid });
  if (error) { toast('ما قدرنا نفتح المحادثة'); return null; }
  return data;
}
function newChatSheet() {
  const rows = memberRows();
  openSheet(`<h3>محادثة جديدة</h3>
    <button class="act" data-a="group"><span class="ic">${ICON.users}</span>قروب جديد</button>
    <p class="section-t">أفراد العائلة</p>
    ${rows || '<p class="empty">ما فيه أحد انضم بعد. أرسل لهم رابط التطبيق!</p>'}`, async (e) => {
    if (e.target.closest('[data-a="group"]')) return newGroupSheet();
    const r = e.target.closest('[data-u]');
    if (!r) return;
    closeSheet();
    const id = await openDirect(r.dataset.u);
    if (id) openChat(id);
  });
}
function newGroupSheet(pre = []) {
  openSheet(`<h3>قروب جديد</h3>
    <div class="form"><input id="gName" maxlength="40" placeholder="اسم القروب"></div>
    <p class="section-t" style="margin-top:12px">اختر الأعضاء</p>${memberRows(() => true, true).replace(new RegExp(`value="(${pre.join('|') || '__none__'})"`, 'g'), 'value="$1" checked')}
    <div class="form" style="margin-top:12px"><button class="btn" id="gMake">إنشاء القروب</button></div>`);
  $('#gMake').onclick = async () => {
    const name = $('#gName').value.trim();
    const ids = $$('#sheet input[type=checkbox]:checked').map((x) => x.value);
    if (!name) return toast('اكتب اسم القروب');
    if (!ids.length) return toast('اختر عضو واحد على الأقل');
    $('#gMake').disabled = true;
    const { data, error } = await sb.rpc('create_group', { group_name: name, group_emoji: null, member_ids: ids });
    if (error) { $('#gMake').disabled = false; return toast('ما انشأ القروب'); }
    closeSheet();
    await loadChats();
    renderList();
    openChat(data);
  };
}
// ================= صفحات المعلومات (القروب والشخص) =================
function fmtPhone(p) {
  p = String(p || '');
  if (/^9665\d{8}$/.test(p)) return `+966 ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8)}`;
  return p ? '+' + p : '';
}
const infoIsOpen = () => !$('#info').classList.contains('off');
let INFO = null;
function infoShow(html, title) {
  const el = $('#info');
  const wasOpen = infoIsOpen();
  el.innerHTML = `<div class="info-bar"><button class="glass-btn" data-a="back" aria-label="رجوع">${ICON.back}</button>
      <b class="info-title">${esc(title)}</b><span class="info-act">${INFO?.edit ? '<button class="glass-pill" data-a="edit">تعديل</button>' : ''}</span></div>
    <div class="info-body">${html}</div>`;
  el.classList.remove('off');
  hydrate(el);
  if (!wasOpen) { el.scrollTop = 0; history.pushState({ info: 1 }, ''); }
  el.onscroll = () => el.classList.toggle('scrolled', el.scrollTop > 150);
}
function infoClose() {
  $('#info').classList.add('off');
  INFO = null;
}
const ir = ({ a, icon, label, sub, value, chev = true, cls = '', toggle, data = '' }) =>
  `<button class="ir ${cls}" ${a ? `data-a="${a}"` : ''} ${data}>${icon ? `<span class="ir-ic">${icon}</span>` : ''}
    <span class="ir-t"><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</span>
    ${value !== undefined ? `<span class="ir-v">${value}</span>` : ''}
    ${toggle !== undefined ? `<span class="switch${toggle ? ' on' : ''}"><i></i></span>` : chev ? `<i class="ir-chev">${ICON.chevron}</i>` : ''}</button>`;
const ttlLabel = (s) => (!s ? 'متوقفة' : s <= 86400 ? '24 ساعة' : s <= 604800 ? '7 أيام' : '90 يوم');
const muteLabel = (c) => (isMuted(c) ? (ts(c.muted_until) > Date.now() + 3e10 ? 'مكتومة دائماً' : 'مكتومة') : 'الكل');
async function sysMsg(chatId, t) { await sendTo(chatId, 'system', { t }); }

async function counts(chatId) {
  const [{ data: media }, { data: st }] = await Promise.all([
    sb.from('messages').select('id').eq('chat_id', chatId).eq('kind', 'image').limit(2000),
    sb.from('stars').select('message_id').eq('chat_id', chatId),
  ]);
  return { media: (media || []).length, stars: (st || []).length };
}

async function openGroupInfo(chatId) {
  const c = chatOf(chatId);
  if (!c) return;
  const [{ data: ch }, { data: mem }, cnt] = await Promise.all([
    sb.from('chats').select('*').eq('id', chatId).single(),
    sb.from('chat_members').select('user_id,role,joined_at').eq('chat_id', chatId),
    counts(chatId),
  ]);
  if (!ch) return toast('ما قدرنا نفتح معلومات القروب');
  const members = (mem || []).sort((x, y) => (x.user_id === S.me ? -1 : y.user_id === S.me ? 1 : (y.role === 'admin') - (x.role === 'admin') || nameOf(x.user_id).localeCompare(nameOf(y.user_id), 'ar')));
  const admin = members.find((m) => m.user_id === S.me)?.role === 'admin';
  INFO = { kind: 'group', chatId, ch, members, admin, edit: admin, showAll: INFO?.chatId === chatId && INFO?.showAll };
  Object.assign(c, { name: ch.name, photo: ch.photo, ttl: ch.ttl_seconds });
  const list = INFO.showAll ? members : members.slice(0, 8);
  const html = `
    <div class="info-head">
      <button class="info-photo" data-a="${admin ? 'photo' : 'viewphoto'}">${chatAvatar(c, 'xl')}</button>
      <h1>${esc(ch.name)}</h1>
      <p>مجموعة · <span class="acc">${members.length} أعضاء</span></p>
      ${ch.description ? `<p class="desc">${linkify(ch.description)}</p>` : admin ? '<button class="link-acc" data-a="edit">إضافة وصف للمجموعة</button>' : ''}
    </div>
    <div class="tiles">
      <button data-a="add">${ICON.userPlus}<span>إضافة</span></button>
      <button data-a="search">${ICON.search}<span>بحث</span></button>
      <button data-a="media">${ICON.image}<span>الوسائط</span></button>
    </div>
    <div class="ig">
      ${ir({ a: 'media', icon: ICON.image, label: 'الصور', value: cnt.media })}
      ${ir({ a: 'starred', icon: ICON.star, label: 'مميزة بنجمة', value: cnt.stars })}
    </div>
    <div class="ig">
      ${ir({ a: 'mute', icon: ICON.bell, label: 'الإشعارات', value: muteLabel(c) })}
      ${ir({ a: 'ttl', icon: ICON.timer, label: 'الرسائل ذاتية الاختفاء', value: ttlLabel(ch.ttl_seconds) })}
      ${ir({ a: 'lock', icon: ICON.lock, label: 'قفل الدردشة', sub: 'اقفل هذه الدردشة برمز على هذا الجهاز', toggle: isLocked(chatId) })}
      ${ir({ a: 'enc', icon: ICON.lock, label: 'التشفير', sub: 'الرسائل والصور والصوت مشفرة تماماً بين الطرفين' })}
    </div>
    <h4 class="ig-t">${members.length} أعضاء</h4>
    <div class="ig">
      ${ir({ a: 'add', icon: `<span class="circ">${ICON.plus}</span>`, label: 'إضافة أعضاء', chev: false })}
      ${ir({ a: 'invite', icon: `<span class="circ">${ICON.link}</span>`, label: 'دعوة أحد من العائلة للتطبيق', chev: false })}
      ${list.map((m) => `<button class="ir mem" data-u="${m.user_id}">${avatar(m.user_id, 'sm', S.online.has(m.user_id))}
          <span class="ir-t"><span>${esc(m.user_id === S.me ? 'أنت' : nameOf(m.user_id))}</span><small>${esc(S.members.get(m.user_id)?.about || '')}</small></span>
          ${m.role === 'admin' ? '<span class="ir-v">مشرف</span>' : ''}${m.user_id === S.me ? '' : `<i class="ir-chev">${ICON.chevron}</i>`}</button>`).join('')}
      ${members.length > 8 && !INFO.showAll ? ir({ a: 'all', label: 'عرض الكل' }) : ''}
    </div>
    <div class="ig">
      ${ir({ a: 'clear', label: 'مسح محتوى الدردشة', cls: 'red-t', chev: false })}
    </div>
    <div class="ig">${ir({ a: 'leave', label: 'الخروج من المجموعة', cls: 'red-t', chev: false })}</div>
    <p class="info-foot">${ch.created_by ? `أنشأها ${esc(nameOf(ch.created_by))}.<br>` : ''}أُنشئت بتاريخ ${fDate.format(ts(ch.created_at))}.</p>`;
  infoShow(html, ch.name);
  $('#info').onclick = (e) => groupInfoClick(e);
}

async function groupInfoClick(e) {
  const g = INFO;
  if (!g) return;
  const u = e.target.closest('[data-u]')?.dataset.u;
  const a = e.target.closest('[data-a]')?.dataset.a;
  const c = chatOf(g.chatId);
  if (u) return u === S.me ? null : memberSheet(u);
  if (!a) return;
  if (a === 'back') return history.back();
  if (a === 'edit' || a === 'photo') return g.admin ? editGroupSheet(a === 'photo') : toast('بس المشرفين يقدرون يعدلون');
  if (a === 'viewphoto') { if (c.photo) viewImage(await loadMedia(c.photo, 'image/jpeg')); return; }
  if (a === 'add') return addMembersSheet();
  if (a === 'search') return searchSheet(g.chatId);
  if (a === 'media') return mediaSheet(g.chatId);
  if (a === 'starred' || a === 'export-star') return starredSheet(g.chatId);
  if (a === 'mute') return muteSheet(c, () => openGroupInfo(g.chatId));
  if (a === 'ttl') return g.admin ? ttlSheet(c, () => openGroupInfo(g.chatId)) : toast('بس المشرفين يغيرون هذا');
  if (a === 'lock') { await toggleLock(g.chatId); return openGroupInfo(g.chatId); }
  if (a === 'enc') return encSheet();
  if (a === 'invite') return shareInvite();
  if (a === 'all') { g.showAll = true; INFO = g; return openGroupInfo(g.chatId); }
  if (a === 'clear') return clearChat(g.chatId);
  if (a === 'leave') {
    if (!(await ask('متأكد تبي تطلع من القروب؟', 'الخروج من المجموعة', true))) return;
    await sysMsg(g.chatId, `غادر ${myName()}`);
    await sb.from('chat_members').delete().eq('chat_id', g.chatId).eq('user_id', S.me);
    S.chats = S.chats.filter((x) => x.id !== g.chatId);
    renderList();
    infoClose();
    history.go(-2);
  }
}
const myName = () => S.members.get(S.me)?.name || 'فرد من العائلة';

function memberSheet(u) {
  const g = INFO;
  const role = g.members.find((m) => m.user_id === u)?.role;
  openSheet(`<p class="ask-t">${esc(nameOf(u))}</p>
    <button class="act" data-a="msg"><span class="ic">${ICON.chat}</span>مراسلة ${esc(short(u))}</button>
    <button class="act" data-a="call"><span class="ic">${ICON.phone}</span>اتصال صوتي</button>
    <button class="act" data-a="info"><span class="ic">${ICON.info}</span>معلومات ${esc(short(u))}</button>
    ${g.admin ? `<button class="act" data-a="admin"><span class="ic">${ICON.users}</span>${role === 'admin' ? 'إزالة من الإشراف' : 'تعيين كمشرف'}</button>
    <button class="act red" data-a="remove"><span class="ic">${ICON.logout}</span>إزالة ${esc(short(u))} من القروب</button>` : ''}`, async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    closeSheet();
    if (a === 'msg') { const id = await openDirect(u); if (id) { history.back(); setTimeout(() => openChat(id), 250); } }
    if (a === 'call') { const id = await openDirect(u); if (id) startCall(u, id, false); }
    if (a === 'info') openContactInfo(u, S.chats.find((c) => c.is_direct && c.other === u)?.id);
    if (a === 'admin') {
      const { error } = await sb.rpc('set_admin', { cid: g.chatId, uid: u, make: role !== 'admin' });
      if (error) return toast('ما تغيّر');
      openGroupInfo(g.chatId);
    }
    if (a === 'remove') {
      if (!(await ask(`تشيل ${nameOf(u)} من القروب؟`, 'إزالة', true))) return;
      const { error } = await sb.rpc('remove_member', { cid: g.chatId, uid: u });
      if (error) return toast('ما انشال');
      await sysMsg(g.chatId, `${myName()} أزال ${nameOf(u)}`);
      openGroupInfo(g.chatId);
    }
  });
}

function addMembersSheet() {
  const g = INFO;
  const inside = new Set(g.members.map((m) => m.user_id));
  const rows = memberRows((m) => !inside.has(m.id), true);
  if (!rows) return toast('كل العائلة موجودين في القروب');
  openSheet(`<h3>إضافة أعضاء</h3>${rows}<div class="form" style="margin-top:12px"><button class="btn" id="addGo">إضافة</button></div>`);
  $('#addGo').onclick = async () => {
    const sel = $$('#sheet input:checked').map((x) => x.value);
    closeSheet();
    if (!sel.length) return;
    const { error } = await sb.rpc('add_to_group', { cid: g.chatId, member_ids: sel });
    if (error) return toast('ما انضافوا');
    await sysMsg(g.chatId, `${myName()} أضاف ${sel.map((x) => nameOf(x)).join('، ')}`);
    if (S.open?.id === g.chatId) loadReads(S.open);
    openGroupInfo(g.chatId);
  };
}

function editGroupSheet(pickPhoto) {
  const g = INFO;
  openSheet(`<h3>تعديل المجموعة</h3>
    <div class="form">
      <button type="button" class="info-photo sm" id="egPhoto">${chatAvatar(chatOf(g.chatId), 'lg')}<span>تغيير الصورة</span></button>
      <input type="file" id="egFile" accept="image/*" hidden>
      <label>اسم المجموعة<input id="egName" maxlength="40" value="${esc(g.ch.name)}"></label>
      <label>الوصف<textarea id="egDesc" rows="3" maxlength="300" placeholder="اكتب وصف للمجموعة">${esc(g.ch.description || '')}</textarea></label>
      <button class="btn" id="egSave">حفظ</button>
    </div>`);
  $('#egPhoto').onclick = () => $('#egFile').click();
  $('#egFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      toast('جاري رفع الصورة…');
      const { blob } = await compressImage(f, 640, 0.85);
      const path = newPath();
      mediaCache.set(path, Promise.resolve(URL.createObjectURL(blob)));
      await uploadTo(path, blob);
      const old = g.ch.photo;
      const { error } = await sb.from('chats').update({ photo: path }).eq('id', g.chatId);
      if (error) throw error;
      if (old) sb.storage.from('media').remove([old]);
      g.ch.photo = path;
      chatOf(g.chatId).photo = path;
      $('#egPhoto').innerHTML = chatAvatar(chatOf(g.chatId), 'lg') + '<span>تغيير الصورة</span>';
      hydrate($('#egPhoto'));
      await sysMsg(g.chatId, `${myName()} غيّر صورة المجموعة`);
      toast('تم تغيير الصورة');
    } catch (x) { toast('ما تغيّرت الصورة'); }
  };
  if (pickPhoto) $('#egFile').click();
  $('#egSave').onclick = async () => {
    const name = $('#egName').value.trim();
    const description = $('#egDesc').value.trim();
    if (!name) return toast('اكتب اسم المجموعة');
    const { error } = await sb.from('chats').update({ name, description }).eq('id', g.chatId);
    if (error) return toast('ما انحفظ');
    closeSheet();
    if (name !== g.ch.name) await sysMsg(g.chatId, `${myName()} غيّر اسم المجموعة إلى «${name}»`);
    const c = chatOf(g.chatId);
    c.name = name;
    renderList();
    if (S.open?.id === g.chatId) renderHeader();
    openGroupInfo(g.chatId);
  };
}

async function openContactInfo(uid, chatId) {
  const m = S.members.get(uid);
  if (!m) return;
  const c = chatId ? chatOf(chatId) : null;
  const myGroups = S.chats.filter((x) => !x.is_direct);
  let common = [];
  if (myGroups.length) {
    const { data } = await sb.from('chat_members').select('chat_id,user_id').in('chat_id', myGroups.map((x) => x.id));
    const by = new Map();
    for (const r of data || []) { if (!by.has(r.chat_id)) by.set(r.chat_id, []); by.get(r.chat_id).push(r.user_id); }
    common = myGroups.filter((x) => (by.get(x.id) || []).includes(uid)).map((x) => ({ c: x, names: by.get(x.id) }));
  }
  const cnt = c ? await counts(c.id) : { media: 0, stars: 0 };
  const blocked = S.blocked.has(uid);
  INFO = { kind: 'contact', uid, chatId: c?.id, edit: false };
  const html = `
    <div class="info-head">
      ${m.about ? `<div class="about-bubble">${esc(m.about)}</div>` : ''}
      <button class="info-photo" data-a="viewphoto">${avatar(uid, 'xl')}</button>
      <h1>${esc(m.name)}</h1>
      <p dir="ltr" class="phone">${esc(fmtPhone(m.phone))}</p>
      <p class="seen">${S.online.has(uid) ? '<span class="acc">متصل الآن</span>' : esc(lastSeen(m.last_seen))}</p>
    </div>
    <div class="tiles">
      <button data-a="call">${ICON.phone}<span>صوتية</span></button>
      <button data-a="video">${ICON.video}<span>فيديو</span></button>
      <button data-a="search">${ICON.search}<span>بحث</span></button>
    </div>
    ${c ? `<div class="ig">
      ${ir({ a: 'media', icon: ICON.image, label: 'الصور', value: cnt.media })}
      ${ir({ a: 'starred', icon: ICON.star, label: 'مميزة بنجمة', value: cnt.stars })}
    </div>
    <div class="ig">
      ${ir({ a: 'mute', icon: ICON.bell, label: 'الإشعارات', value: muteLabel(c) })}
      ${ir({ a: 'ttl', icon: ICON.timer, label: 'الرسائل ذاتية الاختفاء', value: ttlLabel(c.ttl) })}
      ${ir({ a: 'lock', icon: ICON.lock, label: 'قفل الدردشة', sub: 'اقفل هذه الدردشة برمز على هذا الجهاز', toggle: isLocked(c.id) })}
      ${ir({ a: 'enc', icon: ICON.lock, label: 'التشفير', sub: 'الرسائل والمكالمات مشفرة تماماً بين الطرفين' })}
    </div>` : ''}
    <h4 class="ig-t">${common.length} ${common.length === 1 ? 'مجموعة مشتركة' : 'مجموعات مشتركة'}</h4>
    <div class="ig">
      ${ir({ a: 'newgroup', icon: `<span class="circ">${ICON.plus}</span>`, label: `إنشاء مجموعة مع ${esc(short(uid))}`, chev: false })}
      ${common.map(({ c: g, names }) => `<button class="ir mem" data-g="${g.id}">${chatAvatar(g, 'sm')}
        <span class="ir-t"><span>${esc(g.name)}</span><small>${esc(names.map((x) => short(x)).join('، '))}</small></span><i class="ir-chev">${ICON.chevron}</i></button>`).join('')}
    </div>
    <div class="ig">
      ${ir({ a: 'share', label: 'مشاركة جهة الاتصال', cls: 'acc-t', chev: false })}
      ${c ? ir({ a: 'clear', label: 'مسح محتوى الدردشة', cls: 'red-t', chev: false }) : ''}
    </div>
    <div class="ig">${ir({ a: 'block', label: `${blocked ? 'إلغاء حظر' : 'حظر'} ${esc(m.name)}`, cls: 'red-t', chev: false })}</div>`;
  infoShow(html, m.name);
  $('#info').onclick = async (e) => {
    const gid = e.target.closest('[data-g]')?.dataset.g;
    if (gid) { history.back(); setTimeout(() => openChat(gid), 250); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const getChat = async () => c?.id || (await openDirect(uid));
    if (a === 'back') return history.back();
    if (a === 'viewphoto') { if (m.avatar) viewImage(await loadMedia(m.avatar, 'image/jpeg')); return; }
    if (a === 'call' || a === 'video') { const id = await getChat(); if (id) startCall(uid, id, a === 'video'); return; }
    if (a === 'search') { const id = await getChat(); if (id) searchSheet(id); return; }
    if (a === 'media') return mediaSheet(c.id);
    if (a === 'starred') return starredSheet(c.id);
    if (a === 'mute') return muteSheet(c, () => openContactInfo(uid, c.id));
    if (a === 'ttl') return ttlSheet(c, () => openContactInfo(uid, c.id));
    if (a === 'lock') { await toggleLock(c.id); return openContactInfo(uid, c.id); }
    if (a === 'enc') return encSheet();
    if (a === 'newgroup') return newGroupSheet([uid]);
    if (a === 'share') return pickChats('مشاركة جهة الاتصال مع', async (ids) => {
      for (const id of ids) await sendTo(id, 'contact', { ct: { u: uid, n: m.name, p: m.phone } });
      toast('تمت المشاركة');
    });
    if (a === 'clear') return clearChat(c.id);
    if (a === 'block') { await toggleBlock(uid); return openContactInfo(uid, c?.id); }
  };
}

// ---------- أدوات صفحات المعلومات ----------
function muteSheet(c, after) {
  const muted = isMuted(c);
  openSheet(`<p class="ask-t">كتم إشعارات «${esc(chatName(c))}»</p>
    <button class="act" data-m="8">8 ساعات</button>
    <button class="act" data-m="168">أسبوع</button>
    <button class="act" data-m="always">دائماً</button>
    ${muted ? '<button class="act red" data-m="off">إلغاء الكتم</button>' : ''}`, async (e) => {
    const v = e.target.closest('[data-m]')?.dataset.m;
    if (!v) return;
    closeSheet();
    const until = v === 'off' ? null : v === 'always' ? '9999-12-31T00:00:00Z' : new Date(Date.now() + Number(v) * 3600e3).toISOString();
    const { error } = await sb.from('chat_members').update({ muted_until: until }).eq('chat_id', c.id).eq('user_id', S.me);
    if (error) return toast('ما تغيّر');
    c.muted_until = until;
    renderList();
    toast(until ? 'تم كتم الإشعارات' : 'رجعت الإشعارات');
    after?.();
  });
}
function ttlSheet(c, after) {
  const opts = [[0, 'إيقاف'], [86400, '24 ساعة'], [604800, '7 أيام'], [7776000, '90 يوم']];
  openSheet(`<p class="ask-t">الرسائل الجديدة تختفي من المحادثة بعد المدة اللي تختارها</p>
    ${opts.map(([v, l]) => `<button class="act" data-t="${v}"><span class="ic">${(c.ttl || 0) === v ? ICON.check : ''}</span>${l}</button>`).join('')}`, async (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    closeSheet();
    const v = Number(b.dataset.t) || null;
    const { error } = await sb.from('chats').update({ ttl_seconds: v }).eq('id', c.id);
    if (error) return toast('ما تغيّر');
    c.ttl = v;
    await sysMsg(c.id, v ? `${myName()} شغّل الرسائل ذاتية الاختفاء. الرسائل الجديدة تختفي بعد ${ttlLabel(v)}` : `${myName()} أوقف الرسائل ذاتية الاختفاء`);
    if (S.open?.id === c.id) renderHeader();
    renderList();
    after?.();
  });
}
function encSheet() {
  openSheet(`<h3>التشفير</h3><div class="form"><p style="margin:0">الرسائل والصور والرسائل الصوتية والقصص تتشفر على جوالك قبل ما تطلع، بمفتاح مأخوذ من كلمة سر العائلة. السيرفر يخزنها مشفرة وما يقدر يقراها.</p>
    <p style="margin:0">المكالمات تروح مباشرة بين الجوالين ومشفرة تلقائياً.</p>
    <p class="hint">اللي ما يتشفر: الأسماء والأرقام، وأسماء القروبات ووصفها، وأوقات الرسائل.</p></div>`);
}
async function clearChat(chatId) {
  if (!(await ask('تمسح كل الرسائل من هذي المحادثة عندك؟ أهلك بتبقى عندهم.', 'مسح محتوى الدردشة', true))) return;
  const { error } = await sb.from('chat_members').update({ cleared_at: new Date().toISOString() }).eq('chat_id', chatId).eq('user_id', S.me);
  if (error) return toast('ما انمسحت');
  S.msgCache?.delete(chatId);
  await loadChats();
  renderList();
  if (S.open?.id === chatId) { S.open.chat = chatOf(chatId) || S.open.chat; await loadOpenMessages(); }
  toast('تم مسح المحادثة');
}
async function toggleBlock(uid) {
  if (S.blocked.has(uid)) {
    await sb.from('blocks').delete().eq('blocker', S.me).eq('blocked', uid);
    S.blocked.delete(uid);
    toast(`ألغيت حظر ${nameOf(uid)}`);
  } else {
    if (!(await ask(`تحظر ${nameOf(uid)}؟ ما راح يقدر يراسلك أو يتصل عليك.`, 'حظر', true))) return;
    const { error } = await sb.from('blocks').insert({ blocker: S.me, blocked: uid });
    if (error) return toast('ما انحظر');
    S.blocked.add(uid);
    toast(`حظرت ${nameOf(uid)}`);
  }
  if (S.open) syncComposer();
}
function shareInvite() {
  const link = location.origin + location.pathname;
  const text = `تعال انضم لقروب العائلة في ${CONFIG.APP_NAME}\n${link}\nسجّل برقم جوالك، وبعدين اسألني عن كلمة سر العائلة.`;
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else navigator.clipboard?.writeText(text).then(() => toast('تم نسخ الرابط، أرسله لهم'), () => toast(link));
}

async function mediaSheet(chatId) {
  const { data } = await sb.from('messages').select('*').eq('chat_id', chatId).eq('kind', 'image').order('created_at', { ascending: false }).limit(300);
  const items = await Promise.all((data || []).map(async (r) => ({ ...r, b: await decSafe(r.body) })));
  const pics = items.filter((x) => x.b?.m?.p);
  openSheet(`<h3>الصور</h3>${pics.length
    ? `<div class="grid">${pics.map((x) => `<button class="gcell" data-id="${x.id}"><img data-media="${esc(x.b.m.p)}" data-type="image/jpeg" alt=""></button>`).join('')}</div>`
    : emptyState(ICON.image, 'ما فيه صور في هذي المحادثة')}`, async (e) => {
    const img = e.target.closest('.gcell img');
    if (img?.src) viewImage(img.src);
  });
}
async function starredSheet(chatId) {
  const { data: st } = await sb.from('stars').select('message_id').eq('chat_id', chatId).order('created_at', { ascending: false });
  const ids = (st || []).map((r) => r.message_id);
  const { data } = ids.length ? await sb.from('messages').select('*').in('id', ids) : { data: [] };
  const items = await Promise.all((data || []).map(async (r) => ({ ...r, b: await decSafe(r.body) })));
  items.sort((x, y) => ts(y.created_at) - ts(x.created_at));
  openSheet(`<h3>الرسائل المميزة بنجمة</h3>${items.length ? items.map((m) => resultRow(m)).join('') : emptyState(ICON.star, 'ما فيه رسائل مميزة', 'اضغط على أي رسالة واختر «تمييز بنجمة»')}`, (e) => openResult(e, chatId));
}
const resultRow = (m) => `<button class="row res" data-mid="${m.id}">${avatar(m.sender, 'sm')}<div class="row-main"><div class="row-top"><b>${esc(nameOf(m.sender))}</b><time>${listTime(m.created_at)}</time></div><div class="row-sub"><span>${previewHTML(m.kind, m.b)}</span></div></div></button>`;
async function openResult(e, chatId) {
  const r = e.target.closest('[data-mid]');
  if (!r) return;
  closeSheet();
  if (infoIsOpen()) { history.back(); await new Promise((x) => setTimeout(x, 250)); }
  if (S.open?.id !== chatId) await openChat(chatId);
  jumpTo(r.dataset.mid);
}
async function searchSheet(chatId) {
  openSheet(`<h3>بحث في المحادثة</h3><div class="form"><input id="srch" type="search" placeholder="اكتب كلمة…" autocomplete="off"></div><div id="srchRes"><p class="empty">جاري تجهيز الرسائل…</p></div>`, (e) => openResult(e, chatId));
  const { data } = await sb.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(1500);
  const all = (await Promise.all((data || []).map(async (r) => ({ ...r, b: await decSafe(r.body) })))).filter((m) => m.b?.t && m.kind !== 'system');
  const run = () => {
    const q = ($('#srch')?.value || '').trim();
    const box = $('#srchRes');
    if (!box) return;
    if (!q) { box.innerHTML = `<p class="empty">ابحث في ${all.length} رسالة</p>`; return; }
    const hits = all.filter((m) => m.b.t.includes(q)).slice(0, 80);
    box.innerHTML = hits.length ? hits.map(resultRow).join('') : '<p class="empty">ما فيه نتائج</p>';
    hydrate(box);
  };
  const inp = $('#srch');
  if (!inp) return;
  inp.oninput = run;
  inp.focus();
  run();
}

// ---------- قفل الدردشة برمز ----------
function lockedSet() { try { return new Set(JSON.parse(localStorage.getItem('lamma-locked') || '[]')); } catch (e) { return new Set(); } }
const isLocked = (id) => lockedSet().has(id);
function saveLocked(set) { try { localStorage.setItem('lamma-locked', JSON.stringify([...set])); } catch (e) { /* ignore */ } }
async function pinHash(pin) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lamma-pin:' + S.me + ':' + pin));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function storedPin() { try { return localStorage.getItem('lamma-pin'); } catch (e) { return null; } }
async function toggleLock(id) {
  const set = lockedSet();
  if (set.has(id)) {
    if (!(await pinSheet('enter'))) return;
    set.delete(id);
    toast('تم فك قفل الدردشة');
  } else {
    if (!storedPin()) { if (!(await pinSheet('create'))) return; }
    set.add(id);
    S.unlocked.add(id);
    toast('الدردشة صارت مقفلة على هذا الجهاز');
  }
  saveLocked(set);
  renderList();
}
function pinSheet(mode) {
  return new Promise((resolve) => {
    let pin = '', first = null, done = false;
    const title = () => (mode === 'create' ? (first ? 'أعد كتابة الرمز للتأكيد' : 'اختر رمز من 4 أرقام لقفل الدردشات') : 'اكتب رمز القفل');
    const draw = (err) => {
      $('#pinT').textContent = err || title();
      $('#pinT').classList.toggle('bad', !!err);
      $$('#pinDots i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
    };
    const fin = (v) => { if (done) return; done = true; resolve(v); };
    openSheet(`<div class="pin"><p id="pinT"></p><div id="pinDots"><i></i><i></i><i></i><i></i></div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}<span></span><button data-n="0">0</button><button data-n="del" aria-label="مسح">${ICON.del}</button></div></div>`, async (e) => {
      const n = e.target.closest('[data-n]')?.dataset.n;
      if (!n) return;
      if (n === 'del') { pin = pin.slice(0, -1); return draw(); }
      if (pin.length >= 4) return;
      pin += n;
      draw();
      if (pin.length < 4) return;
      await new Promise((r) => setTimeout(r, 120));
      if (mode === 'create') {
        if (!first) { first = pin; pin = ''; return draw(); }
        if (first !== pin) { first = null; pin = ''; return draw('الرمزين مو متطابقين، جرّب من جديد'); }
        try { localStorage.setItem('lamma-pin', await pinHash(pin)); } catch (x) { /* ignore */ }
        fin(true); closeSheet();
      } else {
        if ((await pinHash(pin)) === storedPin()) { fin(true); closeSheet(); }
        else { pin = ''; draw('الرمز غلط'); try { navigator.vibrate?.([40, 40, 40]); } catch (x) { /* ignore */ } }
      }
    }, () => fin(false));
    draw();
  });
}

// ---------- الأصوات ----------
function soundsSheet() {
  const p = soundPrefs();
  const row = (k, label, sub) => `<button class="ir" data-snd="${k}"><span class="ir-t"><span>${label}</span><small>${sub}</small></span><span class="switch${p[k] ? ' on' : ''}"><i></i></span></button>`;
  openSheet(`<h3>الأصوات</h3><div class="ig sheet-ig">
    ${row('taps', 'صوت الضغط', 'نقرة خفيفة لما تضغط الأزرار')}
    ${row('msgs', 'أصوات الرسائل', 'لما ترسل أو توصلك رسالة والتطبيق مفتوح')}
    ${row('games', 'أصوات الألعاب', 'العجلة، والفوز، والإجابات')}
  </div>
  <p class="section-t" style="margin:14px 20px 6px">نغمة الرسائل (اضغط عشان تسمعها)</p>
  <div class="form"><div class="seg" id="sndStyle">${Object.entries(SOUND_STYLES).map(([k, l]) => `<button type="button" data-st="${k}" class="${p.style === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
  <p class="hint" style="margin:0 20px">إذا الجوال على الصامت، ما تسمع الأصوات.</p>`, (e) => {
    const st = e.target.closest('[data-st]');
    if (st) {
      setSoundPref('style', st.dataset.st);
      $$('#sndStyle button').forEach((x) => x.classList.toggle('on', x === st));
      sfx('send', true);
      setTimeout(() => sfx('receive', true), 650);
      return;
    }
    const b = e.target.closest('[data-snd]');
    if (!b) return;
    const k = b.dataset.snd;
    const v = !soundPrefs()[k];
    setSoundPref(k, v);
    b.querySelector('.switch').classList.toggle('on', v);
    if (v) sfx(k === 'taps' ? 'toggle' : k === 'msgs' ? 'receive' : 'ding');
    renderSettings();
  });
}

// ---------- المظهر والألوان ----------
function colorsSheet() {
  const p = colorPrefs();
  const d = isDark();
  const sw = (key, set, cur) => `<div class="swatches" data-k="${key}">${Object.entries(set).map(([k, v]) =>
    `<button data-v="${k}" class="${cur === k ? 'on' : ''}" style="background:${d ? v.d : v.l}" aria-label="${v.n || k}"></button>`).join('')}</div>`;
  openSheet(`<h3>المظهر والألوان</h3>
    <div class="form"><div class="seg" id="modeSeg">${[['dark', 'داكن'], ['light', 'فاتح'], ['auto', 'حسب الجوال']].map(([k, l]) => `<button type="button" data-th="${k}" class="${themeMode() === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="color-preview"><div class="them"><div class="bub"><div class="txt">هلا والله، كيفك؟</div></div></div><div class="me"><div class="bub"><div class="txt">بخير الحمدلله 🌿</div></div></div></div>
    <p class="section-t">لون التطبيق</p>${sw('accent', ACCENTS, p.accent)}
    <p class="section-t">لون رسايلك</p>${sw('mine', MINE, p.mine)}
    <p class="section-t">لون رسايل أهلك</p>${sw('theirs', THEIRS, p.theirs)}
    <div class="form" style="margin-top:8px"><button class="btn ghost" id="colReset">رجّع الألوان الأصلية</button></div>`, (e) => {
    const th = e.target.closest('[data-th]');
    if (th) { applyTheme(th.dataset.th); renderSettings(); return colorsSheet(); }
    if (e.target.id === 'colReset') { try { localStorage.removeItem('lamma-colors'); } catch (x) { /* ignore */ } applyColors(); return colorsSheet(); }
    const b = e.target.closest('.swatches button');
    if (!b) return;
    const k = b.closest('[data-k]').dataset.k;
    const np = { ...colorPrefs(), [k]: b.dataset.v };
    try { localStorage.setItem('lamma-colors', JSON.stringify(np)); } catch (x) { /* ignore */ }
    applyColors();
    $$(`[data-k="${k}"] button`).forEach((x) => x.classList.toggle('on', x === b));
  });
}

// ================= القصص =================
const STORY_BG = ['#9E2B25', '#C8932E', '#2E7D6B', '#3B5BA5', '#7A4E9E', '#2B1D14', '#B4572F'];
async function loadStories() {
  const { data } = await sb.from('stories').select('*').order('created_at');
  const all = data || [];
  const cutoff = Date.now() - DAY;
  const expired = all.filter((s) => s.user_id === S.me && ts(s.created_at) < cutoff);
  if (expired.length) cleanupStories(expired);
  const fresh = all.filter((s) => ts(s.created_at) >= cutoff);
  S.stories = await Promise.all(fresh.map(async (s) => ({ ...s, b: await decSafe(s.body) })));
  const { data: v } = await sb.from('story_views').select('*');
  S.seen = new Set();
  S.views = new Map();
  for (const x of v || []) {
    if (x.user_id === S.me) S.seen.add(x.story_id);
    else { const arr = S.views.get(x.story_id) || []; arr.push(x); S.views.set(x.story_id, arr); }
  }
}
async function cleanupStories(list) {
  for (const s of list) {
    try {
      const b = await decJSON(S.key, s.body);
      if (b.m?.p) await sb.storage.from('media').remove([b.m.p]);
    } catch (e) { /* ignore */ }
    await sb.from('stories').delete().eq('id', s.id);
  }
}
function storyGroups() {
  const cutoff = Date.now() - DAY;
  const by = new Map();
  for (const s of S.stories) {
    if (ts(s.created_at) < cutoff) continue;
    if (!by.has(s.user_id)) by.set(s.user_id, []);
    by.get(s.user_id).push(s);
  }
  // القصص بترتيب نشرها: الأقدم أول، والجديدة تنضاف بعدها
  for (const list of by.values()) list.sort((a, b) => ts(a.created_at) - ts(b.created_at));
  const groups = [...by.entries()].map(([uid, list]) => ({ uid, list, last: ts(list[list.length - 1].created_at), unseen: list.some((s) => !S.seen.has(s.id)) }));
  groups.sort((a, b) => b.last - a.last);
  return groups;
}
function renderStories() {
  const g = storyGroups();
  const mine = g.find((x) => x.uid === S.me);
  const others = g.filter((x) => x.uid !== S.me);
  const fresh = others.filter((x) => x.unseen), seen = others.filter((x) => !x.unseen);
  $('#storyDot').classList.toggle('hidden', !fresh.length);
  const tile = (x) => `<button class="story-tile" data-u="${x.uid}"><span class="ring${x.unseen ? '' : ' seen'}">${avatar(x.uid)}</span><span>${esc(short(x.uid))}</span></button>`;
  const myViews = mine ? mine.list.reduce((n, s) => n + (S.views.get(s.id)?.length || 0), 0) : 0;
  const pane = $('#pane-stories');
  pane.innerHTML = `
    <div class="story-strip">
      <button class="story-tile" data-add="1"><span class="ring add"><span class="av">${ICON.plus}</span></span><span>أضف قصة</span></button>
      ${mine ? `<button class="story-tile" data-u="${S.me}"><span class="ring seen">${avatar(S.me)}</span><span class="views-l">قصتي <i>${ICON.eye}${myViews}</i></span></button>` : ''}
    </div>
    ${fresh.length ? `<p class="section-t">جديدة</p><div class="story-strip">${fresh.map(tile).join('')}</div>` : ''}
    ${seen.length ? `<p class="section-t">تمت مشاهدتها</p><div class="story-strip">${seen.map(tile).join('')}</div>` : ''}
    ${!others.length ? emptyState(ICON.sparkle, 'ما فيه قصص من العائلة حالياً', 'القصص تختفي بعد 24 ساعة') : ''}`;
  hydrate(pane);
  pane.onclick = (e) => {
    if (e.target.closest('[data-add]')) return addStorySheet();
    const t = e.target.closest('[data-u]');
    if (!t) return;
    const order = [...(mine ? [mine] : []), ...fresh, ...seen];
    const gi = order.findIndex((x) => x.uid === t.dataset.u);
    const grp = order[gi];
    const first = grp.uid === S.me ? 0 : Math.max(0, grp.list.findIndex((s) => !S.seen.has(s.id)));
    openViewer(order.filter((x) => x.uid !== S.me || grp.uid === S.me), order.filter((x) => x.uid !== S.me || grp.uid === S.me).indexOf(grp), first);
  };
}

function myStoriesSheet(grp) {
  const rows = grp.list.map((st, i) => {
    const n = S.views.get(st.id)?.length || 0;
    const thumb = st.b.m
      ? `<span class="st-thumb"><img data-media="${esc(st.b.m.p)}" data-type="image/jpeg" alt=""></span>`
      : `<span class="st-thumb txt" style="background:${esc(st.b.bg || STORY_BG[0])}">${esc((st.b.t || '').slice(0, 14))}</span>`;
    return `<button class="row st-row" data-i="${i}">${thumb}<div class="row-main"><div class="row-text"><b>${esc(listTime(st.created_at))}</b><span>${ICON.eye} ${n} مشاهدة</span></div></div></button>`;
  }).join('');
  openSheet(`<h3>قصصي (${grp.list.length})</h3>${rows}<div class="form" style="margin-top:8px"><button class="btn" data-i="0">شاهد الكل من البداية</button></div>`, (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    closeSheet();
    setTimeout(() => openViewer([grp], 0, Number(b.dataset.i)), 220);
  });
  hydrate($('#sheet'));
}

function addStorySheet() {
  openSheet(`<h3>قصة جديدة</h3>
    <button class="act" data-a="text"><span class="ic">${ICON.pen}</span>كتابة نص</button>
    <button class="act" data-a="photo"><span class="ic">${ICON.image}</span>صورة</button>
    <input type="file" id="storyFile" accept="image/*" hidden>`, (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'text') { closeSheet(); storyComposer(); }
    if (a === 'photo') $('#storyFile').click();
  });
  $('#storyFile').onchange = (e) => { const f = e.target.files[0]; closeSheet(); if (f) storyComposer(f); };
}
function storyComposer(file) {
  const v = $('#viewer');
  let bg = STORY_BG[0];
  const url = file ? URL.createObjectURL(file) : null;
  v.className = 'overlay';
  v.style.background = file ? '#000' : bg;
  v.innerHTML = `
    <div class="sv-head" style="padding-top:calc(var(--safe-t) + 10px)"><button class="glass-btn dark" data-a="x" aria-label="إغلاق">${ICON.close}</button><div></div></div>
    ${file ? `<div class="sv-body"><img src="${url}" alt=""></div>` : '<div class="composer-story"><textarea id="stTxt" maxlength="400" placeholder="اكتب شي…"></textarea></div>'}
    ${file ? '' : `<div class="colors">${STORY_BG.map((c, i) => `<button data-c="${c}" style="background:${c}" class="${i ? '' : 'on'}"></button>`).join('')}</div>`}
    <div class="sv-foot">${file ? '<input id="stCap" maxlength="200" placeholder="أضف تعليق…">' : '<span style="flex:1"></span>'}<button class="send" data-a="go" aria-label="نشر">${ICON.send}</button></div>`;
  history.pushState({ v: 1 }, '');
  if (!file) setTimeout(() => $('#stTxt')?.focus(), 50);
  v.onclick = async (e) => {
    const c = e.target.closest('[data-c]');
    if (c) { bg = c.dataset.c; v.style.background = bg; $$('.colors button', v).forEach((x) => x.classList.toggle('on', x === c)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'x') return history.back();
    if (a !== 'go') return;
    const text = (file ? $('#stCap').value : $('#stTxt').value).trim();
    if (!file && !text) return toast('اكتب شي');
    e.target.closest('button').disabled = true;
    try {
      let b;
      if (file) {
        const { blob } = await compressImage(file, 1440);
        const path = newPath();
        mediaCache.set(path, Promise.resolve(URL.createObjectURL(blob)));
        await uploadTo(path, blob);
        b = { m: { p: path, type: 'image/jpeg' }, t: text };
      } else b = { t: text, bg };
      const id = crypto.randomUUID();
      const { data, error } = await sb.from('stories').insert({ id, body: await encJSON(S.key, b) }).select('created_at').single();
      if (error) throw error;
      if (!S.stories.some((s) => s.id === id)) S.stories.push({ id, user_id: S.me, created_at: data.created_at, b });
      renderStories();
      if (url) URL.revokeObjectURL(url);
      history.back();
      toast('انتشرت قصتك');
    } catch (err) {
      console.error(err);
      toast('ما انتشرت القصة');
      e.target.closest('button').disabled = false;
    }
  };
}

let SV = null;
function openViewer(groups, gi, si) {
  SV = { groups, gi, si, paused: false };
  history.pushState({ v: 1 }, '');
  showStory();
}
function closeViewer() {
  if (SV) { clearTimeout(SV.t); cancelAnimationFrame(SV.raf); SV = null; }
  const v = $('#viewer');
  v.classList.add('hidden');
  v.innerHTML = '';
  v.style.background = '';
  v.onclick = v.onpointerdown = v.onpointerup = v.onpointermove = v.onpointercancel = null;
  v.style.transform = v.style.opacity = v.style.transition = v.style.borderRadius = '';
}
function storyStep(d) {
  if (!SV) return;
  const g = SV.groups[SV.gi];
  SV.si += d;
  if (SV.si >= g.list.length) { SV.gi++; SV.si = 0; }
  else if (SV.si < 0) { SV.gi--; SV.si = SV.gi >= 0 ? SV.groups[SV.gi].list.length - 1 : 0; }
  if (SV.gi < 0 || SV.gi >= SV.groups.length) return history.back();
  showStory();
}
async function showStory() {
  const g = SV.groups[SV.gi];
  const s = g.list[SV.si];
  const mine = g.uid === S.me;
  const v = $('#viewer');
  clearTimeout(SV.t); cancelAnimationFrame(SV.raf);
  v.className = 'overlay';
  v.style.background = s.b.m ? '#000' : (s.b.bg || STORY_BG[0]);
  const nViews = S.views.get(s.id)?.length || 0;
  v.innerHTML = `
    <div class="sv-bars">${g.list.map((_, i) => `<i class="${i < SV.si ? 'done' : ''}"><b></b></i>`).join('')}</div>
    <div class="sv-head">${avatar(g.uid, 'sm')}<div><b>${esc(nameOf(g.uid))}</b><small>${listTime(s.created_at)}</small></div>
      ${mine ? `<button class="glass-btn dark" data-a="del" aria-label="حذف">${ICON.trash}</button>` : ''}<button class="glass-btn dark" data-a="x" aria-label="إغلاق">${ICON.close}</button></div>
    ${s.b.m
      ? `<div class="sv-body photo" id="svBody"><img class="bgblur" data-media="${esc(s.b.m.p)}" data-type="image/jpeg" alt=""><img class="main" data-media="${esc(s.b.m.p)}" data-type="image/jpeg" alt=""></div><div class="sv-tap"></div>`
      : `<div class="sv-body" id="svBody">${esc(s.b.t)}</div>`}
    ${s.b.m && s.b.t ? `<div class="sv-cap">${esc(s.b.t)}</div>` : ''}
    ${mine
      ? `<div class="sv-foot" style="justify-content:center"><button class="viewers" data-a="views">${ICON.eye}<span>${nViews} مشاهدة</span></button></div>`
      : `<div class="sv-quick">${['❤️', '😂', '😮', '👏', '🙏'].map((e) => `<button data-q="${e}">${e}</button>`).join('')}</div>
         <div class="sv-foot"><input id="svReply" placeholder="رد على ${esc(short(g.uid))}…"><button class="send" data-a="reply" aria-label="إرسال">${ICON.send}</button></div>`}`;
  hydrate(v);
  if (!mine && !S.seen.has(s.id)) {
    S.seen.add(s.id);
    sb.from('story_views').upsert({ story_id: s.id, user_id: S.me }, { onConflict: 'story_id,user_id', ignoreDuplicates: true }).then(() => {});
    renderStories();
  }
  const run = () => {
    const bar = v.querySelectorAll('.sv-bars i b')[SV.si];
    const LEN = 6000;
    let start = performance.now() - (SV.elapsed || 0);
    const tick = (now) => {
      if (!SV) return;
      if (SV.paused) { start = now - SV.elapsed; SV.raf = requestAnimationFrame(tick); return; }
      SV.elapsed = now - start;
      if (bar) bar.style.width = Math.min(100, (SV.elapsed / LEN) * 100) + '%';
      if (SV.elapsed >= LEN) { SV.elapsed = 0; storyStep(1); return; }
      SV.raf = requestAnimationFrame(tick);
    };
    SV.raf = requestAnimationFrame(tick);
  };
  SV.elapsed = 0;
  // نجهز صورة القصة اللي بعدها عشان ما تطلع فاضية
  const nx = g.list[SV.si + 1] || SV.groups[SV.gi + 1]?.list[0];
  if (nx?.b?.m) loadMedia(nx.b.m.p, 'image/jpeg').catch(() => {});
  const img = v.querySelector('#svBody img.main') || v.querySelector('#svBody img');
  if (img && !img.complete) {
    SV.paused = true;
    img.addEventListener('load', () => { if (SV) SV.paused = false; }, { once: true });
    setTimeout(() => { if (SV) SV.paused = false; }, 8000);
  } else SV.paused = false;
  run();

  const inp = v.querySelector('#svReply');
  if (inp) {
    inp.onfocus = () => { SV.paused = true; };
    inp.onblur = () => { if (SV) SV.paused = false; };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); storyReply(g.uid, s, inp.value); } };
  }
  swipeDown(v, {
    onStart: () => { SV.paused = true; },
    onEnd: () => { if (SV && document.activeElement !== inp) SV.paused = false; },
    onTap: (e) => {
      if (!SV || !e.target.closest('.sv-body,.sv-cap,.sv-bars,.sv-tap,.sv-head')) return;
      if (e.target.closest('button')) return;
      // الضغط على يسار الشاشة يرجع للقصة اللي قبل، وأي مكان ثاني يروح للي بعدها
      storyStep(e.clientX < innerWidth / 3 ? -1 : 1);
    },
  });
  v.onclick = async (e) => {
    const q = e.target.closest('[data-q]');
    if (q) return storyReply(g.uid, s, q.dataset.q);
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'x') history.back();
    else if (a === 'reply') storyReply(g.uid, s, inp.value);
    else if (a === 'views') {
      SV.paused = true;
      const list = (S.views.get(s.id) || []).sort((x, y) => ts(y.seen_at) - ts(x.seen_at));
      openSheet(`<h3>شاهدها ${list.length}</h3>${list.map((x) => `<div class="row">${avatar(x.user_id, 'sm')}<div class="row-main"><div class="row-top"><b>${esc(nameOf(x.user_id))}</b><time>${listTime(x.seen_at)}</time></div></div></div>`).join('') || '<p class="empty">ما أحد شافها بعد</p>'}`, null, () => { if (SV) SV.paused = false; });
    } else if (a === 'del') {
      SV.paused = true;
      if (!(await ask('تحذف هذي القصة؟', 'حذف القصة', true))) { if (SV) SV.paused = false; return; }
      await cleanupStories([{ id: s.id, body: await encJSON(S.key, s.b) }]);
      S.stories = S.stories.filter((x) => x.id !== s.id);
      g.list = g.list.filter((x) => x.id !== s.id);
      renderStories();
      if (!g.list.length) history.back();
      else { SV.si = Math.min(SV.si, g.list.length - 1); showStory(); }
    }
  };
}
async function storyReply(uid, s, text) {
  text = (text || '').trim();
  if (!text) return;
  const chatId = await openDirect(uid);
  if (!chatId) return;
  if (!chatOf(chatId)) await loadChats();
  await sendTo(chatId, 'story', { t: text, s: { id: s.id, t: (s.b.t || '').slice(0, 80), bg: s.b.bg || '#000', p: s.b.m ? 1 : 0 } });
  const inp = $('#svReply');
  if (inp) { inp.value = ''; inp.blur(); }
  toast('تم إرسال ردك');
  await loadChats();
  renderList();
}

// ================= الإعدادات =================
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; installTip(); });
function installTip() {
  const tip = $('#installTip');
  if (!tip || !S.me) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem('lamma-tip') === '1'; } catch (e) { /* ignore */ }
  if (standalone || dismissed || (!isIOS && !installEvt)) return tip.classList.add('hidden');
  tip.innerHTML = isIOS
    ? `<i class="pv">${ICON.install}</i><span>ثبّت لمّة: اضغط زر المشاركة <i class="pv">${ICON.share}</i> ثم «إضافة إلى الشاشة الرئيسية»</span><button class="icon-btn" data-x aria-label="إخفاء">${ICON.close}</button>`
    : `<i class="pv">${ICON.install}</i><span>ثبّت لمّة على جوالك كتطبيق</span><button class="btn" data-i style="padding:7px 14px">تثبيت</button><button class="icon-btn" data-x aria-label="إخفاء">${ICON.close}</button>`;
  tip.classList.remove('hidden');
  tip.onclick = async (e) => {
    if (e.target.closest('[data-i]') && installEvt) { installEvt.prompt(); installEvt = null; tip.classList.add('hidden'); }
    if (e.target.closest('[data-x]')) { try { localStorage.setItem('lamma-tip', '1'); } catch (x) { /* ignore */ } tip.classList.add('hidden'); }
  };
}

function b64uBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function pushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIOS && !standalone ? 'ios' : 'no';
  return Notification.permission;
}
async function setupPush(interactive) {
  const st = pushState();
  if (st === 'ios') { if (interactive) toast('على الآيفون: ثبّت التطبيق على الشاشة الرئيسية أولاً، وافتحه من هناك', 4500); return; }
  if (st === 'no') { if (interactive) toast('جهازك ما يدعم الإشعارات'); return; }
  if (st === 'denied') { if (interactive) toast('الإشعارات مقفلة. فعّلها من إعدادات الجوال للتطبيق', 4000); return; }
  if (st === 'default' && !interactive) return;
  if (st === 'default' && (await Notification.requestPermission()) !== 'granted') return renderSettings();
  try {
    const reg = await navigator.serviceWorker.ready;
    const key = b64uBytes(CONFIG.VAPID_PUBLIC_KEY);
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      const old = sub.options?.applicationServerKey;
      if (old && new Uint8Array(old).join() !== key.join()) { await sub.unsubscribe(); sub = null; }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const { error } = await sb.from('push_subs').upsert({ endpoint: sub.endpoint, user_id: S.me, sub: sub.toJSON() });
    if (error) throw error;
    // نتأكد إنه انحفظ فعلاً
    const { data: chk } = await sb.from('push_subs').select('endpoint').eq('endpoint', sub.endpoint).maybeSingle();
    if (!chk) throw new Error('الاشتراك ما انحفظ في قاعدة البيانات');
    S.pushErr = '';
    if (interactive) toast('تم تفعيل الإشعارات');
  } catch (e) {
    console.error('push setup', e);
    S.pushErr = e?.message || String(e);
    if (interactive) toast('ما قدرنا نفعّل الإشعارات: ' + S.pushErr, 4500);
  }
  renderSettings();
}

// تقرير الأخطاء: معلومات الجهاز + آخر الأخطاء، تنسخه وترسله
async function diagReport() {
  const vv = window.visualViewport;
  const safeB = getComputedStyle(document.documentElement).getPropertyValue('--safe-b');
  let sub = 'لا';
  try { const reg = await navigator.serviceWorker?.getRegistration(); sub = (await reg?.pushManager?.getSubscription()) ? 'نعم' : 'لا'; } catch (e) { sub = 'خطأ'; }
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden';
  document.body.appendChild(probe); const sb_ = probe.offsetHeight; probe.remove();
  const lines = [
    `لمّة ${APP_VER} · ${new Date().toLocaleString('en-GB')}`,
    `الجهاز: ${navigator.userAgent}`,
    `مثبّت: ${standalone ? 'نعم' : 'لا'} · الشاشة ${screen.width}x${screen.height} · النافذة ${innerWidth}x${innerHeight} · المرئي ${vv ? Math.round(vv.width) + 'x' + Math.round(vv.height) + ' +' + Math.round(vv.offsetTop) : '-'} · الأمان تحت ${sb_}px ${safeB.trim()}`,
    `الإشعارات: ${('Notification' in window) ? Notification.permission : 'غير مدعوم'} · اشتراك الجهاز: ${sub} · وضع الصوت: ${navigator.audioSession?.type || '-'}`,
    `الاتصال الفوري: ${S.ch?.state || '-'} · المحادثات ${S.chats.length} · الأعضاء ${S.members.size}`,
    '— آخر الأخطاء —',
  ];
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(LOGK) || '[]'); } catch (e) { /* ignore */ }
  if (!arr.length) lines.push('ما فيه أخطاء مسجلة');
  arr.slice().reverse().forEach((x) => lines.push(`${new Date(x.t).toLocaleString('en-GB')} [${x.k}]${x.n ? ' ×' + x.n : ''} ${x.m}`));
  return lines.join('\n');
}
async function diagSheet() {
  const txt = await diagReport();
  openSheet(`<h3>تقرير الأخطاء</h3><div class="form">
    <p class="hint">إذا صار شي غريب في التطبيق، انسخ التقرير وأرسله لي (لحاتم أو لـ Claude). ما فيه أي رسائل ولا كلمات سر.</p>
    <pre class="diag" id="diagTxt"></pre>
    <button class="btn" id="diagCopy">نسخ التقرير</button>
    <button class="btn ghost" id="diagClear">مسح السجل</button></div>`);
  $('#diagTxt').textContent = txt;
  $('#diagCopy').onclick = () => navigator.clipboard?.writeText(txt).then(() => toast('انسخ، الصقه في المحادثة'), () => {
    const r = document.createRange(); r.selectNodeContents($('#diagTxt')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    toast('حددناه لك، اضغط نسخ');
  });
  $('#diagClear').onclick = () => { try { localStorage.removeItem(LOGK); } catch (e) { /* ignore */ } closeSheet(); renderSettings(); toast('انمسح السجل'); };
}

// صفحة الإشعارات: تجربة وتشخيص
function pushSheet() {
  openSheet(`<h3>الإشعارات</h3><div class="form">
    <p>الإشعارات مفعّلة على هذا الجهاز. جرّبها: اضغط الزر، وبعدها <b>اطلع من التطبيق</b> للشاشة الرئيسية، وخلال 8 ثواني يوصلك إشعار تجربة.</p>
    <button class="btn" id="pushTest">أرسل لي إشعار تجربة</button>
    <button class="btn ghost" id="pushRe">إعادة تفعيل الإشعارات</button>
    <p class="hint" id="pushRes"></p>
    <p class="hint">إذا ما وصل: افتح <b>الإعدادات</b> في الجوال ← <b>الإشعارات</b> ← <b>لمّة</b>، وتأكد أن «السماح بالإشعارات» و«الشعارات» شغّالة، وأن وضع التركيز (عدم الإزعاج) مطفي.</p>
  </div>`);
  $('#pushRe').onclick = async () => {
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); } } catch (e) { /* ignore */ }
    await setupPush(true);
    $('#pushRes') && ($('#pushRes').textContent = 'تم. جرّب إشعار التجربة الحين.');
  };
  $('#pushTest').onclick = async () => {
    const out = $('#pushRes');
    out.textContent = 'نرسل…';
    await setupPush(false);
    const { data, error } = await sb.functions.invoke('notify', { body: { kind: 'test', delay: 7 } });
    if (error) {
      let d = '';
      try { d = JSON.stringify(await error.context?.json?.()); } catch (e) { d = String(error.message || error); }
      out.textContent = 'ما اشتغلت وظيفة الإشعارات: ' + (d || error.message);
      return;
    }
    if (data?.subs === undefined) out.textContent = 'وظيفة الإشعارات في Supabase قديمة. حدّثها من صفحة «كود الإشعارات» واضغط Deploy.';
    else if (!data.subs) out.textContent = 'ما لقينا جهازك مسجّل. اضغط «إعادة تفعيل الإشعارات» وجرّب مرة ثانية.' + (S.pushErr ? ' (' + S.pushErr + ')' : '');
    else if (data.sent) out.textContent = `انرسل لـ ${data.sent} جهاز. إذا ما طلع، المشكلة من إعدادات الإشعارات في الجوال.`;
    else out.textContent = 'رفض سيرفر أبل الإشعار: ' + (data.errors || []).join(' | ');
    if (out.textContent && !data?.sent) logErr('إشعار', out.textContent);
  };
}

function meTab() {
  const t = $('#meTab');
  if (!t || !S.members.get(S.me)) return;
  t.innerHTML = avatar(S.me, 'xs');
  hydrate(t);
}

// ================= المكالمات =================
async function renderCalls() {
  const pane = $('#pane-calls');
  const { data } = await sb.from('messages').select('*').eq('kind', 'call').order('created_at', { ascending: false }).limit(60);
  const rows = [];
  for (const m of data || []) {
    const c = chatOf(m.chat_id);
    if (!c || !c.is_direct) continue;
    rows.push({ m, c, b: await decSafe(m.body) });
  }
  if (!rows.length) {
    pane.innerHTML = emptyState(ICON.phone, 'ما فيه مكالمات بعد', 'اضغط زر الإضافة فوق واختر أحد من العائلة');
    return;
  }
  pane.innerHTML = '<ul class="list">' + rows.map(({ m, c, b }) => {
    const out = m.sender === S.me;
    const missed = b.c?.st !== 'ok';
    const label = `<i class="pv${missed ? ' miss' : ''}">${out ? ICON.out : ICON.in}</i>` + (out ? 'صادرة' : 'واردة') + ' · ' + (b.c?.v ? 'فيديو' : 'صوت') + (b.c?.st === 'ok' ? ' · ' + dur(b.c.d) : missed ? (out ? ' · ما رد' : ' · فائتة') : '');
    return `<li class="row call-row" data-chat="${c.id}" data-u="${c.other}" data-v="${b.c?.v ? 1 : 0}">${avatar(c.other)}
      <div class="row-main"><div class="row-top"><b${missed && !out ? ' style="color:var(--danger)"' : ''}>${esc(chatName(c))}</b><time>${listTime(m.created_at)}</time></div>
      <div class="row-sub"><span class="${missed ? 'missed' : ''}">${label}</span><button class="cb" aria-label="اتصال">${b.c?.v ? ICON.video : ICON.phone}</button></div></div></li>`;
  }).join('') + '</ul>';
  hydrate(pane);
  pane.onclick = (e) => {
    const r = e.target.closest('.call-row');
    if (!r) return;
    if (e.target.closest('.cb')) startCall(r.dataset.u, r.dataset.chat, r.dataset.v === '1');
    else openChat(r.dataset.chat);
  };
}
function callPickSheet() {
  openSheet(`<h3>اتصال جديد</h3>${memberRows()}`, async (e) => {
    const r = e.target.closest('[data-u]');
    if (!r) return;
    closeSheet();
    const id = await openDirect(r.dataset.u);
    if (id) startCall(r.dataset.u, id, false);
  });
}

function renderSettings() {
  const me = S.members.get(S.me) || {};
  const ps = pushState();
  const theme = themeMode();
  const pushLabel = { granted: 'مفعّلة', denied: 'مقفلة من الجوال', default: 'اضغط للتفعيل', ios: 'ثبّت التطبيق أولاً', no: 'غير مدعومة' }[ps];
  const pane = $('#pane-settings');
  pane.innerHTML = `
    <div class="card set-card profile">
      <button class="link av-edit" data-a="photo" aria-label="تغيير صورتك">${avatar(S.me, 'lg')}<span class="av-cam">${ICON.camera}</span></button>
      <button class="link" data-a="photo" style="font-size:14px">${S.members.get(S.me)?.avatar ? 'تغيير الصورة' : 'أضف صورة'}</button>
      <h2>${esc(me.name || '')}</h2><p>${esc(me.about || 'اكتب نبذة عنك')}</p>
      <button class="btn ghost" data-a="edit" style="padding:8px 20px">تعديل الملف</button>
      <input type="file" id="avFile" accept="image/*" hidden>
    </div>
    <div class="card set-card">
      <h4>التطبيق</h4>
      <button class="set-row" data-a="push"><span class="ic tile" style="--c:#D9822B">${ICON.bell}</span><span>الإشعارات</span><small>${pushLabel}</small></button>
      ${standalone ? '' : `<button class="set-row" data-a="install"><span class="ic tile" style="--c:#3B82C4">${ICON.install}</span><span>تثبيت على الشاشة الرئيسية</span><i class="chev">${ICON.chevron}</i></button>`}
      <button class="set-row" data-a="sounds"><span class="ic tile" style="--c:#E5484D">${ICON.speaker}</span><span>الأصوات</span><small>${Object.values(soundPrefs()).filter(Boolean).length ? 'شغّالة' : 'مطفية'}</small><i class="chev">${ICON.chevron}</i></button>
      <button class="set-row" data-a="colors"><span class="ic tile" style="--c:#5B4B8A">${ICON.palette}</span><span>المظهر والألوان</span><small>${{ auto: 'تلقائي', light: 'فاتح', dark: 'داكن' }[theme]}</small><i class="chev">${ICON.chevron}</i></button>
    </div>
    <div class="card set-card">
      <h4>العائلة</h4>
      <button class="set-row" data-a="members"><span class="ic tile" style="--c:#2E7D6B">${ICON.users}</span><span>أفراد العائلة</span><small>${S.members.size}</small></button>
      <button class="set-row" data-a="invite"><span class="ic tile" style="--c:#C8932E">${ICON.mail}</span><span>دعوة أحد من العائلة</span><i class="chev">${ICON.chevron}</i></button>
    </div>
    <div class="card set-card">
      <button class="set-row" data-a="lock"><span class="ic tile" style="--c:#6B7280">${ICON.lock}</span><span>عن التشفير</span><i class="chev">${ICON.chevron}</i></button>
      <button class="set-row" data-a="diag"><span class="ic tile" style="--c:#0F8B8D">${ICON.info}</span><span>تقرير الأخطاء</span><small>${(() => { try { return JSON.parse(localStorage.getItem(LOGK) || '[]').length || ''; } catch (e) { return ''; } })()}</small><i class="chev">${ICON.chevron}</i></button>
      <button class="set-row" data-a="out" style="color:var(--danger)"><span class="ic tile" style="--c:#D93025">${ICON.logout}</span><span>تسجيل خروج من هذا الجهاز</span></button>
    </div>
    <p class="lock-note">لمّة · نسخة ${APP_VER} · مشفّر من طرف لطرف</p>`;
  hydrate(pane);
  $('#avFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) changeAvatar(f); };
  pane.onclick = async (e) => {
    const th = e.target.closest('[data-th]');
    if (th) { applyTheme(th.dataset.th); return renderSettings(); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'sounds') soundsSheet();
    else if (a === 'colors') colorsSheet();
    else if (a === 'photo') $('#avFile').click();
    else if (a === 'edit') editProfileSheet();
    else if (a === 'diag') diagSheet();
    else if (a === 'push') { if (pushState() === 'granted') pushSheet(); else setupPush(true); }
    else if (a === 'install') {
      if (installEvt) { installEvt.prompt(); installEvt = null; }
      else openSheet(`<h3>تثبيت لمّة</h3><div class="form">${isIOS
        ? `<p>1. افتح الرابط في <b>Safari</b><br>2. اضغط زر المشاركة <i class="pv">${ICON.share}</i> تحت<br>3. اختر «إضافة إلى الشاشة الرئيسية»<br>4. افتح لمّة من الأيقونة وفعّل الإشعارات</p>`
        : '<p>1. افتح الرابط في <b>Chrome</b><br>2. اضغط القائمة <b>⋮</b> فوق<br>3. اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</p>'}</div>`);
    } else if (a === 'members') {
      openSheet(`<h3>أفراد العائلة</h3><div class="row">${avatar(S.me, 'sm')}<div class="row-main"><div class="row-top"><b>${esc(me.name)} (أنت)</b></div></div></div>${memberRows()}`, async (ev) => {
        const r = ev.target.closest('[data-u]');
        if (!r) return;
        closeSheet();
        const id = await openDirect(r.dataset.u);
        if (id) openChat(id);
      });
    } else if (a === 'invite') {
      const link = location.origin + location.pathname;
      const text = `تعال انضم لقروب العائلة في ${CONFIG.APP_NAME}\n${link}\nسجّل برقم جوالك، وبعدين اسألني عن كلمة سر العائلة.`;
      if (navigator.share) navigator.share({ text }).catch(() => {});
      else navigator.clipboard?.writeText(text).then(() => toast('تم نسخ الرابط، أرسله لهم'));
    } else if (a === 'lock') {
      openSheet(`<h3>التشفير</h3><div class="form"><p style="margin:0">كل الرسائل والصور والرسائل الصوتية والقصص تتشفر <b>على جوالك</b> قبل ما تطلع، بمفتاح مأخوذ من كلمة سر العائلة. السيرفر يخزنها مشفرة وما يقدر يقراها.</p>
        <p style="margin:0">المكالمات تروح مباشرة بين الجوالين ومشفرة تلقائياً.</p>
        <p class="hint">اللي ما يتشفر: أسماء الأفراد وأرقامهم، أسماء القروبات، وأوقات الرسائل.</p>
        <p class="hint">تنبيه: لو نسيتوا كلمة سر العائلة، ما فيه طريقة لاسترجاع الرسائل.</p></div>`);
    } else if (a === 'out') {
      if (await ask('تسجيل خروج من هذا الجهاز؟ بتحتاج كلمة سر العائلة لما ترجع.', 'تسجيل خروج', true)) logout();
    }
  };
}
function editProfileSheet() {
  const me = S.members.get(S.me) || {};
  openSheet(`<h3>تعديل الملف</h3><div class="form">
    <div class="pf-photo">${avatar(S.me, 'lg')}<div><button type="button" class="btn ghost" id="pfPic">${me.avatar ? 'تغيير الصورة' : 'أضف صورة'}</button>${me.avatar ? '<button type="button" class="link danger-link" id="pfNoPic">إزالة الصورة</button>' : ''}</div></div>
    <label>الاسم<input id="pfName" maxlength="40" value="${esc(me.name)}"></label>
    <label>نبذة<input id="pfAbout" maxlength="80" value="${esc(me.about || '')}" placeholder="مثال: الحمدلله دائماً"></label>
    <label>اللون<div class="emojis" id="pfColor">${COLORS.map((c) => `<button type="button" data-c="${c}" style="background:${c}" class="${c === me.color ? 'on' : ''}"></button>`).join('')}</div></label>
    <button class="btn" id="pfSave">حفظ</button></div>`);
  hydrate($('#sheet'));
  $('#pfPic').onclick = () => { closeSheet(); setTimeout(() => $('#avFile')?.click(), 50); };
  if ($('#pfNoPic')) $('#pfNoPic').onclick = async () => {
    const old = me.avatar;
    const { error } = await sb.from('members').update({ avatar: null }).eq('id', S.me);
    if (error) return toast('ما انشالت');
    if (old) sb.storage.from('media').remove([old]);
    me.avatar = null;
    closeSheet(); meTab(); renderSettings(); renderList(); toast('انشالت الصورة');
  };
  let color = me.color;
  $('#pfColor').onclick = (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    color = b.dataset.c;
    $$('#pfColor button').forEach((x) => x.classList.toggle('on', x === b));
  };
  $('#pfSave').onclick = async () => {
    const name = $('#pfName').value.trim();
    if (!name) return toast('اكتب اسمك');
    const patch = { name, about: $('#pfAbout').value.trim(), color };
    const { error } = await sb.from('members').update(patch).eq('id', S.me);
    if (error) return toast('ما انحفظ');
    Object.assign(me, patch);
    S.members.set(S.me, me);
    closeSheet();
    renderSettings();
    meTab();
  };
}
async function changeAvatar(file) {
  try {
    toast('جاري رفع الصورة…');
    const { blob } = await compressImage(file, 512, 0.85);
    const path = newPath();
    mediaCache.set(path, Promise.resolve(URL.createObjectURL(blob)));
    await uploadTo(path, blob);
    const me = S.members.get(S.me);
    const old = me?.avatar;
    const { error } = await sb.from('members').update({ avatar: path }).eq('id', S.me);
    if (error) throw error;
    if (old) sb.storage.from('media').remove([old]);
    me.avatar = path;
    meTab();
    renderSettings();
    renderList();
    toast('تم تحديث صورتك');
  } catch (e) {
    console.error(e);
    toast('ما انرفعت الصورة');
  }
}

boot().catch((e) => {
  console.error(e);
  $('#bootMsg').textContent = 'صار خطأ: ' + (e.message || e);
});
