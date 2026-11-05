// لمّة · محرك البلوت (قواعد سعودية مبسّطة) — دوال صافية بدون واجهة
// المقاعد 0..3، الفريق الأول 0 و2، والثاني 1 و3. اللعب يمشي للمقعد اللي بعده (seat+1)

export const SUITS = ['s', 'h', 'd', 'c'];            // ♠ ♥ ♦ ♣
export const SUIT_CH = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME = { s: 'شريحة', h: 'قلب', d: 'ديمن', c: 'سبيت' };
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const RANK_AR = { A: 'إكة', K: 'شايب', Q: 'بنت', J: 'ولد', 10: '10', 9: '9', 8: '8', 7: '7' };
const ORDER_SUN = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];    // من الأضعف للأقوى
const ORDER_TRUMP = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
const VAL_SUN = { A: 11, 10: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };
const VAL_TRUMP = { J: 20, 9: 14, A: 11, 10: 10, K: 4, Q: 3, 8: 0, 7: 0 };
const SEQ = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];          // ترتيب السرا

export const cardOf = (id) => ({ r: id.slice(0, -1), s: id.slice(-1) });
export const team = (seat) => seat % 2;
const partner = (seat) => (seat + 2) % 4;

// خلط ثابت حسب البذرة (كل الأجهزة تطلع نفس التوزيعة)
function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function deck(seed) {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  const R = rng(seed);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

export const cardValue = (id, mode, trump) => {
  const c = cardOf(id);
  return mode === 'hokum' && c.s === trump ? VAL_TRUMP[c.r] : VAL_SUN[c.r];
};
const strength = (id, mode, trump) => {
  const c = cardOf(id);
  return mode === 'hokum' && c.s === trump ? 100 + ORDER_TRUMP.indexOf(c.r) : ORDER_SUN.indexOf(c.r);
};

// الفائز بالأكلة: أقوى حكم إذا فيه، وإلا أقوى ورقة من نوع أول ورقة
export function trickWinner(trick, mode, trump) {
  const led = cardOf(trick[0].c).s;
  let best = trick[0];
  for (const t of trick.slice(1)) {
    const c = cardOf(t.c), b = cardOf(best.c);
    const tTrump = mode === 'hokum' && c.s === trump, bTrump = mode === 'hokum' && b.s === trump;
    if (tTrump && !bTrump) best = t;
    else if (tTrump === bTrump && c.s === b.s && strength(t.c, mode, trump) > strength(best.c, mode, trump)) best = t;
    else if (!tTrump && !bTrump && c.s === led && b.s !== led) best = t;
  }
  return best.seat;
}

// الأوراق المسموحة: لازم تمشي على النوع، وفي الحكم لازم تقطع وتكبّر إذا تقدر
export function legalCards(hand, trick, mode, trump, seat) {
  if (!trick.length) return hand.slice();
  const led = cardOf(trick[0].c).s;
  const same = hand.filter((x) => cardOf(x).s === led);
  const highestTrump = () => {
    const ts = trick.filter((t) => cardOf(t.c).s === trump);
    return ts.length ? Math.max(...ts.map((t) => strength(t.c, mode, trump))) : -1;
  };
  if (same.length) {
    if (mode === 'hokum' && led === trump) {
      const hi = highestTrump();
      const higher = same.filter((x) => strength(x, mode, trump) > hi);
      return higher.length ? higher : same;
    }
    return same;
  }
  if (mode === 'hokum') {
    const trumps = hand.filter((x) => cardOf(x).s === trump);
    const winner = trickWinner(trick, mode, trump);
    if (trumps.length && winner !== partner(seat)) {
      const hi = highestTrump();
      const higher = trumps.filter((x) => strength(x, mode, trump) > hi);
      return higher.length ? higher : trumps;
    }
  }
  return hand.slice();
}

// المشاريع: سرا (3 ورا بعض)، خمسين (4)، مية (5 أو أربع من نفس الصورة)، أربعمية (أربع إكك في الصن)
export function projectsOf(hand, mode) {
  const out = [];
  for (const s of SUITS) {
    const idx = hand.filter((x) => cardOf(x).s === s).map((x) => SEQ.indexOf(cardOf(x).r)).sort((a, b) => a - b);
    let run = [];
    const flush = () => {
      if (run.length >= 5) out.push({ k: 'mia', top: run[run.length - 1], n: run.length });
      else if (run.length === 4) out.push({ k: '50', top: run[3], n: 4 });
      else if (run.length === 3) out.push({ k: 'sira', top: run[2], n: 3 });
      run = [];
    };
    for (const i of idx) { if (run.length && i !== run[run.length - 1] + 1) flush(); run.push(i); }
    flush();
  }
  for (const r of ['A', 'K', 'Q', 'J', '10']) {
    if (hand.filter((x) => cardOf(x).r === r).length === 4) {
      if (r === 'A' && mode === 'sun') out.push({ k: '400', top: 99, r });
      else out.push({ k: 'mia', top: 50 + SEQ.indexOf(r), r });
    }
  }
  return out;
}
const PROJ_PTS = { sun: { sira: 4, 50: 10, mia: 20, 400: 40 }, hokum: { sira: 2, 50: 5, mia: 10, 400: 0 } };
const PROJ_RANK = { sira: 1, 50: 2, mia: 3, 400: 4 };
export const PROJ_NAME = { sira: 'سرا', 50: 'خمسين', mia: 'مية', 400: 'أربعمية' };

// إعادة بناء اللعبة كاملة من الحركات (كل الأجهزة تحسب نفس الشي)
// state: { seats: [uid|'bot'] , dealer, target } ، moves: [{seat, t:'b'|'p', v, s, c}] بالترتيب
export function replay(gid, state, moves) {
  const target = state.target || 152;
  const score = [0, 0];
  const history = [];
  let dealer = state.dealer || 0;
  let deal = 0;            // رقم التوزيعة (يزيد حتى لو انعادت)
  let mi = 0;
  let R = null;            // الصكّة الحالية
  const newRound = () => {
    const d = deck(gid + ':' + deal);
    const hands = [[], [], [], []];
    for (let i = 0; i < 4; i++) hands[(dealer + 1 + i) % 4] = d.slice(i * 5, i * 5 + 5);
    R = { deal, dealer, deck: d, hands, faceUp: d[20], phase: 'bid1', turn: (dealer + 1) % 4, bids: [], buyer: null, mode: null, trump: null,
      tricks: [], trick: [], leader: null, abnat: [0, 0], took: [0, 0], projects: [[], [], [], []], lastTrick: null };
  };
  newRound();
  const finishBid = () => {
    // يوزّع الباقي: المشتري ياخذ الورقة المكشوفة + 2، والباقين 3
    let k = 21;
    for (let i = 0; i < 4; i++) {
      const p = (R.dealer + 1 + i) % 4;
      if (p === R.buyer) { R.hands[p].push(R.faceUp, R.deck[k], R.deck[k + 1]); k += 2; }
      else { R.hands[p].push(R.deck[k], R.deck[k + 1], R.deck[k + 2]); k += 3; }
    }
    R.phase = 'play';
    R.leader = (R.dealer + 1) % 4;
    R.turn = R.leader;
    for (let p = 0; p < 4; p++) R.projects[p] = projectsOf(R.hands[p], R.mode);
  };
  const endRound = () => {
    const mode = R.mode, trump = R.trump;
    const total = mode === 'sun' ? 26 : 16;
    const bt = team(R.buyer);
    // أفضل مشروع لكل فريق: الفريق الأقوى ياخذ مشاريعه كلها، والثاني تنلغي
    const best = [null, null];
    const cmp = (a, b) => (PROJ_RANK[a.k] - PROJ_RANK[b.k]) || (a.n || 0) - (b.n || 0) || a.top - b.top;
    R.projects.forEach((list, p) => list.forEach((pr) => { const t = team(p); if (!best[t] || cmp(pr, best[t]) > 0) best[t] = pr; }));
    let projWin = -1;
    if (best[0] && best[1]) { const c = cmp(best[0], best[1]); projWin = c > 0 ? 0 : c < 0 ? 1 : (team((R.dealer + 1) % 4)); }
    else if (best[0]) projWin = 0; else if (best[1]) projWin = 1;
    const proj = [0, 0];
    if (projWin >= 0) R.projects.forEach((list, p) => { if (team(p) === projWin) list.forEach((pr) => { proj[projWin] += PROJ_PTS[mode][pr.k]; }); });
    // البلوت: الشايب والبنت من الحكم بيد واحد
    let baloot = -1;
    if (mode === 'hokum') {
      for (let p = 0; p < 4; p++) {
        const played = R.tricks.flatMap((t) => t.cards).filter((x) => x.seat === p).map((x) => x.c);
        if (played.includes('K' + trump) && played.includes('Q' + trump)) baloot = team(p);
      }
    }
    if (baloot >= 0) proj[baloot] += 2;
    let pts = [0, 0];
    const kaboot = R.took[0] === 8 ? 0 : R.took[1] === 8 ? 1 : -1;
    if (kaboot >= 0) {
      pts[kaboot] = (mode === 'sun' ? 44 : 25) + proj[0] + proj[1];
    } else {
      const div = mode === 'sun' ? 5 : 10;
      const raw = R.abnat.map((a) => a / div);
      // نقرّب بحيث المجموع يساوي 26 أو 16
      const b0 = Math.round(raw[bt] - 0.0001);
      pts[bt] = Math.min(total, Math.max(0, b0));
      pts[1 - bt] = total - pts[bt];
      pts[0] += proj[0]; pts[1] += proj[1];
      R.failed = pts[bt] <= pts[1 - bt];
      if (R.failed) { pts[1 - bt] = pts[0] + pts[1]; pts[bt] = 0; }
    }
    R.result = { pts, proj, kaboot, baloot, projWin, best };
    score[0] += pts[0]; score[1] += pts[1];
    history.push({ deal: R.deal, mode, trump, buyer: R.buyer, pts, abnat: R.abnat.slice(), failed: !!R.failed, kaboot });
  };

  for (; mi < moves.length; mi++) {
    const m = moves[mi];
    if (R.phase === 'over') break;
    if (m.seat !== R.turn) continue;   // حركة مو بدورها (نتجاهلها)
    if (R.phase === 'bid1' || R.phase === 'bid2') {
      if (m.t !== 'b') continue;
      R.bids.push({ seat: m.seat, v: m.v, s: m.s, round: R.phase });
      const faceSuit = cardOf(R.faceUp).s;
      if (m.v === 'sun') { R.buyer = m.seat; R.mode = 'sun'; R.trump = null; finishBid(); continue; }
      if (R.phase === 'bid1') {
        if (m.v === 'hokum' && R.buyer === null) { R.buyer = m.seat; R.mode = 'hokum'; R.trump = faceSuit; }
        const acted = R.bids.filter((b) => b.round === 'bid1').length;
        if (acted >= 4) {
          if (R.buyer !== null) finishBid();
          else { R.phase = 'bid2'; R.turn = (R.dealer + 1) % 4; }
          continue;
        }
        R.turn = (R.turn + 1) % 4;
        continue;
      }
      // الجولة الثانية: أول واحد يشتري ياخذها
      if (m.v === 'hokum' && m.s && m.s !== faceSuit) { R.buyer = m.seat; R.mode = 'hokum'; R.trump = m.s; finishBid(); continue; }
      const acted2 = R.bids.filter((b) => b.round === 'bid2').length;
      if (acted2 >= 4) {
        // الكل قال بس مرتين: نعيد التوزيع والموزّع يتغير
        history.push({ deal: R.deal, redeal: true });
        dealer = (dealer + 1) % 4; deal++; newRound();
        continue;
      }
      R.turn = (R.turn + 1) % 4;
      continue;
    }
    if (R.phase === 'play') {
      if (m.t !== 'p') continue;
      const hand = R.hands[m.seat];
      if (!hand.includes(m.c)) continue;
      if (!legalCards(hand, R.trick, R.mode, R.trump, m.seat).includes(m.c)) continue;
      hand.splice(hand.indexOf(m.c), 1);
      R.trick.push({ seat: m.seat, c: m.c, i: mi });
      if (R.trick.length < 4) { R.turn = (R.turn + 1) % 4; continue; }
      const w = trickWinner(R.trick, R.mode, R.trump);
      const pts = R.trick.reduce((n, t) => n + cardValue(t.c, R.mode, R.trump), 0);
      R.abnat[team(w)] += pts;
      R.took[team(w)]++;
      R.tricks.push({ cards: R.trick, winner: w, at: mi });
      R.lastTrick = R.tricks[R.tricks.length - 1];
      R.trick = [];
      R.turn = w;
      if (R.tricks.length === 8) {
        R.abnat[team(w)] += 10;      // الأرض
        endRound();
        const done = score[0] >= target || score[1] >= target;
        if (done && score[0] !== score[1]) { R.phase = 'over'; break; }
        R.finished = R.result;
        const prev = R;
        dealer = (dealer + 1) % 4; deal++; newRound();
        R.prev = prev;
      }
    }
  }
  const winner = R.phase === 'over' ? (score[0] > score[1] ? 0 : 1) : -1;
  return { R, score, history, winner, target, nextIndex: moves.length };
}

// ---------- الكمبيوتر ----------
// يلعب بعدل: يشوف أوراقه وبس، ويتذكر الأوراق اللي نزلت ومين قطع أي نوع.
// لكل ورقة يقدر يلعبها، يتخيّل توزيعات كثيرة للأوراق المخفية ويكمّل اللعب فيها، ويختار اللي يجيب أكثر.

// لعب سريع (يستخدمه في التخيّل)
function quickPlay(hand, trick, mode, trump, seat, buyer) {
  const legal = legalCards(hand, trick, mode, trump, seat);
  if (legal.length === 1) return legal[0];
  const val = (x) => cardValue(x, mode, trump);
  const str = (x) => strength(x, mode, trump);
  const low = (arr) => { let b = arr[0]; for (const x of arr) if (val(x) < val(b) || (val(x) === val(b) && str(x) < str(b))) b = x; return b; };
  if (!trick.length) {
    if (mode === 'hokum' && buyer >= 0 && team(buyer) === team(seat)) {
      const tr = legal.filter((x) => cardOf(x).s === trump);
      if (tr.length) { let b = tr[0]; for (const x of tr) if (str(x) > str(b)) b = x; if (cardOf(b).r === 'J' || cardOf(b).r === '9') return b; }
    }
    const aces = legal.filter((x) => cardOf(x).r === 'A' && !(mode === 'hokum' && cardOf(x).s === trump));
    if (aces.length) return aces[0];
    const tens = legal.filter((x) => cardOf(x).r === '10' && !(mode === 'hokum' && cardOf(x).s === trump));
    if (tens.length && Math.random() < 0.3) return tens[0];
    return low(legal.filter((x) => !(mode === 'hokum' && cardOf(x).s === trump)).length ? legal.filter((x) => !(mode === 'hokum' && cardOf(x).s === trump)) : legal);
  }
  const w = trickWinner(trick, mode, trump);
  if (team(w) === team(seat)) {
    const safe = legal.filter((x) => trickWinner([...trick, { seat, c: x }], mode, trump) === w);
    if (trick.length === 3 || (safe.length && Math.random() < 0.5)) {
      const give = safe.filter((x) => !(mode === 'hokum' && cardOf(x).s === trump));
      if (give.length) { let b = give[0]; for (const x of give) if (val(x) > val(b)) b = x; return b; }
    }
    return low(legal);
  }
  const winners = legal.filter((x) => trickWinner([...trick, { seat, c: x }], mode, trump) === seat);
  if (winners.length) { let b = winners[0]; for (const x of winners) if (str(x) < str(b)) b = x; return b; }
  return low(legal);
}

// يكمّل الصكّة لين آخرها ويرجع الأبناط لكل فريق
function playOut(hands, trick, turn, mode, trump, buyer, abnat, took, tricksLeft) {
  let tr = trick.slice();
  let t = turn;
  let left = tricksLeft;
  while (left > 0) {
    const c = quickPlay(hands[t], tr, mode, trump, t, buyer);
    hands[t].splice(hands[t].indexOf(c), 1);
    tr.push({ seat: t, c });
    if (tr.length < 4) { t = (t + 1) % 4; continue; }
    const w = trickWinner(tr, mode, trump);
    let pts = 0;
    for (const x of tr) pts += cardValue(x.c, mode, trump);
    left--;
    if (!left) pts += 10;
    abnat[team(w)] += pts; took[team(w)]++;
    tr = []; t = w;
  }
  return abnat;
}

// قيمة الصكّة بالنقاط لفريقي (مع خسارة المشترى والكبوت)
function roundValue(abnat, took, mode, buyer, myTeam) {
  const mul = mode === 'sun' ? 2 : 1;
  let pts = [Math.round(abnat[0] * mul / 10), Math.round(abnat[1] * mul / 10)];
  if (took[0] === 8) pts = [mode === 'sun' ? 44 : 25, 0];
  else if (took[1] === 8) pts = [0, mode === 'sun' ? 44 : 25];
  else if (buyer >= 0) {
    const bt = team(buyer);
    if (pts[bt] <= pts[1 - bt]) pts = bt === 0 ? [0, pts[0] + pts[1]] : [pts[0] + pts[1], 0];
  }
  return pts[myTeam] - pts[1 - myTeam];
}

// وش نعرف عن الأوراق المخفية: مين ما عنده نوع معيّن
function knowledge(R, seat) {
  const voids = [new Set(), new Set(), new Set(), new Set()];
  const seen = new Set(R.hands[seat]);
  const tricks = [...R.tricks.map((t) => t.cards), ...(R.trick.length ? [R.trick] : [])];
  for (const tr of tricks) {
    const led = cardOf(tr[0].c).s;
    for (let i = 0; i < tr.length; i++) {
      const x = tr[i];
      seen.add(x.c);
      if (i === 0) continue;
      const s = cardOf(x.c).s;
      if (s !== led) {
        voids[x.seat].add(led);
        if (R.mode === 'hokum' && s !== R.trump) {
          // ما قطع وهو لازم يقطع (الخصم ماسك): يعني ما عنده حكم
          const w = trickWinner(tr.slice(0, i), R.mode, R.trump);
          if (team(w) !== team(x.seat)) voids[x.seat].add(R.trump);
        }
      }
    }
  }
  return { voids, seen };
}

// نوزّع الأوراق المخفية عشوائياً بس بشكل يناسب اللي نعرفه
function sampleHands(R, seat, know, fixed) {
  const unknown = [];
  for (const s of SUITS) for (const r of RANKS) { const id = r + s; if (!know.seen.has(id) && !fixed.has(id)) unknown.push(id); }
  const need = [0, 1, 2, 3].map((p) => (p === seat ? 0 : R.hands[p].length - (fixed.get(p)?.length || 0)));
  for (let attempt = 0; attempt < 30; attempt++) {
    const pool = unknown.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const hands = [0, 1, 2, 3].map((p) => (p === seat ? R.hands[seat].slice() : (fixed.get(p) || []).slice()));
    // الأصعب أول: اللي عنده أنواع ناقصة أكثر
    const order = [0, 1, 2, 3].filter((p) => p !== seat).sort((a, b) => know.voids[b].size - know.voids[a].size);
    let ok = true;
    for (const p of order) {
      for (let k = 0; k < need[p]; k++) {
        const idx = attempt < 25 ? pool.findIndex((c) => !know.voids[p].has(cardOf(c).s)) : 0;
        if (idx < 0) { ok = false; break; }
        hands[p].push(pool.splice(idx, 1)[0]);
      }
      if (!ok) break;
    }
    if (ok) return hands;
  }
  return null;
}

function chooseCard(R, seat) {
  const legal = legalCards(R.hands[seat], R.trick, R.mode, R.trump, seat);
  if (legal.length === 1) return legal[0];
  const know = knowledge(R, seat);
  // المشتري أخذ الورقة المكشوفة: نعرف إنها عنده لين ينزلها
  const fixed = new Map();
  if (R.buyer !== seat && !know.seen.has(R.faceUp)) fixed.set(R.buyer, [R.faceUp]);
  const myTeam = team(seat);
  const score = new Map(legal.map((c) => [c, 0]));
  const tricksLeft = 8 - R.tricks.length;
  const budget = 1400;
  const n = Math.max(24, Math.floor(budget / legal.length));
  for (let i = 0; i < n; i++) {
    const hands = sampleHands(R, seat, know, fixed);
    if (!hands) break;
    for (const c of legal) {
      const H = hands.map((h) => h.slice());
      H[seat].splice(H[seat].indexOf(c), 1);
      const tr = [...R.trick, { seat, c }];
      const abnat = R.abnat.slice(), took = R.took.slice();
      let turn = (seat + 1) % 4, left = tricksLeft;
      let trickNow = tr;
      if (tr.length === 4) {
        const w = trickWinner(tr, R.mode, R.trump);
        let pts = 0; for (const x of tr) pts += cardValue(x.c, R.mode, R.trump);
        left--; if (!left) pts += 10;
        abnat[team(w)] += pts; took[team(w)]++;
        trickNow = []; turn = w;
      }
      playOut(H, trickNow, turn, R.mode, R.trump, R.buyer, abnat, took, left);
      score.set(c, score.get(c) + roundValue(abnat, took, R.mode, R.buyer, myTeam) + (abnat[myTeam] - abnat[1 - myTeam]) * 0.02);
    }
  }
  let best = legal[0];
  for (const c of legal) if (score.get(c) > score.get(best)) best = c;
  return best;
}

// الشراء: يتخيّل الصكّة كاملة لو اشترى (صن أو حكم) ويشوف هل تستاهل
function bidValue(R, seat, mode, trump) {
  const sims = 36;
  let total = 0;
  const myTeam = team(seat);
  for (let i = 0; i < sims; i++) {
    // الأوراق اللي ما نعرفها: كل شي غير يدي والمكشوفة
    const known = new Set([...R.hands[seat], R.faceUp]);
    const pool = [];
    for (const s of SUITS) for (const r of RANKS) { const id = r + s; if (!known.has(id)) pool.push(id); }
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    const hands = [[], [], [], []];
    hands[seat] = [...R.hands[seat], R.faceUp, pool.pop(), pool.pop()];
    for (let p = 0; p < 4; p++) if (p !== seat) hands[p] = pool.splice(0, 8);
    const abnat = [0, 0], took = [0, 0];
    playOut(hands, [], (R.dealer + 1) % 4, mode, trump, seat, abnat, took, 8);
    total += roundValue(abnat, took, mode, seat, myTeam);
  }
  return total / sims;
}

export function botAction(R) {
  const seat = R.turn;
  if (R.phase === 'bid1' || R.phase === 'bid2') {
    const face = cardOf(R.faceUp).s;
    const partnerBought = R.buyer !== null && team(R.buyer) === team(seat);
    const opts = [];
    opts.push({ b: { t: 'b', v: 'sun' }, ev: bidValue(R, seat, 'sun', null), need: partnerBought ? 9 : 3 });
    if (R.phase === 'bid1' && R.buyer === null) opts.push({ b: { t: 'b', v: 'hokum' }, ev: bidValue(R, seat, 'hokum', face), need: 1.5 });
    if (R.phase === 'bid2') for (const s of SUITS) if (s !== face) opts.push({ b: { t: 'b', v: 'hokum', s }, ev: bidValue(R, seat, 'hokum', s), need: 2 });
    // آخر واحد في الجولة الثانية: يتساهل شوي بدل ما تنعاد
    const lastChance = R.phase === 'bid2' && R.bids.filter((b) => b.round === 'bid2').length === 3;
    const best = opts.filter((o) => o.ev >= o.need - (lastChance ? 2 : 0)).sort((a, b) => (b.ev - b.need) - (a.ev - a.need))[0];
    return best ? best.b : { t: 'b', v: 'pass' };
  }
  return { t: 'p', c: chooseCard(R, seat) };
}
