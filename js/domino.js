// لمّة · محرك الدومينو (من 2 إلى 4 لاعبين) — دوال صافية
// moves: [{seat, t:'p', a, b, end:'L'|'R'} | {seat, t:'d'} (سحب) | {seat, t:'x'} (مرّر)]

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const pips = (t) => t[0] + t[1];
const same = (t, a, b) => (t[0] === a && t[1] === b) || (t[0] === b && t[1] === a);

export function replay(gid, state, moves) {
  const n = state.seats.length;
  const target = state.target || 101;
  const score = Array(n).fill(0);
  const history = [];
  let round = 0, starter = -1, mi = 0, D;
  const newRound = () => {
    const tiles = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push([a, b]);
    const R = rng(gid + ':' + round);
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
    const hands = [];
    for (let p = 0; p < n; p++) hands.push(tiles.slice(p * 7, p * 7 + 7));
    const yard = n === 4 ? [] : tiles.slice(n * 7);
    // أول صكّة: اللي عنده أكبر دبل يبدأ، وبعدها الفايز في الصكّة اللي قبل
    let turn = starter;
    if (turn < 0) {
      let best = -1;
      hands.forEach((h, p) => h.forEach((t) => { if (t[0] === t[1] && t[0] * 10 > best) { best = t[0] * 10; turn = p; } }));
      if (turn < 0) turn = 0;
    }
    D = { round, hands, yard, chain: [], L: null, Rv: null, turn, passes: 0, phase: 'play', last: null, lacks: hands.map(() => new Set()) };
  };
  newRound();
  const fits = (t) => {
    if (!D.chain.length) return ['L'];
    const out = [];
    if (t[0] === D.L || t[1] === D.L) out.push('L');
    if (t[0] === D.Rv || t[1] === D.Rv) out.push('R');
    return out;
  };
  const endRound = (winner, blocked) => {
    const sums = D.hands.map((h) => h.reduce((s, t) => s + pips(t), 0));
    let w = winner;
    if (blocked) {
      const min = Math.min(...sums);
      const lows = sums.map((s, p) => (s === min ? p : -1)).filter((p) => p >= 0);
      w = lows.length === 1 ? lows[0] : -1;   // تعادل في القفلة: ما أحد ياخذ
    }
    let gain = 0;
    if (w >= 0) { gain = sums.reduce((s, x, p) => (p === w ? s : s + x), 0); score[w] += gain; }
    history.push({ round, winner: w, gain, blocked, sums });
    D.result = { winner: w, gain, blocked, sums };
    const over = score.some((s) => s >= target);
    if (over) { D.phase = 'over'; return true; }
    const prev = D;
    starter = w >= 0 ? w : D.turn;
    round++;
    newRound();
    D.prev = prev;
    return false;
  };
  for (; mi < moves.length; mi++) {
    const m = moves[mi];
    if (D.phase !== 'play') break;
    if (m.seat !== D.turn) continue;
    const hand = D.hands[m.seat];
    if (m.t === 'p') {
      const i = hand.findIndex((t) => same(t, m.a, m.b));
      if (i < 0) continue;
      const t = hand[i];
      const ends = fits(t);
      const end = ends.includes(m.end) ? m.end : ends[0];
      if (!end) continue;
      hand.splice(i, 1);
      if (!D.chain.length) { D.chain.push({ a: t[0], b: t[1], i: mi }); D.L = t[0]; D.Rv = t[1]; }
      else if (end === 'L') { const nb = t[0] === D.L ? t[1] : t[0]; D.chain.unshift({ a: nb, b: D.L, i: mi }); D.L = nb; }
      else { const nb = t[0] === D.Rv ? t[1] : t[0]; D.chain.push({ a: D.Rv, b: nb, i: mi }); D.Rv = nb; }
      D.passes = 0;
      D.last = { seat: m.seat, i: mi };
      if (!hand.length) { if (endRound(m.seat, false)) break; continue; }
      D.turn = (D.turn + 1) % n;
    } else if (m.t === 'd') {
      if (!D.yard.length || hand.some((t) => fits(t).length)) continue;
      D.lacks[m.seat].add(D.L); D.lacks[m.seat].add(D.Rv);
      hand.push(D.yard.shift());
    } else if (m.t === 'x') {
      if (D.yard.length || hand.some((t) => fits(t).length)) continue;
      D.lacks[m.seat].add(D.L); D.lacks[m.seat].add(D.Rv);
      D.passes++;
      if (D.passes >= n) { if (endRound(-1, true)) break; continue; }
      D.turn = (D.turn + 1) % n;
    }
  }
  const winner = D.phase === 'over' ? score.indexOf(Math.max(...score)) : -1;
  return { D, score, history, winner, target, fits, n };
}

export function playable(st, seat) {
  return st.D.hands[seat].filter((t) => st.fits(t).length);
}

export function botAction(st) {
  const D = st.D, n = st.n;
  const seat = D.turn;
  const hand = D.hands[seat];
  const opts = [];
  for (const t of playable(st, seat)) for (const end of st.fits(t)) opts.push({ t, end });
  if (!opts.length) return D.yard.length ? { t: 'd' } : { t: 'x' };
  // الأرقام اللي نزلت كلها (نعرف كم باقي من كل رقم)
  const out = Array(7).fill(0);
  for (const c of D.chain) { out[c.a]++; out[c.b]++; }
  for (const t of hand) { out[t[0]]++; out[t[1]]++; }
  const next = (seat + 1) % n;
  const score = ({ t, end }) => {
    let L = D.L, R = D.Rv;
    if (!D.chain.length) { L = t[0]; R = t[1]; }
    else if (end === 'L') L = t[0] === D.L ? t[1] : t[0];
    else R = t[0] === D.Rv ? t[1] : t[0];
    const rest = hand.filter((x) => x !== t);
    if (!rest.length) return 1e6;                       // آخر حجر: خلّصنا
    let v = pips(t) * 1.1;                              // نتخلص من الثقيل
    if (t[0] === t[1]) v += 3;                          // الدبل صعب ينزل بعدين
    // نخلي عندنا شي يركب بعدين
    const fitsAfter = rest.filter((x) => x[0] === L || x[1] === L || x[0] === R || x[1] === R).length;
    v += fitsAfter * 2.6;
    // نتنوّع: أرقام نملكها أكثر تكون على الأطراف
    const mine = (k) => rest.filter((x) => x[0] === k || x[1] === k).length;
    v += (mine(L) + mine(R)) * 0.8;
    // نسكّر على اللي بعدنا لو نعرف إنه ما عنده هالأرقام
    const lk = D.lacks?.[next];
    if (lk) v += (lk.has(L) ? 3.5 : 0) + (lk.has(R) ? 3.5 : 0);
    // الرقم اللي قرب يخلص (نزل أغلبه) يقفل على الخصوم
    v += (out[L] >= 6 ? 1.5 : 0) + (out[R] >= 6 ? 1.5 : 0);
    return v;
  };
  let best = opts[0], bs = -Infinity;
  for (const o of opts) { const v = score(o) + Math.random() * 0.3; if (v > bs) { bs = v; best = o; } }
  return { t: 'p', a: best.t[0], b: best.t[1], end: best.end };
}
