// لمّة · الألعاب الجديدة: بلوت، دومينو، ارسم وخمّن، من سيربح المليون، لعبة الحروف
import * as BL from './baloot.js';
import * as DM from './domino.js';
import * as VC from './voice.js';
import { MQ } from './million.js';
import { QUIZ, MILLION_MID, MILLION_HARD, DRAW_WORDS, HUROOF_LETTERS, HUROOF_CATS, normWord } from './gamedata.js';

let A;                    // أدوات من games.js
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const C = () => A.C();
const me = () => C().me();
const esc = (s) => C().esc(s);
const sfx = (n) => C().sfx?.(n);
const buzz = (p) => C().haptic?.(Array.isArray(p) ? 'strong' : 'light');
export function initExt(api) { A = api; }

export const EXT = new Set(['baloot', 'domino', 'draw', 'million', 'huroof']);
export const SEQ_KINDS = new Set(['baloot', 'domino']);
export const EXT_INFO = {
  baloot: { n: 'بلوت', d: '4 لاعبين في فريقين، والكمبيوتر يكمّل', c: '#0E7C66' },
  domino: { n: 'دومينو', d: 'من 2 إلى 4، والكمبيوتر يكمّل', c: '#4B3F8F' },
  draw: { n: 'ارسم وخمّن', d: 'واحد يرسم والباقي يخمّنون', c: '#D9822B' },
  million: { n: 'من سيربح المليون', d: '15 سؤال لين المليون', c: '#1E4FA3' },
  huroof: { n: 'لعبة الحروف', d: 'اسم، حيوان، نبات، جماد، بلاد', c: '#B83280' },
};
export const EXT_ICON = {
  baloot: svg('<rect x="4" y="5" width="9.5" height="14" rx="1.8" transform="rotate(-10 8.75 12)"/><rect x="10.5" y="5" width="9.5" height="14" rx="1.8" transform="rotate(10 15.25 12)"/><path d="M15.3 10.3c.9-.9 2.3-.2 2.1 1-.2 1.1-2.1 2.3-2.1 2.3s-1.9-1.2-2.1-2.3c-.2-1.2 1.2-1.9 2.1-1z"/>'),
  domino: svg('<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M7 12h10"/><circle cx="10" cy="6" r=".9"/><circle cx="14" cy="9" r=".9"/><circle cx="12" cy="16.5" r=".9"/>'),
  draw: svg('<path d="M4 20c2.5 0 4-1.2 4-3.5 0-1.3-1-2.3-2.2-2.3C4.5 14.2 4 15.4 4 17v3zM8.2 14.4 18.6 4a1.8 1.8 0 0 1 2.6 2.6L10.8 17"/>'),
  million: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.7.9-2.7 2.1 0 2.8 5.6 1.5 5.6 4.3 0 1.2-1.2 2.2-2.9 2.2-1.2 0-2.3-.6-2.8-1.5M12 6.3v1.5M12 16.4v1.4"/>'),
  huroof: svg('<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M8 15.5c0-2 1.6-3 3.2-3H15M15 9v6.5M8.5 9.2v.1"/>'),
};

// ---------- أدوات مشتركة ----------
const movesOf = (id) => A.movesOf(id);
const seqMoves = (g) => movesOf(g.id).filter((m) => /^m\d+$/.test(m.key)).sort((a, b) => Number(a.key.slice(1)) - Number(b.key.slice(1)));
const tms = (m) => (m?.created_at ? Date.parse(m.created_at) : Date.now());
const nameOfSeat = (g, seat) => {
  const u = g.state.seats[seat];
  return u === 'bot' ? `الكمبيوتر ${['أ', 'ب', 'ج', 'د'][seat]}` : u === me() ? 'أنت' : C().short(u);
};
const avatarSeat = (g, seat, cls = 'sm') => {
  const u = g.state.seats[seat];
  if (u === 'bot') return avatarSeat0(g, seat, cls);
  const vs = VC.voiceState(g.id).people.get(u);
  return `<span class="vu-wrap${vs ? ' in-voice' : ''}${vs?.muted ? ' muted' : ''}" data-vu="${u}">${avatarSeat0(g, seat, cls)}${vs ? `<i class="vu-mic">${vs.muted ? MIC_OFF : MIC}</i>` : ''}</span>`;
};
const MIC = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
const MIC_OFF = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16"/></svg>';
// شريط الصوت فوق اللعبة: ادخل وسولف مع اللاعبين
function voiceBar(g) {
  const humans = g.state.seats.filter((u) => u !== 'bot');
  if (!humans.includes(me()) || humans.length < 2) return '';
  const v = VC.voiceState(g.id);
  const others = [...v.people.keys()].filter((u) => u !== me());
  const names = others.map((u) => esc(C().short(u))).join('، ');
  if (!v.joined) {
    return `<div class="vc-bar${others.length ? ' live' : ''}"><button class="vc-join" data-a="vjoin">${MIC}<span>${others.length ? `${names} ${others.length > 1 ? 'يسولفون' : 'يسولف'}، ادخل معهم` : 'سولف مع اللاعبين بالصوت'}</span></button></div>`;
  }
  return `<div class="vc-bar on"><span class="vc-st">${others.length ? `معك: ${names}` : 'تنتظر أحد يدخل…'}</span>
    <button class="vc-btn${v.muted ? ' off' : ''}" data-a="vmute" aria-label="المايك">${v.muted ? MIC_OFF : MIC}</button>
    <button class="vc-btn leave" data-a="vleave" aria-label="اطلع من الصوت"><svg viewBox="0 0 24 24"><path d="M3.5 14.5c4.7-4.4 12.3-4.4 17 0l-2.3 2.6-3.4-1.6v-2.6a12 12 0 0 0-5.6 0v2.6l-3.4 1.6z"/></svg></button></div>`;
}
const avatarSeat0 = (g, seat, cls = 'sm') => (g.state.seats[seat] === 'bot'
  ? `<span class="av ${cls} bot-av">${svg('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9.5 13v.1M14.5 13v.1M9.5 16h5"/>')}</span>`
  : C().avatar(g.state.seats[seat], cls));

// نرسل حركة: نحطها عندنا على طول، وإذا رفضها السيرفر (أحد سبقنا) نرجع نجيب الحركات
async function post(g, key, data, upsert) {
  const row = { game_id: g.id, user_id: me(), key, data };
  const arr = A.G.moves.get(g.id) || [];
  const j = arr.findIndex((m) => m.user_id === me() && m.key === key);
  const local = { ...row, created_at: new Date().toISOString() };
  if (j >= 0) arr[j] = local; else arr.push(local);
  A.G.moves.set(g.id, arr);
  A.renderGame();
  const q = upsert ? C().sb.from('game_moves').upsert(row) : C().sb.from('game_moves').insert(row);
  const { error } = await q;
  if (error) {
    const { data: mv } = await C().sb.from('game_moves').select('*').eq('game_id', g.id);
    A.G.moves.set(g.id, mv || []);
    A.renderGame();
    return false;
  }
  return true;
}
const nextKey = (g) => 'm' + seqMoves(g).length;
const notifyTurn = (g, uid) => { if (uid && uid !== 'bot' && uid !== me() && !C().isHere?.(uid)) C().notify(g.chat_id, 'turn', uid); };

// ============================================================
//                          البلوت
// ============================================================
function balootState(g) {
  const mv = seqMoves(g).map((m) => ({ ...m.data, _t: tms(m) }));
  return BL.replay(g.id, g.state, mv);
}
// ---------- شكل الأوراق (رسم SVG حاد على كل الشاشات) ----------
const RANK_LABEL = { A: 'A', K: 'K', Q: 'Q', J: 'J', 10: '10', 9: '9', 8: '8', 7: '7' };
const SUIT_PATH = {
  h: 'M50 92C50 92 4 62 4 32C4 16 15 6 28 6C38 6 46 12 50 21C54 12 62 6 72 6C85 6 96 16 96 32C96 62 50 92 50 92Z',
  d: 'M50 2L90 50L50 98L10 50Z',
  s: 'M50 4C50 4 6 36 6 60C6 74 16 83 28 83C37 83 43 79 47 72C46 83 41 91 33 96H67C59 91 54 83 53 72C57 79 63 83 72 83C84 83 94 74 94 60C94 36 50 4 50 4Z',
  c: 'M50 4A21 21 0 0 0 33 37A21 21 0 1 0 46 71C45 82 40 90 33 96H67C60 90 55 82 54 71A21 21 0 1 0 67 37A21 21 0 0 0 50 4Z',
};
function cardSprite() {
  if (document.getElementById('pcSprite')) return;
  const d = document.createElement('div');
  d.innerHTML = `<svg id="pcSprite" width="0" height="0" style="position:absolute;stroke:none;fill:#000" aria-hidden="true"><defs>
    ${Object.entries(SUIT_PATH).map(([k, p]) => `<symbol id="su-${k}" viewBox="0 0 100 100"><path d="${p}"/></symbol>`).join('')}
    <linearGradient id="pcBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#F4F1EA"/></linearGradient>
    <linearGradient id="pcGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F9DC6B"/><stop offset=".5" stop-color="#D9A521"/><stop offset="1" stop-color="#A9780F"/></linearGradient>
    <linearGradient id="pcRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E23B3B"/><stop offset="1" stop-color="#A3121F"/></linearGradient>
    <linearGradient id="pcBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3561C9"/><stop offset="1" stop-color="#1B2F78"/></linearGradient>
    <clipPath id="pcClip"><rect x="21" y="16" width="58" height="108" rx="4"/></clipPath>
    <radialGradient id="pcFrame" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#FFFDF6"/><stop offset="1" stop-color="#F1E6C6"/></radialGradient>
  </defs></svg>`;
  document.body.appendChild(d.firstChild);
}
const PIPS = {
  7: [[32, 28], [68, 28], [50, 49], [32, 70], [68, 70], [32, 112], [68, 112]],
  8: [[32, 28], [68, 28], [50, 49], [32, 70], [68, 70], [50, 91], [32, 112], [68, 112]],
  9: [[32, 28], [68, 28], [32, 56], [68, 56], [50, 70], [32, 84], [68, 84], [32, 112], [68, 112]],
  10: [[32, 28], [68, 28], [50, 42], [32, 56], [68, 56], [32, 84], [68, 84], [50, 98], [32, 112], [68, 112]],
};
const use = (s, x, y, w, flip) => `<use href="#su-${s}" x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}"${flip ? ` transform="rotate(180 ${x} ${y})"` : ''}/>`;
// نص الصورة (الملك والبنت والولد) ونقلبه تحت مثل الورق الحقيقي
function faceHalf(r, red) {
  const robe = red ? 'url(#pcRed)' : 'url(#pcBlue)';
  const trim = red ? '#1B2F78' : '#A3121F';
  const hair = r === 'Q' ? '#7A3E12' : r === 'K' ? '#5B4636' : '#2B1B10';
  let back = '', head = '';
  if (r === 'K') head = `<path d="M43 47.5C44 53 46.5 55.5 50 55.5C53.5 55.5 56 53 57 47.5C55 49.5 52.5 50 50 50C47.5 50 45 49.5 43 47.5Z" fill="${hair}"/>
    <path d="M38.5 35L38.5 23L44 28L50 19L56 28L61.5 23L61.5 35Z" fill="url(#pcGold)" stroke="#8A6208" stroke-width=".8"/><circle cx="50" cy="19" r="1.8" fill="#E23B3B"/><path d="M38.5 33H61.5" stroke="#8A6208" stroke-width="1"/>`;
  if (r === 'Q') {
    back = `<path d="M39.5 44C38 34 42 30.5 50 30.5C58 30.5 62 34 60.5 44C61.5 52 60 56 58 58H42C40 56 38.5 52 39.5 44Z" fill="${hair}"/>`;
    head = `<path d="M41.5 34.5L41.5 27.5L45.7 31L50 24.5L54.3 31L58.5 27.5L58.5 34.5Z" fill="url(#pcGold)" stroke="#8A6208" stroke-width=".8"/><circle cx="50" cy="24.5" r="1.4" fill="#3561C9"/>`;
  }
  if (r === 'J') head = `<path d="M40 37C40 27 45 23.5 50 23.5C55 23.5 60 27 60 37Z" fill="${robe}"/><path d="M40 36.5H60" stroke="url(#pcGold)" stroke-width="2"/><circle cx="50" cy="23.8" r="2" fill="url(#pcGold)"/>`;
  return `<path d="M24 70C24 58 34 54 50 54C66 54 76 58 76 70Z" fill="${robe}"/>
    <path d="M43 55L50 66L57 55" fill="none" stroke="url(#pcGold)" stroke-width="2.2"/><path d="M24 69H76" stroke="${trim}" stroke-width="1.2"/>
    ${back}<ellipse cx="50" cy="42" rx="8.6" ry="9.6" fill="#F6D7B8" stroke="#C99A75" stroke-width=".6"/>
    <circle cx="46.8" cy="41" r="1" fill="#3A2A1E"/><circle cx="53.2" cy="41" r="1" fill="#3A2A1E"/><path d="M47.6 46.4Q50 48 52.4 46.4" stroke="#B5523F" stroke-width=".9" fill="none" stroke-linecap="round"/>
    ${head}`;
}
export function cardHTML(id, cls = '', attrs = '') {
  cardSprite();
  const c = BL.cardOf(id);
  const red = c.s === 'h' || c.s === 'd';
  const col = red ? '#C8102E' : '#16181D';
  const lab = RANK_LABEL[c.r];
  const corner = `<text x="11.5" y="21" text-anchor="middle" font-size="${lab.length > 1 ? 17 : 20}" font-weight="800" letter-spacing="-1.5" font-family="Georgia, 'Times New Roman', serif">${lab}</text>${use(c.s, 11.5, 31, 13)}`;
  let mid;
  if (PIPS[c.r]) mid = PIPS[c.r].map(([x, y]) => use(c.s, x, y, c.r === '7' || c.r === '8' ? 20 : 18, y > 72)).join('');
  else if (c.r === 'A') mid = `${use(c.s, 50, 70, c.s === 's' ? 52 : 44)}${c.s === 's' ? '<circle cx="50" cy="66" r="4" fill="#fff" opacity=".9"/>' : ''}`;
  else {
    mid = `<rect x="21" y="16" width="58" height="108" rx="4" fill="url(#pcFrame)" stroke="url(#pcGold)" stroke-width="2"/>
      <g clip-path="url(#pcClip)"><g>${faceHalf(c.r, red)}</g><g transform="rotate(180 50 70)">${faceHalf(c.r, red)}</g></g>
      <rect x="21" y="16" width="58" height="108" rx="4" fill="none" stroke="${col}" stroke-opacity=".35" stroke-width=".8"/>
      ${use(c.s, 29, 25, 10)}${use(c.s, 71, 115, 10, true)}`;
  }
  return `<span class="pcard${red ? ' red' : ''} ${cls}" data-card="${id}" ${attrs}><svg class="pc-svg" viewBox="0 0 100 140" style="fill:${col}">
    <rect x=".75" y=".75" width="98.5" height="138.5" rx="9" fill="url(#pcBg)" stroke="#D9D4C7" stroke-width="1.5"/>
    ${corner}<g transform="rotate(180 50 70)">${corner}</g>${mid}</svg></span>`;
}
const backHTML = (cls = '') => `<span class="pcard back ${cls}"></span>`;
const sortHand = (hand, mode, trump) => {
  const so = { s: 0, h: 1, c: 2, d: 3 };
  const ord = (x) => { const c = BL.cardOf(x); return (mode === 'hokum' && c.s === trump ? -1 : so[c.s]) * 100 + ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'].indexOf(c.r); };
  return hand.slice().sort((a, b) => ord(a) - ord(b));
};
const modeLabel = (R) => (R.mode === 'sun' ? 'صن' : R.mode === 'hokum' ? `حكم ${BL.SUIT_CH[R.trump]}` : '');
const bidLabel = (b) => (b.v === 'sun' ? 'صن' : b.v === 'hokum' ? `حكم${b.s ? ' ' + BL.SUIT_CH[b.s] : ''}` : 'بس');

// ---------- توقيت الحركات (نحسبه بوقت وصولها لهالجهاز عشان الحركة تطلع مرة وحدة) ----------
const TRICK_SHOW = 1900, COLLECT_AT = 1050, SUM_UNTIL = 7900, TURN_MS = 60000;
function seenAt(g, i) {
  const k = g.id + ':' + i;
  if (!A.G.seenAt) A.G.seenAt = new Map();
  if (A.G.seenInit !== g.id) {
    A.G.seenOpen = Date.now() - Date.parse(g.created_at) < 3000 ? g.id : null;
    // أول ما تفتح اللعبة: كل الحركات القديمة نعتبرها شايفها من زمان (بدون حركة)
    A.G.seenInit = g.id;
    seqMoves(g).forEach((_, j) => A.G.seenAt.set(g.id + ':' + j, 0));
  }
  if (!A.G.seenAt.has(k)) A.G.seenAt.set(k, Date.now());
  return A.G.seenAt.get(k);
}
// متى خلصت آخر أكلة / آخر صكّة (بوقت هالجهاز)
function balootTiming(g, R) {
  const n = seqMoves(g).length;
  const lastSeen = n ? seenAt(g, n - 1) : Math.max(Date.parse(g.created_at), A.G.openAt || 0);
  const LT = R.lastTrick || (R.prev && !R.bids.length ? R.prev.lastTrick : null);
  const endedRound = !R.lastTrick && !!R.prev && !R.bids.length;
  const T = LT ? seenAt(g, LT.cards[3].i) : 0;
  const trickJustDone = LT && !R.trick.length && (R.phase === 'play' || endedRound) && T && Date.now() - T < TRICK_SHOW;
  const sumOn = endedRound && T && Date.now() - T >= TRICK_SHOW && Date.now() - T < SUM_UNTIL;
  // الوقت اللي يبدأ منه عداد اللاعب
  let base = Math.max(lastSeen, A.G.openAt || 0);
  if (LT && !R.trick.length) base = Math.max(base, T + (endedRound ? SUM_UNTIL : TRICK_SHOW));
  return { LT, T, endedRound, trickJustDone, sumOn, base, deadline: base + TURN_MS };
}

function renderBaloot(g) {
  clearTimeout(A.G.extRerender); clearTimeout(A.G.extRerender2);
  const st = balootState(g);
  const { R, score } = st;
  const seats = g.state.seats;
  const mySeat = seats.indexOf(me());
  const view = mySeat >= 0 ? mySeat : 0;
  const posOf = (s) => ['bottom', 'right', 'top', 'left'][(s - view + 4) % 4];
  const myTeam = BL.team(view);
  const now = Date.now();
  const tm = balootTiming(g, R);
  const showLast = tm.trickJustDone;
  const trickCards = showLast ? tm.LT.cards : R.trick;
  // نعيد الرسم لما تخلص الحركات (عرض الأكلة، ثم الحسبة)
  const wake = [];
  if (showLast) wake.push(tm.T + TRICK_SHOW - now);
  if (tm.sumOn) wake.push(tm.T + SUM_UNTIL - now);
  if (wake.length) A.G.extRerender = setTimeout(() => A.renderGame(), Math.max(60, Math.min(...wake) + 40));
  const winPos = showLast ? posOf(tm.LT.winner) : '';
  const collectDelay = showLast ? COLLECT_AT - (now - tm.T) : 0;
  const nMv = seqMoves(g).length;
  let dealStart = 0;
  if (tm.endedRound && tm.T) dealStart = tm.T + SUM_UNTIL;
  else if (!R.bids.length && !R.prev) dealStart = nMv ? seenAt(g, nMv - 1) : (A.G.seenOpen === g.id ? Date.parse(g.created_at) : 0);
  else if (R.phase === 'play' && !R.tricks.length && !R.trick.length) dealStart = seenAt(g, nMv - 1);
  const dealing = !!dealStart && now - dealStart < 1600 && !showLast && !tm.sumOn;
  if (dealing) A.G.extRerender2 = setTimeout(() => { if (A.G.open?.id === g.id) A.renderGame(); }, 1650 - (now - dealStart));
  const left = Math.max(0, Math.ceil((tm.deadline - now) / 1000));
  const timer = (s) => (R.turn === s && seats[s] !== 'bot' && R.phase !== 'over' && !showLast && !tm.sumOn ? `<span class="bt-timer${left <= 10 ? ' low' : ''}" data-deadline="${tm.deadline}">${left}</span>` : '');
  // اللاعبين حول الطاولة
  const seatBox = (s) => {
    const p = posOf(s);
    if (p === 'bottom') return '';
    const n = (showLast && tm.endedRound) || tm.sumOn ? 0 : R.hands[s].length;
    const lastBid = [...R.bids].reverse().find((b) => b.seat === s);
    const bubble = (R.phase === 'bid1' || R.phase === 'bid2') && lastBid ? `<span class="bt-bubble">${bidLabel(lastBid)}</span>` : '';
    return `<div class="bt-seat ${p}${R.turn === s && R.phase !== 'over' && !showLast ? ' on' : ''}${BL.team(s) === myTeam ? ' mate' : ''}">
      ${avatarSeat(g, s)}${timer(s)}<b>${esc(nameOfSeat(g, s))}</b>${R.dealer === s ? '<span class="bt-dealer">موزّع</span>' : ''}${R.buyer === s ? '<span class="bt-buy">المشتري</span>' : ''}
      <span class="bt-backs${dealing ? ' deal' : ''}">${Array.from({ length: Math.min(n, 8) }, (_, k) => `<i style="animation-delay:${k * 90 - (now - dealStart)}ms"></i>`).join('')}</span>${bubble}</div>`;
  };
  const center = (() => {
    if (showLast || (R.phase === 'play' && R.trick.length)) {
      return `<div class="bt-trick">${trickCards.map((t) => {
        const fly = `fly-${posOf(t.seat)}`;
        const d = -(now - seenAt(g, t.i));
        const coll = showLast ? ` collect to-${winPos}` : '';
        const style = `style="animation-delay:${d}ms${showLast ? `, ${collectDelay}ms` : ''}"`;
        return cardHTML(t.c, `played p-${posOf(t.seat)} ${fly}${coll}${showLast && t.seat === tm.LT.winner ? ' won' : ''}`, style);
      }).join('')}</div>`;
    }
    if (R.phase === 'bid1' || R.phase === 'bid2') {
      return `<div class="bt-face${dealing ? ' deal' : ''}" style="animation-delay:${600 - (now - dealStart)}ms">${cardHTML(R.faceUp, 'big')}<small>${R.phase === 'bid1' ? 'الورقة المكشوفة' : 'الجولة الثانية'}</small></div>`;
    }
    return '';
  })();
  // نتيجة الصكّة قدامك شوي وتختفي
  let sum = '';
  if (tm.sumOn && R.prev?.result) {
    const res = R.prev.result;
    sum = `<div class="bt-sum" style="animation-delay:${-(now - (tm.T + TRICK_SHOW))}ms"><small>نتيجة الصكّة</small>
      <div class="bt-sum-row"><div><span>لنا</span><b>${res.pts[myTeam]}</b></div><div><span>لهم</span><b>${res.pts[1 - myTeam]}</b></div></div></div>`;
  }
  const hideHand = (showLast && tm.endedRound) || tm.sumOn;
  const myHand = mySeat >= 0 && !hideHand ? sortHand(R.hands[mySeat], R.mode, R.trump) : [];
  const myTurn = mySeat >= 0 && R.turn === mySeat && R.phase !== 'over' && !showLast && !tm.sumOn;
  const legal = myTurn && R.phase === 'play' ? new Set(BL.legalCards(R.hands[mySeat], R.trick, R.mode, R.trump, mySeat)) : new Set();
  const dealerMe = mySeat >= 0 && R.dealer === mySeat && R.phase !== 'over' ? '<div class="bt-medeal"><span class="bt-dealer">أنت الموزّع</span></div>' : '';
  const handHTML = dealerMe + (mySeat >= 0 ? `<div class="bt-hand${myTurn && R.phase === 'play' ? ' live' : ''}${dealing ? ' deal' : ''}" style="--n:${myHand.length}">${myHand.map((c, i) =>
    cardHTML(c, legal.size ? (legal.has(c) ? 'legal' : 'dim') : '', `style="--i:${i};animation-delay:${i * 90 + 200 - (now - dealStart)}ms" ${legal.has(c) ? `data-play="${c}"` : ''}`)).join('')}</div>` : '<p class="hint center">أنت تتفرج</p>');
  // أزرار الشراء
  let controls = '';
  if (myTurn && R.phase === 'bid1') {
    const face = BL.cardOf(R.faceUp).s;
    controls = `<div class="bt-bid"><button class="btn" data-bid="sun">صن</button>${R.buyer === null ? `<button class="btn" data-bid="hokum">حكم ${BL.SUIT_CH[face]}</button>` : ''}<button class="btn ghost" data-bid="pass">بس</button></div>`;
  } else if (myTurn && R.phase === 'bid2') {
    const face = BL.cardOf(R.faceUp).s;
    controls = `<div class="bt-bid wrap"><button class="btn" data-bid="sun">صن</button>${BL.SUITS.filter((s) => s !== face).map((s) => `<button class="btn suit ${s === 'h' || s === 'd' ? 'red' : ''}" data-bid="hokum" data-s="${s}">حكم ${BL.SUIT_CH[s]}</button>`).join('')}<button class="btn ghost" data-bid="pass">بس</button></div>`;
  }
  let status;
  if (R.phase === 'over') status = st.winner === myTeam ? 'فزتوا بالقيم! 🎉' : 'فازوا عليكم هالمرة';
  else if (showLast) status = `الأكلة لـ ${nameOfSeat(g, tm.LT.winner)}`;
  else if (tm.sumOn) status = 'توزيع جديد…';
  else if (R.phase === 'play') status = myTurn ? 'دورك، العب ورقة' : `دور ${nameOfSeat(g, R.turn)}`;
  else status = myTurn ? 'دورك: تشتري ولا بس؟' : `${nameOfSeat(g, R.turn)} يقرر…`;
  // المشاريع (تبان في أول أكلة)
  let proj = '';
  if (R.phase === 'play' && R.tricks.length === 0) {
    const ps = [];
    R.projects.forEach((list, s) => list.forEach((p) => ps.push(`${esc(nameOfSeat(g, s))}: ${BL.PROJ_NAME[p.k]}`)));
    if (ps.length) proj = `<div class="bt-proj">مشاريع: ${ps.join(' · ')}</div>`;
  }
  const hist = st.history.filter((h) => !h.redeal);
  return `<div class="bt">${voiceBar(g)}
    <div class="bt-score"><div class="us"><small>لنا</small><b>${score[myTeam]}</b></div>
      <div class="mid"><span class="chip">${R.phase === 'play' || R.phase === 'over' ? modeLabel(R) : 'شراء'}</span><small>إلى ${st.target} · صكّة ${hist.length + 1}</small></div>
      <div class="them"><small>لهم</small><b>${score[1 - myTeam]}</b></div></div>
    <div class="bt-table felt">${[0, 1, 2, 3].map(seatBox).join('')}<div class="bt-center">${center}</div>${sum}</div>
    ${proj}
    <p class="g-status${myTurn ? ' mine' : ''}">${esc(status)}${myTurn ? ` <span class="bt-timer inline${left <= 10 ? ' low' : ''}" data-deadline="${tm.deadline}">${left}</span>` : ''}</p>
    ${R.phase !== 'over' && !showLast && !tm.sumOn ? staleBox(g) : ''}${controls}${handHTML}
    ${R.phase === 'over' ? `<div class="g-actions"><button class="btn ghost" data-a="chat">الدردشة</button><button class="btn" data-a="again-ext">قيم جديد</button></div>`
      : `<div class="g-actions"><button class="btn ghost" data-a="chat">الدردشة</button><button class="btn ghost" data-a="rules">طريقة اللعب</button></div>`}
    ${hist.length ? `<details class="bt-hist"><summary>سجل الصكّات (${hist.length})</summary>${hist.map((h, i) => `<div><span>${i + 1}. ${h.mode === 'sun' ? 'صن' : 'حكم ' + BL.SUIT_CH[h.trump]} · ${esc(nameOfSeat(g, h.buyer))}</span><b>${h.pts[myTeam]} - ${h.pts[1 - myTeam]}</b></div>`).join('')}</details>` : ''}
  </div>`;
}
function balootTurnUid(g, st) { const R = (st || balootState(g)).R; return R.phase === 'over' ? null : g.state.seats[R.turn]; }

// ============================================================
//                          الدومينو
// ============================================================
function dominoState(g) {
  const mv = seqMoves(g).map((m) => ({ ...m.data }));
  return DM.replay(g.id, g.state, mv);
}
const PIP_POS = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const half = (n) => `<span class="dh">${Array.from({ length: 9 }, (_, i) => `<i${PIP_POS[n].includes(i) ? ' class="p"' : ''}></i>`).join('')}</span>`;
export const tileHTML = (a, b, cls = '', attrs = '') => `<span class="dtile ${cls}" ${attrs}>${half(a)}<span class="dline"></span>${half(b)}</span>`;

// السلسلة: الأحجار ملصوقة في بعض وتلف مثل المربع داخل الطاولة
// تبدأ من النص، اليمين يمشي يمين ثم ينزل ويرجع يسار، واليسار يمشي يسار ثم يطلع ويرجع يمين
const DM_W = 10;
const DM_WIN_MS = 6000;   // عرض الطاولة بأنصاف الأحجار
const chalf = (n, hz) => `<span class="cth">${Array.from({ length: 9 }, (_, i) => { const j = hz ? (i % 3) * 3 + Math.floor(i / 3) : i; return `<i${PIP_POS[n].includes(j) ? ' class="p"' : ''}></i>`; }).join('')}</span>`;
function chainLayout(ch) {
  let i0 = 0;
  ch.forEach((t, k) => { if (t.i < ch[i0].i) i0 = k; });
  const out = [];
  const put = (k, x, y, w, h, first, second) => out.push({ k, x, y, w, h, first, second });
  const s0 = ch[i0];
  const dbl0 = s0.a === s0.b;
  const cy = 0;   // خط الصف الأوسط (نص الارتفاع)
  if (dbl0) put(i0, DM_W / 2 - 0.5, cy - 1, 1, 2, s0.a, s0.b);
  else put(i0, DM_W / 2 - 1, cy - 0.5, 2, 1, s0.a, s0.b);
  // دالة تمشي ذراع: dir = 1 يمين، -1 يسار، vdir = 1 تحت، -1 فوق
  const arm = (tiles, startX, dir, vdir) => {
    let x = startX, y = cy, d = dir, lastDbl = dbl0;
    for (const { t, k, a, b } of tiles) {
      const dbl = a === b;
      const need = dbl ? 1 : 2;
      const fits = d === 1 ? x + need <= DM_W : x - need >= 0;
      if (fits) {
        if (d === 1) { if (dbl) put(k, x, y - 1, 1, 2, a, b); else put(k, x, y - 0.5, 2, 1, a, b); x += need; }
        else { if (dbl) put(k, x - 1, y - 1, 1, 2, a, b); else put(k, x - 2, y - 0.5, 2, 1, b, a); x -= need; }
        lastDbl = dbl;
      } else {
        // لفّة: حجر واقف تحت (أو فوق) آخر نص، وبعدها نمشي بالعكس
        const cx = d === 1 ? x - 1 : x;
        const off = lastDbl ? 1 : 0.5;
        if (vdir === 1) { put(k, cx, y + off, 1, 2, a, b); y = y + off + 1.5; }
        else { put(k, cx, y - off - 2, 1, 2, b, a); y = y - off - 1.5; }
        x = d === 1 ? x - 1 : x + 1;
        d = -d;
        lastDbl = false;
      }
    }
  };
  const right = ch.slice(i0 + 1).map((t, j) => ({ t, k: i0 + 1 + j, a: t.a, b: t.b }));
  const left = ch.slice(0, i0).reverse().map((t, j) => ({ t, k: i0 - 1 - j, a: t.b, b: t.a }));
  arm(right, dbl0 ? DM_W / 2 + 0.5 : DM_W / 2 + 1, 1, 1);
  arm(left, dbl0 ? DM_W / 2 - 0.5 : DM_W / 2 - 1, -1, -1);
  return out;
}
function chainGrid(g, D, pickEnds) {
  const ch = D.chain;
  const items = chainLayout(ch);
  const minY = Math.min(...items.map((o) => o.y)), maxY = Math.max(...items.map((o) => o.y + o.h));
  const now = Date.now();
  const html = items.map((o) => {
    const t = ch[o.k];
    const hz = o.w === 2;
    const isLast = D.last && t.i === D.last.i;
    const endOk = (o.k === 0 && pickEnds.includes('L')) || (o.k === ch.length - 1 && pickEnds.includes('R'));
    const endAttr = o.k === 0 && pickEnds.includes('L') ? ' data-end="L"' : o.k === ch.length - 1 && pickEnds.includes('R') ? ' data-end="R"' : '';
    const style = `left:calc(var(--u) * ${o.x});top:calc(var(--u) * ${o.y - minY});width:calc(var(--u) * ${o.w});height:calc(var(--u) * ${o.h})${isLast ? `;animation-delay:${-(now - seenAt(g, t.i))}ms` : ''}`;
    return `<span class="ct ${hz ? 'h' : 'v'}${isLast ? ' last' : ''}${endOk ? ' end-ok' : ''}" style="${style}"${endAttr}>${chalf(o.first, hz)}${chalf(o.second, hz)}</span>`;
  }).join('');
  return `<div class="dm-path" style="--w:${DM_W};height:calc(var(--u) * ${maxY - minY})">${html}</div>`;
}

function renderDomino(g) {
  const st = dominoState(g);
  const { D, score, n } = st;
  const seats = g.state.seats;
  const mySeat = seats.indexOf(me());
  const myTurn = mySeat >= 0 && D.turn === mySeat && D.phase === 'play';
  const playable = myTurn ? DM.playable(st, mySeat) : [];
  const pick = A.G.dPick;
  const others = seats.map((u, s) => s).filter((s) => s !== mySeat);
  const dl = turnTiming(g).deadline;
  const left = Math.max(0, Math.ceil((dl - Date.now()) / 1000));
  const tmr = (cls = '') => `<span class="bt-timer${cls}${left <= 10 ? ' low' : ''}" data-deadline="${dl}">${left}</span>`;
  // اللاعبين حول الطاولة مثل البلوت: اللي بعدك يمين، واللي قبلك يسار، والباقي فوق
  const ordered = mySeat >= 0 ? Array.from({ length: n - 1 }, (_, k) => (mySeat + 1 + k) % n) : others;
  const posList = { 1: ['top'], 2: ['right', 'left'], 3: ['right', 'top', 'left'] }[ordered.length] || [];
  const players = ordered.map((s, k) => `<div class="dm-seat ${posList[k]}${D.turn === s && D.phase === 'play' ? ' on' : ''}">${avatarSeat(g, s)}${D.turn === s && D.phase === 'play' ? tmr() : ''}<b>${esc(nameOfSeat(g, s))}</b>
    <span class="dm-backs">${Array.from({ length: Math.min(D.hands[s].length, 8) }, () => '<i></i>').join('')}${D.hands[s].length > 8 ? `<em>+${D.hands[s].length - 8}</em>` : ''}</span><small>${score[s]} نقطة</small></div>`).join('');
  const hasSide = posList.includes('right'), hasTop = posList.includes('top');
  const pickEnds = myTurn && pick ? st.fits(pick) : [];
  const chain = D.chain.length ? chainGrid(g, D, pickEnds) : '<p class="hint dm-first">أول حجر يحدد الطرفين</p>';
  const hand = mySeat >= 0 ? D.hands[mySeat].map((t) => {
    const ok = playable.some((p) => p[0] === t[0] && p[1] === t[1]);
    const sel = pick && pick[0] === t[0] && pick[1] === t[1];
    return tileHTML(t[0], t[1], `vt${ok ? ' legal' : myTurn ? ' dim' : ''}${sel ? ' sel' : ''}`, ok ? `data-tile="${t[0]},${t[1]}"` : '');
  }).join('') : '';
  let controls = '';
  if (myTurn && pick) {
    const ends = st.fits(pick);
    if (ends.length > 1) controls = `<p class="hint center">وين تحطه؟ اضغط على الطرف المضيء أو اختر:</p><div class="bt-bid"><button class="btn" data-end="L">جنب ${D.L}</button><button class="btn" data-end="R">جنب ${D.Rv}</button></div>`;
  }
  if (myTurn && !playable.length) controls = D.yard.length ? '<div class="bt-bid"><button class="btn" data-dact="d">اسحب حجر</button></div>' : '<div class="bt-bid"><button class="btn" data-dact="x">مرّر (ما عندي)</button></div>';
  let status;
  if (D.phase === 'over') status = st.winner === mySeat ? 'فزت! كفو' : `فاز ${nameOfSeat(g, st.winner)}`;
  else status = myTurn ? (playable.length ? 'دورك، اختر حجر' : D.yard.length ? 'ما عندك حجر يركب، اسحب' : 'ما عندك، مرّر') : `دور ${nameOfSeat(g, D.turn)}`;
  // إعلان الفايز بالجولة: يطلع قدامك 6 ثواني
  let winBox = '';
  const endRes = D.phase === 'over' ? D.result : D.prev?.result && !D.chain.length ? D.prev.result : null;
  const nMv = seqMoves(g).length;
  if (endRes && nMv) {
    const endT = seenAt(g, nMv - 1);
    const age = Date.now() - endT;
    if (endT && age < DM_WIN_MS) {
      clearTimeout(A.G.extRerender);
      A.G.extRerender = setTimeout(() => { if (A.G.open?.id === g.id) A.renderGame(); }, DM_WIN_MS - age + 50);
      const w = endRes.winner;
      winBox = `<div class="dm-win" style="animation-delay:${-age}ms">${w >= 0
        ? `${avatarSeat(g, w, 'lg')}<b>${w === mySeat ? 'فزت بالجولة!' : `${esc(nameOfSeat(g, w))} فاز بالجولة`}</b><em>${endRes.gain} نقطة</em><small>${endRes.blocked ? 'انقفلت، وأقل مجموع ياخذ' : 'خلّص أحجاره'}</small>`
        : '<b>تعادل</b><small>انقفلت وما أحد أخذ نقاط</small>'}</div>`;
    }
  }
  let prev = '';
  if (D.prev?.result && !D.chain.length) {
    const r = D.prev.result;
    prev = `<div class="bt-prev"><b>${r.blocked ? 'انقفلت' : 'خلّصت'} الصكّة</b><span>${r.winner >= 0 ? `${esc(nameOfSeat(g, r.winner))} أخذ ${r.gain}` : 'تعادل، ما أحد أخذ'}</span></div>`;
  }
  return `<div class="dm">${voiceBar(g)}
    <div class="bt-score"><div class="us"><small>نقاطك</small><b>${mySeat >= 0 ? score[mySeat] : '-'}</b></div>
      <div class="mid"><span class="chip">إلى ${st.target}</span><small>صكّة ${D.round + 1}${D.yard.length ? ` · بالسوق ${D.yard.length}` : ''}</small></div>
      <div class="them"><small>الأعلى</small><b>${Math.max(...score)}</b></div></div>
    ${prev}
    <div class="dm-board felt${hasSide ? ' side' : ''}${hasTop ? ' top' : ''}">${players}<div class="dm-chain" id="dmChain">${chain}</div>${winBox}</div>
    <p class="g-status${myTurn ? ' mine' : ''}">${esc(status)}${myTurn ? ' ' + tmr(' inline') : ''}</p>
    ${staleBox(g)}${controls}
    <div class="dm-hand">${hand}</div>
    <div class="g-actions"><button class="btn ghost" data-a="chat">الدردشة</button>${D.phase === 'over' ? '<button class="btn" data-a="again-ext">لعبة جديدة</button>' : '<button class="btn ghost" data-a="rules">طريقة اللعب</button>'}</div>
  </div>`;
}

// ============================================================
//                         ارسم وخمّن
// ============================================================
const DRAW_SECS = 80, PICK_SECS = 40;
const COLORS = ['#111111', '#E5484D', '#F5A524', '#F7D93B', '#2FBF71', '#0EA5E9', '#3B5BDB', '#8B5CF6', '#EC4899', '#8B5E34', '#9CA3AF', '#FFFFFF'];
const SIZES = [4, 10, 20, 36];
const dnorm = (s) => normWord(String(s || '').replace(/\s+/g, '')).replace(/^ال/, '');
function editDist(a, b) {
  const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function wordChoices(g, r) {
  const R = A.seeded(g.id + ':w' + r);
  const used = new Set();
  for (let k = 0; k < r; k++) { const w = movesOf(g.id).find((m) => m.key === 'w' + k); if (w) used.add(w.data.i); }
  const pool = DRAW_WORDS.map((_, i) => i).filter((i) => !used.has(i));
  return A.shuffle(pool, R).slice(0, 3);
}
function drawState(g, now = Date.now()) {
  const P = g.state.players;
  const total = g.state.rounds;
  const mv = movesOf(g.id);
  const scores = new Map(P.map((u) => [u, 0]));
  let start = Date.parse(g.created_at);
  const rounds = [];
  for (let r = 0; r < total; r++) {
    const drawer = P[r % P.length];
    const w = mv.find((m) => m.key === 'w' + r && m.user_id === drawer);
    const k = mv.find((m) => m.key === 'k' + r);
    const guesses = mv.filter((m) => m.key.startsWith('g' + r + 'x')).sort((a, b) => tms(a) - tms(b));
    const word = w ? DRAW_WORDS[w.data.i] : null;
    const correct = [];
    if (word) {
      const target = dnorm(word);
      for (const gm of guesses) {
        if (gm.user_id === drawer || correct.some((c) => c.u === gm.user_id)) continue;
        if (dnorm(gm.data.t) === target) correct.push({ u: gm.user_id, t: tms(gm) });
      }
    }
    const pick = w ? tms(w) : null;
    const guessers = P.filter((u) => u !== drawer);
    let end;
    if (k) end = tms(k);
    else if (w) {
      end = pick + DRAW_SECS * 1000;
      if (guessers.length && correct.length >= guessers.length) end = Math.min(end, correct[correct.length - 1].t + 1500);
    } else end = null;
    const round = { r, drawer, word, wi: w?.data.i, pick, start, end, correct, guesses, skipped: !!k };
    rounds.push(round);
    if (end && end <= now) {
      // نقاط: أول واحد 100، وبعده أقل، والرسّام ياخذ 25 عن كل واحد خمّن صح
      correct.forEach((c, i) => scores.set(c.u, (scores.get(c.u) || 0) + Math.max(40, 100 - i * 20)));
      if (correct.length) scores.set(drawer, (scores.get(drawer) || 0) + 25 * correct.length);
      start = end;
      continue;
    }
    return { cur: round, rounds, scores, done: false, P };
  }
  return { cur: null, rounds, scores, done: true, P };
}
const maskWord = (word, frac, seed) => {
  const chars = [...word];
  const idx = chars.map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
  const R = A.seeded(seed);
  const order = A.shuffle(idx, R);
  const show = new Set(order.slice(0, frac >= 0.75 ? 2 : frac >= 0.5 ? 1 : 0));
  return chars.map((c, i) => (c === ' ' ? '<i class="sp"></i>' : show.has(i) ? `<b>${esc(c)}</b>` : '<b>_</b>')).join('');
};
function strokesOf(g, r) {
  const list = movesOf(g.id).filter((m) => m.key.startsWith('s' + r + 'x')).sort((a, b) => Number(a.key.split('x')[1]) - Number(b.key.split('x')[1]));
  const out = [];
  for (const m of list) {
    if (m.data.clr) out.length = 0;
    else if (m.data.u) out.pop();
    else out.push(m.data);
  }
  return out;
}
function paint(cv, strokes, extra) {
  const ctx = cv.getContext('2d');
  const k = cv.width / 1000;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // الرسمة المحفوظة نخزنها، وأثناء الرسم نضيف الخط الجديد فوقها بس (أسرع)
  const b = cv._base;
  let list = strokes;
  if (b && b.n === strokes.length && b.last === strokes[strokes.length - 1]) { ctx.putImageData(b.img, 0, 0); list = []; }
  else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  for (const s of list) drawOne(ctx, s, k);
  if (list.length || !b || b.n !== strokes.length) cv._base = { n: strokes.length, last: strokes[strokes.length - 1], img: ctx.getImageData(0, 0, cv.width, cv.height) };
  if (extra) drawOne(ctx, extra, k);
}
function drawOne(ctx, s, k) {
  {
    const p = s.p;
    if (s.f) { floodFill(ctx, Math.round(p[0] * k), Math.round(p[1] * k), s.c); return; }
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w * k;
    ctx.beginPath();
    ctx.moveTo(p[0] * k, p[1] * k);
    if (p.length === 2) ctx.lineTo(p[0] * k + 0.1, p[1] * k);
    else if (p.length === 4) ctx.lineTo(p[2] * k, p[3] * k);
    else {
      // خط ناعم: منحنى يمر بين النقاط بدل الزوايا
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
        ctx.quadraticCurveTo(p[i] * k, p[i + 1] * k, mx * k, my * k);
      }
      ctx.lineTo(p[p.length - 2] * k, p[p.length - 1] * k);
    }
    ctx.stroke();
  }
}
// سطل التلوين: يعبّي المنطقة المقفلة باللون
function floodFill(ctx, x0, y0, hex) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
  const img = ctx.getImageData(0, 0, W, H);
  const d = new Uint32Array(img.data.buffer);
  const n = parseInt(hex.slice(1), 16);
  const fill = (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16);   // ABGR
  const start = d[y0 * W + x0];
  if (start === (fill >>> 0) || start === fill) return;
  const sr = start & 255, sg = (start >> 8) & 255, sb = (start >> 16) & 255;
  const near = (v) => Math.abs((v & 255) - sr) + Math.abs(((v >> 8) & 255) - sg) + Math.abs(((v >> 16) & 255) - sb) < 90;
  const seen = new Uint8Array(W * H);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    let l = x;
    while (l > 0 && !seen[y * W + l - 1] && near(d[y * W + l - 1])) l--;
    let r = x;
    while (r < W - 1 && !seen[y * W + r + 1] && near(d[y * W + r + 1])) r++;
    for (let i = l; i <= r; i++) {
      const idx = y * W + i;
      if (seen[idx]) continue;
      seen[idx] = 1; d[idx] = fill;
      if (y > 0 && !seen[idx - W] && near(d[idx - W])) stack.push(i, y - 1);
      if (y < H - 1 && !seen[idx + W] && near(d[idx + W])) stack.push(i, y + 1);
    }
  }
  // نوسّع شوي عشان ما تبقى حواف بيضا جنب الخطوط
  for (let i = 0; i < W * H; i++) {
    if (seen[i]) continue;
    const x = i % W;
    if ((x > 0 && seen[i - 1] === 1) || (x < W - 1 && seen[i + 1] === 1) || (i >= W && seen[i - W] === 1) || (i < W * H - W && seen[i + W] === 1)) { d[i] = fill; seen[i] = 2; }
  }
  ctx.putImageData(img, 0, 0);
}
function renderDraw(g, el, first) {
  const S = drawState(g);
  const now = Date.now();
  const cur = S.cur;
  const late = cur && !cur.word && now - cur.start > PICK_SECS * 1000;
  const keyNow = cur ? `${g.id}:${cur.r}:${cur.word ? 'd' : 'p' + (late ? 1 : 0)}` : `${g.id}:done:${S.rounds.length}`;
  // نفس الجولة: نحدّث الرسمة والتخمينات بس (ما نعيد بناء الصفحة عشان الكيبورد واللوحة)
  if (!first && el.dataset.drawKey === keyNow) { if (cur?.word) patchDraw(g, el, S); return true; }
  el.dataset.drawKey = keyNow;
  const board = `<div class="board">${[...S.scores.entries()].sort((a, b) => b[1] - a[1]).map(([u, n], i) =>
    `<div class="br${u === me() ? ' me' : ''}"><span class="rk">${i + 1}</span>${C().avatar(u, 'xs')}<span class="bn">${esc(u === me() ? 'أنت' : C().short(u))}</span><b>${n}</b></div>`).join('')}</div>`;
  let body;
  if (S.done) {
    const top = [...S.scores.entries()].sort((a, b) => b[1] - a[1])[0];
    body = `<div class="q-card" style="--gc:${EXT_INFO.draw.c}"><small>خلصت اللعبة</small><h2>${top ? (top[0] === me() ? 'فزت أنت!' : 'فاز ' + esc(C().short(top[0]))) : ''}</h2></div>
      <p class="section-t">النتيجة</p>${board}
      <div class="g-actions"><button class="btn ghost" data-a="chat">الدردشة</button><button class="btn" data-a="again-ext">لعبة جديدة</button></div>`;
  } else if (!cur.word) {
    const iDraw = cur.drawer === me();
    body = `<div class="dr-top"><span class="chip">جولة ${cur.r + 1} من ${g.state.rounds}</span>${C().avatar(cur.drawer, 'xs')}<b>${iDraw ? 'دورك ترسم' : esc(C().short(cur.drawer)) + ' بيرسم'}</b></div>
      ${iDraw ? `<p class="section-t">اختر كلمة ترسمها</p><div class="dr-pick">${wordChoices(g, cur.r).map((i) => `<button class="btn" data-word="${i}">${esc(DRAW_WORDS[i])}</button>`).join('')}</div>`
        : `<div class="q-card" style="--gc:${EXT_INFO.draw.c}"><small>انتظر</small><h2>${esc(C().short(cur.drawer))} يختار كلمة…</h2></div>`}
      ${late && !iDraw ? '<div class="g-actions"><button class="btn ghost" data-a="dskip">تأخر؟ تخطّى دوره</button></div>' : ''}
      <p class="section-t">النقاط</p>${board}`;
    if (!late) A.G.extRerender = setTimeout(() => A.renderGame(), cur.start + PICK_SECS * 1000 - now + 200);
  } else {
    const iDraw = cur.drawer === me();
    body = `<div class="dr-top"><span class="chip">جولة ${cur.r + 1} من ${g.state.rounds}</span>${C().avatar(cur.drawer, 'xs')}<b>${iDraw ? 'أنت ترسم' : esc(C().short(cur.drawer)) + ' يرسم'}</b><span class="dr-time" data-dtime></span></div>
      <div class="dr-word" data-dword></div>
      <div class="dr-canvas"><canvas width="900" height="900" id="drCv"></canvas></div>
      ${iDraw ? `<div class="dr-tools"><div class="dr-colors">${COLORS.map((c, i) => `<button data-col="${c}" class="${i === 0 ? 'on' : ''}" style="background:${c}" aria-label="لون"></button>`).join('')}</div>
        <div class="dr-row">${SIZES.map((s, i) => `<button data-size="${s}" class="sz${i === 1 ? ' on' : ''}" aria-label="حجم"><i style="width:${Math.max(6, s / 1.6)}px;height:${Math.max(6, s / 1.6)}px"></i></button>`).join('')}
        <span class="dr-break"></span><button data-tool="fill" class="tl">${svg('<path d="M5 12 11.5 5.5l6.5 6.5-6.5 6.5z"/><path d="M8 3.5 11.5 7M19.5 15.5s1.8 2.2 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-1.2 1.8-3.4 1.8-3.4z"/>')}<span>تلوين</span></button>
        <button data-tool="erase" class="tl">${svg('<path d="M4 17.5 13 8.5l5 5-6 6H7z"/><path d="M11 21h9"/>')}<span>ممحاة</span></button>
        <button data-tool="undo" class="tl">${svg('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>')}<span>تراجع</span></button>
        <button data-tool="clear" class="tl">${svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/>')}<span>مسح</span></button></div></div>`
        : `<form class="dr-guess" id="drForm"><input id="drIn" autocomplete="off" placeholder="اكتب تخمينك…" maxlength="40"><button class="btn" type="submit">خمّن</button></form>`}
      <div class="dr-feed" data-dfeed></div>
      <p class="section-t">النقاط</p>${board}`;
  }
  el.innerHTML = A.shell(EXT_INFO.draw.n, C().chatOf(g.chat_id) ? C().chatName(C().chatOf(g.chat_id)) : '', body);
  el.onclick = (e) => A.onGameClick(e);
  if (cur?.word) { bindCanvas(g, el, cur); patchDraw(g, el, S); }
  return true;
}
function patchDraw(g, el, S) {
  const cur = S.cur;
  const iDraw = cur.drawer === me();
  const cv = $('#drCv', el);
  if (cv && !A.G.drawing) paint(cv, strokesOf(g, cur.r));
  const now = Date.now();
  const left = Math.max(0, Math.ceil((cur.end - now) / 1000));
  const t = $('[data-dtime]', el); if (t) { t.textContent = left; t.classList.toggle('low', left <= 10); }
  const frac = (now - cur.pick) / (DRAW_SECS * 1000);
  const iGot = cur.correct.some((c) => c.u === me());
  const w = $('[data-dword]', el);
  if (w) w.innerHTML = iDraw || iGot ? `<span class="dr-full">${esc(cur.word)}</span>` : maskWord(cur.word, frac, g.id + cur.r);
  const feed = $('[data-dfeed]', el);
  if (feed) {
    const target = dnorm(cur.word);
    feed.innerHTML = cur.guesses.slice(-8).reverse().map((m) => {
      const ok = cur.correct.some((c) => c.u === m.user_id) && dnorm(m.data.t) === target;
      const who = esc(m.user_id === me() ? 'أنت' : C().short(m.user_id));
      if (ok) return `<div class="ok">✓ ${who} خمّن صح</div>`;
      const close = m.user_id === me() && editDist(dnorm(m.data.t), target) === 1;
      return `<div>${who}: ${esc(m.data.t)}${close ? ' <em>قريب!</em>' : ''}</div>`;
    }).join('');
  }
  const form = $('#drForm', el);
  if (form && iGot) form.outerHTML = '<p class="dr-got">خمّنتها صح! انتظر الباقين</p>';
}
function bindCanvas(g, el, cur) {
  const cv = $('#drCv', el);
  if (!cv) return;
  paint(cv, strokesOf(g, cur.r));
  const form = $('#drForm', el);
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const inp = $('#drIn', el);
      const t = inp.value.trim();
      if (!t) return;
      inp.value = '';
      const n = movesOf(g.id).filter((m) => m.user_id === me() && m.key.startsWith('g' + cur.r + 'x')).length;
      if (dnorm(t) === dnorm(cur.word)) { sfx('correct'); buzz(20); }
      postQuiet(g, 'g' + cur.r + 'x' + n, { t });
    };
  }
  if (cur.drawer !== me()) return;
  const tool = A.G.drTool || (A.G.drTool = { c: '#111111', w: 10, erase: false });
  $$('[data-col]', el).forEach((b) => b.classList.toggle('on', b.dataset.col === tool.c && !tool.erase));
  $$('[data-size]', el).forEach((b) => b.classList.toggle('on', Number(b.dataset.size) === tool.w));
  $('[data-tool=erase]', el)?.classList.toggle('on', tool.erase);
  $('[data-tool=fill]', el)?.classList.toggle('on', !!tool.fill);
  let pts = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)]; };
  cv.style.touchAction = 'none';
  cv.onpointerdown = (e) => {
    e.preventDefault();
    if (tool.fill) {
      const p = pos(e);
      const n = movesOf(g.id).filter((m) => m.user_id === me() && m.key.startsWith('s' + cur.r + 'x')).length;
      return postQuiet(g, 's' + cur.r + 'x' + n, { f: 1, c: tool.c, w: 0, p });
    }
    cv.setPointerCapture?.(e.pointerId); A.G.drawing = true; pts = pos(e); paint(cv, strokesOf(g, cur.r), { c: tool.erase ? '#FFFFFF' : tool.c, w: tool.erase ? 40 : tool.w, p: pts }); };
  cv.onpointermove = (e) => {
    if (!pts) return;
    const [x, y] = pos(e);
    const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) < 4) return;
    pts.push(x, y);
    paint(cv, strokesOf(g, cur.r), { c: tool.erase ? '#FFFFFF' : tool.c, w: tool.erase ? 40 : tool.w, p: pts });
  };
  const up = () => {
    if (!pts) return;
    const p = pts; pts = null; A.G.drawing = false;
    const n = movesOf(g.id).filter((m) => m.user_id === me() && m.key.startsWith('s' + cur.r + 'x')).length;
    postQuiet(g, 's' + cur.r + 'x' + n, { c: tool.erase ? '#FFFFFF' : tool.c, w: tool.erase ? 40 : tool.w, p: p.slice(0, 1200) });
  };
  cv.onpointerup = up; cv.onpointercancel = up;
}
// نرسل بدون ما نعيد رسم الشاشة كلها (للرسم والتخمين)
async function postQuiet(g, key, data) {
  const row = { game_id: g.id, user_id: me(), key, data };
  const arr = A.G.moves.get(g.id) || [];
  arr.push({ ...row, created_at: new Date().toISOString() });
  A.G.moves.set(g.id, arr);
  A.renderGame();
  const { error } = await C().sb.from('game_moves').insert(row);
  if (error) C().toast('ما انرسلت، تأكد من النت');
}

// ============================================================
//                     من سيربح المليون
// ============================================================
const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
const SAFE = [4, 9];
const MQ_SECS = 30;
const money = (n) => n.toLocaleString('en-US');
// الأسئلة اللي شفتها قبل (على هالجهاز) عشان ما تتكرر لين تخلص كلها
const MQ_SEEN = 'lamma-mq-seen';
const mqSeen = () => { try { return JSON.parse(localStorage.getItem(MQ_SEEN) || '{}'); } catch (e) { return {}; } };
function markMq(tier, qi) {
  const s = mqSeen();
  const k = String(tier);
  s[k] = s[k] || [];
  if (!s[k].includes(qi)) s[k].push(qi);
  try { localStorage.setItem(MQ_SEEN, JSON.stringify(s)); } catch (e) { /* ignore */ }
}
function pickMillion(R) {
  const seen = mqSeen();
  return MQ.map((bank, t) => {
    let used = new Set(seen[t] || []);
    let pool = bank.map((_, i) => i).filter((i) => !used.has(i));
    if (pool.length < 4) { pool = bank.map((_, i) => i); seen[t] = []; try { localStorage.setItem(MQ_SEEN, JSON.stringify(seen)); } catch (e) { /* ignore */ } }
    return A.shuffle(pool, R).slice(0, 4);
  });
}
const mqOf = (g, n, switched) => {
  if (g.state.v === 2) {
    // خمس مستويات، كل مستوى 3 أسئلة (+ سؤال احتياط لتغيير السؤال)
    const tier = Math.floor(n / 3);
    const set = g.state.qs[tier];
    const qi = switched ? set[3] : set[n % 3];
    return MQ[tier][qi];
  }
  const lv = Math.floor(n / 5);
  const set = g.state.qs[lv];
  const qi = switched ? set[5] : set[n % 5];
  const bank = lv === 0 ? QUIZ : lv === 1 ? MILLION_MID : MILLION_HARD;
  return bank[qi];
};
function millionState(g, uid) {
  const mv = movesOf(g.id).filter((m) => m.user_id === uid);
  const get = (k) => mv.find((m) => m.key === k);
  let n = 0, lost = false, won = 0, out = false;
  const used = { l5: get('l5')?.data.n, la: get('la')?.data.n, ls: get('ls')?.data.n };
  for (; n < 15; n++) {
    const a = get('q' + n);
    if (!a) break;
    const q = mqOf(g, n, used.ls === n);
    if (a.data.a !== q[2]) { lost = true; break; }
  }
  const w = get('qw');
  if (lost) won = n >= 10 ? PRIZES[9] : n >= 5 ? PRIZES[4] : 0;
  else if (w) { won = n ? PRIZES[n - 1] : 0; out = true; }
  else if (n === 15) won = PRIZES[14];
  return { n, lost, won, out, done: lost || out || n === 15, used, wrongA: lost ? get('q' + n).data.a : null };
}
function renderMillion(g) {
  const ms = millionState(g, me());
  const run = A.G.mRun && A.G.mRun.g === g.id ? A.G.mRun : null;
  const players = [...new Set(movesOf(g.id).map((m) => m.user_id))].map((u) => [u, millionState(g, u)]).sort((a, b) => b[1].won - a[1].won || b[1].n - a[1].n);
  const board = players.length ? `<p class="section-t">الترتيب</p><div class="board">${players.map(([u, s], i) =>
    `<div class="br${u === me() ? ' me' : ''}"><span class="rk">${i + 1}</span>${C().avatar(u, 'xs')}<span class="bn">${esc(u === me() ? 'أنت' : C().short(u))}</span><small>${s.done ? (s.lost ? 'خسر' : s.out ? 'انسحب' : 'المليون!') : `يلعب ${s.n + 1}/15`}</small><b>${money(s.won)}</b></div>`).join('')}</div>` : '';
  const ladder = `<div class="mq-ladder">${PRIZES.map((p, i) => `<div class="${i === ms.n && !ms.done ? 'cur' : ''}${i < ms.n ? ' done' : ''}${SAFE.includes(i) ? ' safe' : ''}"><span>${i + 1}</span><b>${money(p)}</b></div>`).reverse().join('')}</div>`;
  if (ms.done) {
    return `<div class="q-card mq-card"><small>${ms.lost ? 'إجابة غلط' : ms.out ? 'انسحبت' : 'مبروك!'}</small><h2>${money(ms.won)} ريال</h2>
      <p>${ms.lost ? 'رجعت لآخر مبلغ مضمون' : ms.out ? 'أخذت آخر مبلغ وصلته' : 'وصلت للمليون!'}</p></div>${board}
      <div class="g-actions"><button class="btn ghost" data-a="chat">رجوع للقروب</button><button class="btn" data-a="again-ext">لعبة جديدة</button></div>`;
  }
  if (!run) {
    return `<div class="q-card mq-card"><small>من سيربح المليون</small><h2>${ms.n ? `وصلت السؤال ${ms.n + 1}` : '15 سؤال لين المليون'}</h2>
      <p>كل سؤال 30 ثانية. عندك 3 وسائل مساعدة: حذف إجابتين، رأي الجمهور، وتغيير السؤال. المبالغ المضمونة: 1,000 و 32,000</p></div>
      <div class="g-actions"><button class="btn" data-a="mstart">${ms.n ? 'كمّل' : 'ابدأ'}</button></div>${ladder}${board}`;
  }
  const n = ms.n;
  const q = mqOf(g, n, ms.used.ls === n);
  if (g.state.v === 2) { const tier = Math.floor(n / 3); markMq(tier, ms.used.ls === n ? g.state.qs[tier][3] : g.state.qs[tier][n % 3]); }
  const order = A.shuffle([0, 1, 2, 3], A.seeded(g.id + ':m' + n + (ms.used.ls === n ? 's' : '') + me()));
  let hidden = new Set();
  if (ms.used.l5 === n) {
    const wrong = order.filter((o) => o !== q[2]);
    hidden = new Set(A.shuffle(wrong, A.seeded(g.id + 'h' + n)).slice(0, 2));
  }
  let aud = '';
  if (ms.used.la === n) {
    const R = A.seeded(g.id + 'a' + n + me());
    // الجمهور يعرف الأسهل، وفي الأسئلة الصعبة ممكن يغلط
    const base = g.state.v === 2 ? [72, 58, 44, 32, 24][Math.floor(n / 3)] : [70, 52, 40][Math.floor(n / 5)];
    const pc = {}; let left = 100 - base - Math.floor(R() * 15);
    pc[q[2]] = 100 - left;
    const others = order.filter((o) => o !== q[2] && !hidden.has(o));
    others.forEach((o, i) => { const v = i === others.length - 1 ? left : Math.floor(R() * left); pc[o] = v; left -= v; });
    aud = `<div class="mq-aud">${order.filter((o) => !hidden.has(o)).map((o) => `<div><i style="height:${pc[o] || 0}%"></i><b>${pc[o] || 0}%</b><span>${'أبجد'[order.indexOf(o)]}</span></div>`).join('')}</div>`;
  }
  const fb = run.feedback;
  return `<div class="mq-top"><span class="chip">سؤال ${n + 1} · ${money(PRIZES[n])} ريال</span><span class="qt-bar"><i id="qtBar"></i></span><b id="qtSec" class="qt-sec">${MQ_SECS}</b></div>
    <div class="q-card mq-card big"><h2>${esc(q[0])}</h2></div>
    ${aud}
    <div class="opts mq-opts">${order.map((o, i) => {
      if (hidden.has(o)) return '<button disabled class="gone"></button>';
      let cls = run.sel === o ? 'sel' : '';
      if (fb) { if (o === q[2]) cls = 'ok'; else if (o === fb.a) cls = 'bad'; }
      return `<button data-mopt="${o}" class="${cls}" ${fb ? 'disabled' : ''}><em>${'أبجد'[i]}</em>${esc(q[1][o])}</button>`;
    }).join('')}</div>
    ${run.sel !== undefined && !fb ? '<div class="g-actions"><button class="btn" data-a="mfinal">إجابة نهائية</button></div>' : ''}
    <div class="mq-life">
      <button data-life="l5" ${ms.used.l5 !== undefined || fb ? 'disabled' : ''}>50:50</button>
      <button data-life="la" ${ms.used.la !== undefined || fb ? 'disabled' : ''}>${svg('<circle cx="8" cy="9" r="2.5"/><circle cx="16" cy="9" r="2.5"/><path d="M3.5 18c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4M11.5 18c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4"/>')}الجمهور</button>
      <button data-life="ls" ${ms.used.ls !== undefined || fb ? 'disabled' : ''}>${svg('<path d="M4.5 9.5A8 8 0 0 1 18 6.5l2 2M20 4.5v4h-4M19.5 14.5A8 8 0 0 1 6 17.5l-2-2M4 19.5v-4h4"/>')}تغيير</button>
      <button data-a="mwithdraw" ${fb || !n ? 'disabled' : ''}>انسحب بـ ${money(n ? PRIZES[n - 1] : 0)}</button>
    </div>${ladder}`;
}
function mStart(g) {
  const ms = millionState(g, me());
  const k = g.id + ':' + ms.n + ':' + (ms.used.ls === ms.n ? 's' : '');
  A.G.mStarts = A.G.mStarts || {};
  if (!A.G.mStarts[k]) A.G.mStarts[k] = Date.now();
  A.G.mRun = { g: g.id, t0: A.G.mStarts[k], sel: undefined, feedback: null, n: ms.n };
  A.renderGame();
  mTick(g);
}
function mTick(g) {
  clearInterval(A.G.mTimer);
  A.G.mTimer = setInterval(() => {
    const run = A.G.mRun;
    if (!run || A.G.open?.id !== g.id) return clearInterval(A.G.mTimer);
    if (run.feedback) return;
    const left = Math.max(0, MQ_SECS * 1000 - (Date.now() - run.t0));
    const bar = $('#qtBar'); if (bar) { bar.style.width = (left / (MQ_SECS * 1000)) * 100 + '%'; bar.classList.toggle('low', left < 8000); }
    const sec = $('#qtSec'); const sl = Math.ceil(left / 1000);
    if (sec && sec.textContent !== String(sl)) { sec.textContent = sl; if (sl <= 5 && sl > 0) sfx('tick'); }
    if (left <= 0) mAnswer(g, -1);
  }, 100);
}
async function mAnswer(g, a) {
  const run = A.G.mRun;
  if (!run || run.feedback) return;
  const ms = millionState(g, me());
  const q = mqOf(g, ms.n, ms.used.ls === ms.n);
  run.feedback = { a };
  A.renderGame();
  const ok = a === q[2];
  sfx(ok ? 'correct' : 'wrong'); buzz(ok ? 15 : [40, 40, 40]);
  setTimeout(async () => {
    await post(g, 'q' + ms.n, { a, ms: Date.now() - run.t0 }, false);
    const after = millionState(g, me());
    if (after.done) { A.G.mRun = null; clearInterval(A.G.mTimer); if (after.n === 15) { sfx('win'); C().confetti?.(); } A.renderGame(); return; }
    if (ok) { mStart(g); }
  }, 1600);
}

// ============================================================
//                        لعبة الحروف
// ============================================================
const hnorm = (s) => normWord(String(s || '').trim().replace(/^ال(?=..)/, ''));
function huroofState(g, members, now = Date.now()) {
  const subs = movesOf(g.id).filter((m) => m.key === 'a');
  const end = Date.parse(g.created_at) + g.state.secs * 1000;
  const everyone = members.length && members.every((u) => subs.some((s) => s.user_id === u));
  const over = now >= end || everyone;
  const L = normWord(g.state.letter);
  const rows = subs.map((s) => ({ u: s.user_id, v: (s.data.v || []).map((x) => String(x || '').trim()) }));
  const cells = rows.map((r) => r.v.map((ans, ci) => {
    const n = hnorm(ans);
    if (!n || n.length < 2 || !normWord(ans.trim()).replace(/^ال(?=..)/, '').startsWith(L)) return { ans, pts: 0, bad: !!ans };
    const dup = rows.some((o) => o !== r && hnorm(o.v[ci]) === n);
    return { ans, pts: dup ? 5 : 10 };
  }));
  const totals = rows.map((r, i) => ({ u: r.u, t: cells[i].reduce((s, c) => s + c.pts, 0) })).sort((a, b) => b.t - a.t);
  return { subs, end, over, rows, cells, totals };
}
function renderHuroof(g, el, first) {
  const members = A.G.chatMembers || [];
  const H = huroofState(g, members);
  const mine = H.subs.find((s) => s.user_id === me());
  const key = `${g.id}:${H.over ? 'over' : mine ? 'sent' : 'form'}`;
  const tick = () => { const t = $('[data-htime]', el); if (t) { const left = Math.max(0, Math.ceil((H.end - Date.now()) / 1000)); t.textContent = H.over ? '' : left; t.classList.toggle('low', left <= 10); } };
  if (!first && el.dataset.hKey === key && (!H.over || el.dataset.hN === String(H.subs.length))) {
    const st = $('[data-hwho]', el);
    if (st) st.innerHTML = hWho(g, H, members);
    tick();
    return true;
  }
  el.dataset.hN = String(H.subs.length);
  el.dataset.hKey = key;
  let body;
  const letter = `<div class="hr-letter" style="--gc:${EXT_INFO.huroof.c}"><small>الحرف</small><b>${esc(g.state.letter)}</b><span class="dr-time" data-htime></span></div>`;
  if (!H.over && (!mine || A.G.hEdit === g.id)) {
    const draft = A.G.hDraft?.[g.id] || mine?.data.v || [];
    body = `${letter}<form class="hr-form" id="hrForm">${HUROOF_CATS.map((c, i) => `<label>${c}<input data-hi="${i}" autocomplete="off" maxlength="30" value="${esc(draft[i] || '')}" placeholder="${c} يبدأ بـ ${esc(g.state.letter)}"></label>`).join('')}
      <button class="btn" type="submit">${mine ? 'حدّث إجاباتي' : 'أرسل إجاباتي'}</button></form>
      <div data-hwho>${hWho(g, H, members)}</div>`;
  } else if (!H.over) {
    body = `${letter}<div class="q-card" style="--gc:${EXT_INFO.huroof.c}"><small>أرسلت إجاباتك</small><h2>ننتظر الباقين…</h2></div>
      <div class="g-actions"><button class="btn ghost" data-a="hedit">عدّل إجاباتي</button></div><div data-hwho>${hWho(g, H, members)}</div>`;
  } else {
    const head = `<tr><th></th>${HUROOF_CATS.map((c) => `<th>${c}</th>`).join('')}<th>المجموع</th></tr>`;
    const rows = H.rows.map((r, i) => `<tr class="${r.u === me() ? 'me' : ''}"><th>${C().avatar(r.u, 'xs')}${esc(r.u === me() ? 'أنت' : C().short(r.u))}</th>${H.cells[i].map((c) =>
      `<td class="${c.pts === 10 ? 'p10' : c.pts === 5 ? 'p5' : c.bad ? 'p0' : 'pe'}">${esc(c.ans || '—')}<small>${c.pts}</small></td>`).join('')}<td class="tot">${H.totals.find((t) => t.u === r.u).t}</td></tr>`).join('');
    const top = H.totals[0];
    body = `${letter}<div class="q-card" style="--gc:${EXT_INFO.huroof.c}"><small>النتيجة</small><h2>${top ? (top.u === me() ? 'فزت أنت!' : 'فاز ' + esc(C().short(top.u))) : 'ما أحد جاوب'}</h2>
      <p>10 للإجابة الصحيحة اللي ما أحد كتبها، 5 إذا تكررت، و0 إذا ما تبدأ بالحرف</p></div>
      <div class="hr-table"><table>${head}${rows}</table></div>
      <div class="g-actions"><button class="btn ghost" data-a="chat">الدردشة</button><button class="btn" data-a="again-ext">جولة بحرف جديد</button></div>`;
  }
  el.innerHTML = A.shell(EXT_INFO.huroof.n, C().chatOf(g.chat_id) ? C().chatName(C().chatOf(g.chat_id)) : '', body);
  el.onclick = (e) => A.onGameClick(e);
  tick();
  const f = $('#hrForm', el);
  if (f) {
    f.oninput = (e) => { const i = e.target.dataset.hi; if (i === undefined) return; A.G.hDraft = A.G.hDraft || {}; const d = A.G.hDraft[g.id] = A.G.hDraft[g.id] || []; d[i] = e.target.value; };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = $$('[data-hi]', f).map((x) => x.value.trim());
      A.G.hEdit = null;
      document.activeElement?.blur?.();
      await post(g, 'a', { v }, true);
      sfx('send');
    };
  }
  return true;
}
const hWho = (g, H, members) => `<p class="section-t">مين أرسل</p><div class="hr-who">${members.map((u) =>
  `<span class="${H.subs.some((s) => s.user_id === u) ? 'on' : ''}">${C().avatar(u, 'xs')}${esc(u === me() ? 'أنت' : C().short(u))}</span>`).join('')}</div>`;

// ============================================================
//                     الربط مع games.js
// ============================================================
export function extRender(g, el, first) {
  clearTimeout(A.G.extRerender);
  if (g.kind === 'draw') return renderDraw(g, el, first);
  if (g.kind === 'huroof') return renderHuroof(g, el, first);
  return false;
}
export function extBody(g) {
  if (g.kind === 'baloot') return renderBaloot(g);
  if (g.kind === 'domino') return renderDomino(g);
  if (g.kind === 'million') return renderMillion(g);
  return '';
}
export function extAfter(g) {
  if (SEQ_KINDS.has(g.kind)) { tickTimers(); seqSounds(g); }
  driveBots(g);
}
export function extOver(g) {
  if (g.kind === 'baloot') return balootState(g).winner >= 0;
  if (g.kind === 'domino') return dominoState(g).winner >= 0;
  if (g.kind === 'draw') return drawState(g).done;
  if (g.kind === 'million') return millionState(g, me()).done;
  if (g.kind === 'huroof') return Date.now() > Date.parse(g.created_at) + g.state.secs * 1000;
  return false;
}
export function extMyTurn(g) {
  if (g.kind === 'baloot') { const st = balootState(g); return st.winner < 0 && g.state.seats[st.R.turn] === me(); }
  if (g.kind === 'domino') { const st = dominoState(g); return st.winner < 0 && g.state.seats[st.D.turn] === me(); }
  if (g.kind === 'draw') { const s = drawState(g); return !s.done && s.cur.drawer === me() && !s.cur.word; }
  return false;
}
export function extRow(g) {
  let sub = '', flag = '';
  if (g.kind === 'baloot') {
    const st = balootState(g); const mySeat = g.state.seats.indexOf(me()); const t = BL.team(mySeat >= 0 ? mySeat : 0);
    sub = `لنا ${st.score[t]} · لهم ${st.score[1 - t]}`;
    if (st.winner >= 0) sub += st.winner === t ? ' · فزتوا' : ' · خسرتوا';
    else if (g.state.seats[st.R.turn] === me()) flag = '<span class="turn-badge">دورك</span>';
  } else if (g.kind === 'domino') {
    const st = dominoState(g); const s = g.state.seats.indexOf(me());
    sub = s >= 0 ? `نقاطك ${st.score[s]} من ${st.target}` : '';
    if (st.winner >= 0) sub += st.winner === s ? ' · فزت' : ' · انتهت';
    else if (g.state.seats[st.D.turn] === me()) flag = '<span class="turn-badge">دورك</span>';
  } else if (g.kind === 'draw') {
    const s = drawState(g);
    sub = s.done ? 'انتهت' : `جولة ${s.cur.r + 1} من ${g.state.rounds}`;
    if (!s.done && s.cur.drawer === me() && !s.cur.word) flag = '<span class="turn-badge">دورك ترسم</span>';
  } else if (g.kind === 'million') {
    const n = new Set(movesOf(g.id).map((m) => m.user_id)).size;
    const ms = millionState(g, me());
    sub = ms.done ? `ربحت ${money(ms.won)}` : n ? `${n} لعبوا` : 'ما أحد لعب للحين';
  } else if (g.kind === 'huroof') {
    sub = `حرف ${g.state.letter}` + (extOver(g) ? ' · انتهت' : ' · جارية');
  }
  return { sub, flag };
}
export function extTitle(g) {
  if (g.kind === 'huroof') return `لعبة الحروف: ${g.state.letter}`;
  return EXT_INFO[g.kind].n;
}

// الضغطات
export async function extClick(g, e, a) {
  if (a === 'rules') return rulesSheet(g.kind);
  if (a === 'again-ext') return againExt(g);
  if (a === 'vjoin') return VC.joinVoice(g.id);
  if (a === 'vmute') return VC.toggleMute();
  if (a === 'vleave') return VC.leaveVoice();
  if (a === 'playfor') return playFor(g, Number(e.target.closest('[data-seat]').dataset.seat));
  if (g.kind === 'baloot') {
    const b = e.target.closest('[data-bid]');
    if (b) {
      const st = balootState(g); const s = g.state.seats.indexOf(me());
      if (st.R.turn !== s) return;
      buzz(8);
      await post(g, nextKey(g), { seat: s, t: 'b', v: b.dataset.bid, s: b.dataset.s || undefined }, false);
      afterSeq(g);
      return;
    }
    const c = e.target.closest('[data-play]')?.dataset.play;
    if (c) {
      const st = balootState(g); const s = g.state.seats.indexOf(me());
      if (st.R.turn !== s) return;
      buzz(8);
      await post(g, nextKey(g), { seat: s, t: 'p', c }, false);
      afterSeq(g);
    }
    return;
  }
  if (g.kind === 'domino') {
    const st = dominoState(g); const s = g.state.seats.indexOf(me());
    if (st.D.turn !== s) return;
    const t = e.target.closest('[data-tile]')?.dataset.tile;
    if (t) {
      const [x, y] = t.split(',').map(Number);
      const ends = st.fits([x, y]);
      if (ends.length > 1) { A.G.dPick = [x, y]; sfx('tap'); return A.renderGame(); }
      A.G.dPick = null; buzz(8);
      await post(g, nextKey(g), { seat: s, t: 'p', a: x, b: y, end: ends[0] }, false);
      return afterSeq(g);
    }
    const end = e.target.closest('[data-end]')?.dataset.end;
    if (end && A.G.dPick) {
      const [x, y] = A.G.dPick; A.G.dPick = null; buzz(8);
      await post(g, nextKey(g), { seat: s, t: 'p', a: x, b: y, end }, false);
      return afterSeq(g);
    }
    const act = e.target.closest('[data-dact]')?.dataset.dact;
    if (act) { await post(g, nextKey(g), { seat: s, t: act }, false); return afterSeq(g); }
    return;
  }
  if (g.kind === 'draw') {
    const S = drawState(g); const cur = S.cur;
    const w = e.target.closest('[data-word]')?.dataset.word;
    if (w !== undefined && cur && cur.drawer === me() && !cur.word) { A.G.drTool = { c: '#111111', w: 10, erase: false }; return post(g, 'w' + cur.r, { i: Number(w) }, false); }
    if (a === 'dskip' && cur) return post(g, 'k' + cur.r, {}, false);
    const col = e.target.closest('[data-col]')?.dataset.col;
    const tool = A.G.drTool || (A.G.drTool = { c: '#111111', w: 10, erase: false });
    const size = e.target.closest('[data-size]')?.dataset.size;
    if (col) { tool.c = col; tool.erase = false; }
    if (size) tool.fill = false;
    if (size) tool.w = Number(size);
    const tl = e.target.closest('[data-tool]')?.dataset.tool;
    if (tl === 'erase') { tool.erase = !tool.erase; tool.fill = false; }
    if (tl === 'fill') { tool.fill = !tool.fill; tool.erase = false; }
    if ((tl === 'undo' || tl === 'clear') && cur?.word) {
      const n = movesOf(g.id).filter((m) => m.user_id === me() && m.key.startsWith('s' + cur.r + 'x')).length;
      postQuiet(g, 's' + cur.r + 'x' + n, tl === 'undo' ? { u: 1 } : { clr: 1 });
    }
    if (col || size || tl) {
      $$('[data-col]').forEach((b) => b.classList.toggle('on', b.dataset.col === tool.c && !tool.erase));
      $$('[data-size]').forEach((b) => b.classList.toggle('on', Number(b.dataset.size) === tool.w));
      $('[data-tool=erase]')?.classList.toggle('on', tool.erase);
      $('[data-tool=fill]')?.classList.toggle('on', !!tool.fill);
    }
    return;
  }
  if (g.kind === 'million') {
    if (a === 'mstart') return mStart(g);
    const o = e.target.closest('[data-mopt]')?.dataset.mopt;
    if (o !== undefined && A.G.mRun && !A.G.mRun.feedback) { A.G.mRun.sel = Number(o); sfx('tap'); return A.renderGame(); }
    if (a === 'mfinal' && A.G.mRun?.sel !== undefined) return mAnswer(g, A.G.mRun.sel);
    const life = e.target.closest('[data-life]')?.dataset.life;
    if (life) {
      const ms = millionState(g, me());
      if (ms.used[life] !== undefined) return;
      if (life === 'ls') { A.G.mRun.sel = undefined; await post(g, 'ls', { n: ms.n }, false); return mStart(g); }
      return post(g, life, { n: ms.n }, false);
    }
    if (a === 'mwithdraw') {
      if (!(await C().ask('تنسحب وتاخذ المبلغ اللي وصلته؟', 'انسحب', false))) return;
      const ms = millionState(g, me());
      A.G.mRun = null; clearInterval(A.G.mTimer);
      return post(g, 'qw', { n: ms.n }, false);
    }
    return;
  }
  if (g.kind === 'huroof') {
    if (a === 'hedit') { A.G.hEdit = g.id; delete A.G.hDraft?.[g.id]; return renderHuroof(g, $('#game'), true); }
  }
}
// بعد حركتي: أنبّه اللي دوره إذا طالع من التطبيق
function afterSeq(g) {
  const uid = g.kind === 'baloot' ? balootTurnUid(g) : (() => { const st = dominoState(g); return st.winner >= 0 ? null : g.state.seats[st.D.turn]; })();
  notifyTurn(g, uid);
  if (extOver(g)) C().sb.from('games').update({ status: 'done' }).eq('id', g.id).then(() => {});
}

// الكمبيوتر يلعب: صاحب اللعبة يحركه، وإذا تأخر أي لاعب ثاني يكمّل عنه
// أصوات الحركات: تطلع لكل حركة جديدة (حقي وحق غيري) مرة وحدة
function seqSounds(g) {
  const mv = seqMoves(g);
  const n = mv.length;
  if (!A.G.sndN) A.G.sndN = new Map();
  const prev = A.G.sndN.get(g.id);
  A.G.sndN.set(g.id, n);
  if (prev === undefined || n <= prev) return;
  const news = mv.slice(prev).map((m) => m.data || {});
  clearTimeout(A.G.turnSnd);
  const later = (f, ms) => setTimeout(() => { if (A.G.open?.id === g.id) f(); }, Math.max(0, ms));
  if (g.kind === 'baloot') {
    const R = balootState(g).R;
    let k = 0;
    for (const d of news) { if (d.t === 'p') later(() => sfx('card'), (k++) * 110); else if (d.t === 'b') sfx('pop'); }
    const tm = balootTiming(g, R);
    if (tm.trickJustDone) later(() => sfx('sweep'), tm.T + COLLECT_AT - Date.now());
    if (tm.endedRound && tm.T) later(() => sfx('deal'), tm.T + SUM_UNTIL - Date.now());
    else if (R.phase === 'play' && !R.tricks.length && !R.trick.length && news.some((d) => d.t === 'b')) later(() => sfx('deal'), 150);
    if (R.phase !== 'over' && g.state.seats[R.turn] === me() && news.every((d) => d.seat !== R.turn || d.t === 'b')) A.G.turnSnd = later(() => { sfx('turn'); buzz(10); }, tm.base - Date.now() + 120);
  } else if (g.kind === 'domino') {
    const st = dominoState(g);
    let k = 0;
    for (const d of news) { if (d.t === 'p') later(() => sfx('clack'), (k++) * 140); else if (d.t === 'd') sfx('draw'); }
    if (!A.G.sndRound) A.G.sndRound = new Map();
    const pr = A.G.sndRound.get(g.id);
    A.G.sndRound.set(g.id, st.D.round);
    if (pr !== undefined && pr !== st.D.round) {
      const w = st.D.prev?.result?.winner;
      if (w >= 0 && g.state.seats[w] === me()) { sfx('win'); C().confetti?.(); } else sfx('pop');
      later(() => sfx('shuffle'), DM_WIN_MS - 400);
    }
    if (st.winner < 0 && g.state.seats[st.D.turn] === me() && news[news.length - 1]?.seat !== st.D.turn) A.G.turnSnd = later(() => { sfx('turn'); buzz(10); }, 350);
  }
}
function turnTiming(g) {
  if (g.kind === 'baloot') return balootTiming(g, balootState(g).R);
  const n = seqMoves(g).length;
  let base = Math.max(n ? seenAt(g, n - 1) : Date.parse(g.created_at), A.G.openAt || 0);
  if (n) { const D = dominoState(g).D; if (D.prev && !D.chain.length) base = Math.max(base, seenAt(g, n - 1) + DM_WIN_MS); }
  return { base, deadline: base + TURN_MS };
}
// العداد ينقص كل ثانية بدون ما نعيد رسم اللعبة
function tickTimers() {
  clearInterval(A.G.turnTick);
  A.G.turnTick = setInterval(() => {
    const els = document.querySelectorAll('#game [data-deadline]');
    if (!els.length) return clearInterval(A.G.turnTick);
    els.forEach((el) => {
      const left = Math.max(0, Math.ceil((+el.dataset.deadline - Date.now()) / 1000));
      if (el.textContent !== String(left)) {
        el.textContent = left;
        el.classList.toggle('low', left <= 10);
        if (left <= 5 && left > 0 && el.classList.contains('inline')) sfx('tick');
      }
    });
  }, 250);
}
// مقعد يلعبه الكمبيوتر؟ (وفي نسخة التجربة، أهل التجربة الوهميين يلعبون تلقائي بعد)
const autoSeat = (g, s) => g.state.seats[s] === 'bot' || (!!window.__DEMO && g.state.seats[s] !== me());
const STALE_MS = 30000;
function seqTurn(g) {
  if (g.kind === 'baloot') { const st = balootState(g); return st.winner >= 0 ? null : { seat: st.R.turn, act: () => BL.botAction(st.R) }; }
  const st = dominoState(g); return st.winner >= 0 ? null : { seat: st.D.turn, act: () => DM.botAction(st) };
}
const sinceLast = (g) => { const last = seqMoves(g).slice(-1)[0]; return Date.now() - (last ? tms(last) : Date.parse(g.created_at)); };
// لاعب تأخر على دوره: نطلع زر «خلّ الكمبيوتر يلعب عنه» للباقين
function staleBox(g) {
  const t = seqTurn(g);
  if (!t || !g.state.seats.includes(me())) return '';
  const u = g.state.seats[t.seat];
  if (u === 'bot' || u === me() || autoSeat(g, t.seat)) return '';
  const since = sinceLast(g);
  if (since < STALE_MS) { clearTimeout(A.G.staleT); A.G.staleT = setTimeout(() => { if (A.G.open?.id === g.id) A.renderGame(); }, STALE_MS - since + 300); return ''; }
  return `<div class="stale-box"><span>${esc(C().short(u))} متأخر على دوره</span><button class="btn" data-a="playfor" data-seat="${t.seat}">خلّ الكمبيوتر يلعب عنه</button></div>`;
}
async function playFor(g, seat) {
  const t = seqTurn(g);
  if (!t || t.seat !== seat) return;
  const a = t.act();
  if (!a) return;
  if (await post(g, nextKey(g), { seat, ...a, auto: 1 }, false)) afterSeq(g);
}
// الكمبيوتر يلعب: صاحب اللعبة يحركه، وإذا تأخر أي لاعب ثاني يكمّل عنه
function driveBots(g) {
  clearTimeout(A.G.botT);
  if (!SEQ_KINDS.has(g.kind) || A.G.open?.id !== g.id) return;
  const seats = g.state.seats;
  if (!seats.includes(me())) return;
  const t = seqTurn(g);
  if (!t) return;
  const host = seats.find((u) => u !== 'bot');
  const tm = turnTiming(g);
  const now = Date.now();
  let wait, auto = 0;
  if (autoSeat(g, t.seat)) {
    wait = host === me() || window.__DEMO ? Math.max(650, tm.base + 1000 - now) : Math.max(500, tm.base + 7000 - now);
  } else {
    // خلص وقته (دقيقة): الكمبيوتر يلعب عنه. صاحب الدور يبدأ، وبعده صاحب اللعبة، وبعدهم الباقين
    const u = seats[t.seat];
    const extra = u === me() ? 0 : host === me() ? 1500 : 5000;
    wait = Math.max(300, tm.deadline + extra - now);
    auto = 1;
  }
  A.G.botT = setTimeout(async () => {
    if (A.G.open?.id !== g.id) return;
    const cur = seqTurn(g);
    if (!cur || cur.seat !== t.seat) return;
    if (auto && Date.now() < turnTiming(g).deadline) return driveBots(g);
    const a = cur.act();
    if (!a) return;
    if (auto && seats[t.seat] === me()) C().toast('خلص وقتك، الكمبيوتر لعب عنك');
    const ok = await post(g, nextKey(g), { seat: t.seat, ...a, ...(auto ? { auto: 1 } : {}) }, false);
    if (ok) afterSeq(g);
  }, wait);
}

// ---------- إنشاء لعبة جديدة ----------
export async function extNewSheet(kind, preChat) {
  const info = EXT_INFO[kind];
  const groups = C().chats().filter((c) => !c.is_direct);
  const direct = preChat ? C().chatOf(preChat) : null;
  const chatList = direct?.is_direct ? [direct] : groups;
  if (!chatList.length) return C().toast('سوّ قروب أول عشان تلعبون');
  const pre = preChat || chatList[0].id;
  const opts = chatList.map((c) => `<label class="check">${C().chatAvatar(c, 'sm')}<span style="flex:1">${esc(C().chatName(c))}</span><input type="radio" name="gchat" value="${c.id}" ${c.id === pre ? 'checked' : ''}></label>`).join('');
  let extra = '';
  if (kind === 'baloot') extra = '<p class="section-t">اختر شريكك وخصومك (المقاعد الفاضية يلعبها الكمبيوتر)</p><div id="xSeats" class="x-seats"></div>';
  if (kind === 'domino') extra = `<p class="section-t">مين يلعب معك؟ (لين 3)</p><div id="xSeats" class="x-seats"></div>
    <label class="check"><span style="flex:1">زيد الكمبيوتر</span><select id="xBots"><option value="0">لا</option><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option></select></label>
    <label class="check"><span style="flex:1">اللعبة إلى</span><select id="xTarget"><option value="51" selected>51 نقطة</option><option value="101">101 نقطة</option></select></label>`;
  if (kind === 'huroof') extra = `<label class="check"><span style="flex:1">الوقت</span><select id="xSecs"><option value="60">دقيقة</option><option value="90" selected>دقيقة ونص</option><option value="120">دقيقتين</option></select></label>`;
  if (kind === 'draw') extra = '<p class="hint" style="margin:6px 18px">كل أعضاء القروب يلعبون، وكل واحد يرسم بدوره.</p>';
  C().openSheet(`<h3>${info.n}</h3>${chatList.length > 1 || !direct?.is_direct ? `<p class="section-t">وين تلعبون؟</p>${opts}` : `<div style="display:none">${opts}</div>`}${extra}
    <div class="form" style="margin-top:12px"><button class="btn" id="xGo">ابدأ</button></div>`);
  const sheet = $('#sheet');
  const roles = new Map();
  const loadSeats = async () => {
    const box = $('#xSeats');
    if (!box) return;
    const chatId = $('#sheet input[name=gchat]:checked')?.value;
    const { data } = await C().sb.from('chat_members').select('user_id').eq('chat_id', chatId);
    const ids = (data || []).map((r) => r.user_id).filter((u) => u !== me() && C().members().has(u));
    roles.clear();
    box.innerHTML = ids.length ? ids.map((u) => `<div class="x-row" data-u="${u}">${C().avatar(u, 'sm')}<b>${esc(C().short(u))}</b><span class="seg">${kind === 'baloot'
      ? '<button data-r="" class="on">—</button><button data-r="p">شريك</button><button data-r="o">خصم</button>'
      : '<button data-r="" class="on">لا</button><button data-r="y">يلعب</button>'}</span></div>`).join('') : '<p class="hint" style="margin:0 18px">ما فيه أحد ثاني هنا، بتلعب مع الكمبيوتر</p>';
    C().hydrate(box);
  };
  loadSeats();
  sheet.addEventListener('change', (e) => { if (e.target.name === 'gchat') loadSeats(); });
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('.x-row [data-r]');
    if (!b) return;
    const u = b.closest('.x-row').dataset.u;
    const r = b.dataset.r;
    if (kind === 'baloot') {
      const count = (x) => [...roles.values()].filter((v) => v === x).length - (roles.get(u) === x ? 1 : 0);
      if (r === 'p' && count('p') >= 1) return C().toast('شريك واحد بس');
      if (r === 'o' && count('o') >= 2) return C().toast('خصمين بس');
    } else if (r === 'y' && [...roles.values()].filter((v) => v === 'y').length - (roles.get(u) === 'y' ? 1 : 0) >= 3) return C().toast('أكثر شي 4 لاعبين');
    if (r) roles.set(u, r); else roles.delete(u);
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#xGo').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (btn.disabled) return;
    const chatId = $('#sheet input[name=gchat]:checked')?.value;
    if (!chatId) return C().toast('اختر وين تلعبون');
    let state;
    if (kind === 'baloot') {
      const partner = [...roles].find(([, r]) => r === 'p')?.[0] || 'bot';
      const opp = [...roles].filter(([, r]) => r === 'o').map(([u]) => u);
      state = { seats: [me(), opp[0] || 'bot', partner, opp[1] || 'bot'], dealer: Math.floor(Math.random() * 4), target: 152 };
    } else if (kind === 'domino') {
      const ps = [...roles].filter(([, r]) => r === 'y').map(([u]) => u);
      const bots = Number($('#xBots').value);
      const seats = [me(), ...ps, ...Array(Math.min(bots, 3 - ps.length)).fill('bot')];
      if (seats.length < 2) return C().toast('لازم لاعبين على الأقل');
      state = { seats, target: Number($('#xTarget').value) };
    } else if (kind === 'draw') {
      const { data } = await C().sb.from('chat_members').select('user_id').eq('chat_id', chatId);
      const players = A.shuffle((data || []).map((r) => r.user_id), A.seeded(crypto.randomUUID()));
      if (players.length < 2) return C().toast('تحتاجون 2 على الأقل');
      const i = players.indexOf(me()); if (i > 0) { players.splice(i, 1); players.unshift(me()); }
      state = { players, rounds: Math.min(8, players.length <= 3 ? players.length * 2 : players.length) };
    } else if (kind === 'million') {
      const R = A.seeded(crypto.randomUUID());
      state = { v: 2, qs: pickMillion(R) };
    } else if (kind === 'huroof') {
      const prev = A.G.list.filter((x) => x.kind === 'huroof' && x.chat_id === chatId).map((x) => x.state.letter);
      const pool = HUROOF_LETTERS.filter((l) => !prev.slice(0, 8).includes(l));
      state = { letter: pool[Math.floor(Math.random() * pool.length)], secs: Number($('#xSecs').value) };
    }
    btn.disabled = true;
    C().closeSheet();
    A.createGame(kind, chatId, state, kind === 'huroof' ? `لعبة الحروف: حرف ${state.letter}` : info.n);
  };
}
async function againExt(g) {
  if (g.kind === 'baloot' || g.kind === 'domino') {
    const state = { ...g.state, dealer: Math.floor(Math.random() * 4) };
    return A.createGame(g.kind, g.chat_id, state, EXT_INFO[g.kind].n);
  }
  return extNewSheet(g.kind, g.chat_id);
}
function rulesSheet(kind) {
  const R = {
    baloot: `<p><b>الفرق:</b> أنت وشريكك (اللي قدامك) ضد الاثنين اللي على جنبك.</p>
      <p><b>الشراء:</b> تطلع ورقة مكشوفة. بدورك تقول <b>صن</b> (بدون حكم)، أو <b>حكم</b> (نوع الورقة المكشوفة يصير الحكم)، أو <b>بس</b>. الصن يغلب الحكم. إذا الكل قال بس، تجي جولة ثانية تقدر تختار فيها حكم بنوع ثاني. وإذا الكل قال بس مرتين، تنعاد التوزيعة.</p>
      <p><b>اللعب:</b> لازم تلعب من نفس نوع أول ورقة. في الحكم: إذا ما عندك من النوع وعندك حكم، لازم تقطع (إلا إذا شريكك ماسك الأكلة)، ولازم تكبّر على الحكم إذا تقدر.</p>
      <p><b>الأوراق الملوّنة</b> هي اللي تقدر تلعبها، والباهتة ممنوعة.</p>
      <p><b>النقاط:</b> الصن 26 والحكم 16 لكل صكّة. المشتري لازم ياخذ أكثر من خصمه وإلا تروح كلها للخصم. المشاريع (سرا، خمسين، مية، أربعمية، بلوت) تنحسب تلقائي. الكبوت (كل الأكلات): صن 44، حكم 25. أول فريق يوصل 152 يفوز.</p>`,
    domino: `<p>كل لاعب ياخذ 7 أحجار. بدورك تحط حجر رقمه يطابق أحد طرفين السلسلة.</p>
      <p>إذا ما عندك حجر يركب: تسحب من السوق، وإذا السوق فاضي تمرّر. (مع 4 لاعبين ما فيه سوق.)</p>
      <p>اللي يخلّص أحجاره أول ياخذ مجموع نقاط أحجار الباقين. إذا انقفلت اللعبة، صاحب أقل مجموع ياخذ.</p>
      <p>أول واحد يوصل للهدف (51 أو 101) يفوز.</p>`,
  }[kind] || '';
  C().openSheet(`<h3>طريقة اللعب</h3><div class="form rules">${R}</div>`);
}
