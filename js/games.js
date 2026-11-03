// لمّة · الألعاب الجماعية
import { WHO_QUESTIONS, WHEEL_TITLES, QUIZ, WORDS, normWord, scoreGuess } from './gamedata.js';

let C;            // أدوات من التطبيق
const G = { list: [], moves: new Map(), open: null, word: null, quizRun: null, wordInput: '', wheelShown: 0, spinning: false, quizStarts: {}, seen: new Map(), celebrated: new Set() };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const svg = (d, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${d}</svg>`;

export const GICON = {
  who: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8v.2"/>'),
  wheel: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.8"/><path d="M12 3.5v6.7M12 13.8v6.7M3.5 12h6.7M13.8 12h6.7M6 6l4.7 4.7M13.3 13.3 18 18M18 6l-4.7 4.7M10.7 13.3 6 18"/>'),
  quiz: svg('<path d="M9 18.5h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8v.3h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>'),
  xo: svg('<path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"/>'),
  c4: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8" cy="9" r="1.6"/><circle cx="12" cy="9" r="1.6"/><circle cx="16" cy="9" r="1.6"/><circle cx="8" cy="15" r="1.6"/><circle cx="12" cy="15" r="1.6"/><circle cx="16" cy="15" r="1.6"/>'),
  word: svg('<rect x="3" y="8" width="5" height="7" rx="1.2"/><rect x="9.5" y="8" width="5" height="7" rx="1.2"/><rect x="16" y="8" width="5" height="7" rx="1.2"/>'),
  pad: svg('<path d="M7 7.5h10a4.5 4.5 0 0 1 4.4 5.5l-.9 3.8a2.3 2.3 0 0 1-4 .9L14.6 15H9.4l-1.9 2.7a2.3 2.3 0 0 1-4-.9L2.6 13A4.5 4.5 0 0 1 7 7.5zM7.5 10.5v3M6 12h3M15.5 11.2v.1M17.5 13v.1"/>'),
};
export const GINFO = {
  who: { n: 'مين فينا؟', d: 'سؤال والكل يصوّت', c: '#E8A33D' },
  wheel: { n: 'عجلة الحظ', d: 'العجلة تختار واحد قدام الكل', c: '#7C5CFF' },
  quiz: { n: 'مسابقة سريعة', d: '10 أسئلة، وأسرع واحد يفوز', c: '#1DAA61' },
  xo: { n: 'إكس أو', d: 'تحدّى واحد من أهلك', c: '#3B82F6' },
  c4: { n: 'أربعة بخط واحد', d: 'رتّب أربع قطع على خط', c: '#E5484D' },
  word: { n: 'كلمة اليوم', d: 'خمّن الكلمة في 6 محاولات', c: '#0F8B8D' },
};
const TURN = new Set(['xo', 'c4']);
const esc = (s) => C.esc(s);
const me = () => C.me();

export function initGames(ctx) { C = ctx; }
const sfx = (n) => C.sfx?.(n);
const buzz = (p) => { try { navigator.vibrate?.(p); } catch (e) { /* ignore */ } };
export const gameIsOpen = () => !$('#game').classList.contains('off');
export function closeGame() {
  $('#game').classList.add('off');
  clearInterval(G.quizTimer);
  G.open = null;
  G.quizRun = null;
}
export function gameTitle(g) {
  if (!g) return '';
  if (g.kind === 'who') return g.state?.q || GINFO.who.n;
  if (g.kind === 'wheel') return g.state?.t || GINFO.wheel.n;
  return GINFO[g.kind]?.n || 'لعبة';
}

// ---------- اليوم (بتوقيت الرياض) ----------
function today() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p; // YYYY-MM-DD
}
function wordOf(day) {
  const [y, m, d] = day.split('-').map(Number);
  const n = Math.floor(Date.UTC(y, m - 1, d) / 864e5);
  return WORDS[((n * 31 + 7) % WORDS.length + WORDS.length) % WORDS.length];
}
function seeded(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function shuffle(arr, rnd) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- البيانات ----------
export async function loadGames() {
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data } = await C.sb.from('games').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(60);
  G.list = data || [];
  const ids = G.list.map((g) => g.id);
  G.moves = new Map(ids.map((id) => [id, []]));
  if (ids.length) {
    const { data: mv } = await C.sb.from('game_moves').select('*').in('game_id', ids);
    for (const m of mv || []) G.moves.get(m.game_id)?.push(m);
  }
}
const movesOf = (id) => G.moves.get(id) || [];
const turnMoves = (id) => movesOf(id).filter((m) => /^m\d+$/.test(m.key)).sort((a, b) => Number(a.key.slice(1)) - Number(b.key.slice(1)));

export async function onGameChange(table, p) {
  const r = p.eventType === 'DELETE' ? p.old : p.new;
  if (table === 'games') {
    const i = G.list.findIndex((g) => g.id === r.id);
    if (p.eventType === 'DELETE') { if (i >= 0) G.list.splice(i, 1); }
    else if (i >= 0) G.list[i] = { ...G.list[i], ...r };
    else { G.list.unshift(r); if (!G.moves.has(r.id)) G.moves.set(r.id, []); }
  } else {
    if (!G.moves.has(r.game_id)) {
      G.moves.set(r.game_id, []);
      if (!G.list.some((g) => g.id === r.game_id)) {
        const { data } = await C.sb.from('games').select('*').eq('id', r.game_id).single();
        if (data) G.list.unshift(data);
      }
    }
    const arr = G.moves.get(r.game_id);
    const j = arr.findIndex((m) => m.user_id === r.user_id && m.key === r.key);
    if (p.eventType === 'DELETE') { if (j >= 0) arr.splice(j, 1); }
    else if (j >= 0) arr[j] = r; else arr.push(r);
  }
  // الخصم وافق على الجولة الثانية وأنا فاتح الجولة القديمة: انقلني لها
  if (table === 'game_moves' && r.key === 'acc' && G.open && p.eventType !== 'DELETE') {
    const ng = G.list.find((x) => x.id === r.game_id);
    if (ng && ng.state?.prev === G.open.id && ng.created_by === me()) { sfx('ding'); C.toast(C.short(r.user_id) + ' وافق، يلا!'); openGame(ng.id); return; }
    if (ng && ng.id === G.open.id && ng.created_by === me()) { sfx('ding'); C.toast(C.short(r.user_id) + ' قبل التحدي'); }
  }
  const relGame = table === 'game_moves' ? G.list.find((x) => x.id === r.game_id) : r;
  if (G.open && (G.open.id === r.id || G.open.id === r.game_id || relGame?.state?.prev === G.open.id)) {
    G.open = G.list.find((g) => g.id === G.open.id) || G.open;
    renderGame();
  }
  if (C.tab() === 'games') renderGamesPane();
  C.onBadge?.();
}

// دورك؟ (عدد الألعاب اللي تنتظرك)
export function myTurns() {
  return G.list.filter((g) => TURN.has(g.kind) && g.status === 'open' && !declined(g) && !winnerOf(g)
    && (pendingInvite(g) ? g.state.to === me() : turnOf(g) === me())).length;
}

// ---------- تبويب الألعاب ----------
export function renderGamesPane() {
  const pane = $('#pane-games');
  if (!pane) return;
  const day = today();
  const wg = G.list.find((g) => g.kind === 'word' && g.day === day);
  const mine = wg ? movesOf(wg.id).filter((m) => m.user_id === me()) : [];
  const target = normWord(wordOf(day));
  const solved = mine.some((m) => m.data?.w === target);
  const wordSub = solved ? `حلّيتها في ${mine.length} ${mine.length === 1 ? 'محاولة' : 'محاولات'}` : mine.length >= 6 ? 'ما حلّيتها اليوم، بكرة كلمة جديدة' : mine.length ? `جرّبت ${mine.length} من 6` : 'كلمة جديدة كل يوم للعائلة كلها';
  const played = wg ? new Set(movesOf(wg.id).map((m) => m.user_id)).size : 0;
  const active = G.list.filter((g) => g.kind !== 'word' && C.chatOf(g.chat_id));
  pane.innerHTML = `
    <button class="word-card" data-word="1">
      <span class="wc-ic">${GICON.word}</span>
      <span class="wc-t"><b>كلمة اليوم</b><small>${esc(wordSub)}</small></span>
      <span class="wc-tiles">${[0, 1, 2, 3, 4].map((i) => `<i class="${solved ? 'g' : i < mine.length ? 'y' : ''}"></i>`).join('')}</span>
      ${played ? `<span class="wc-n">${played} لعبوا اليوم</span>` : ''}
    </button>
    <p class="section-t">العب مع العائلة</p>
    <div class="game-grid">
      ${['who', 'wheel', 'quiz', 'xo', 'c4'].map((k) => `<button class="gtile" data-new="${k}" style="--gc:${GINFO[k].c}"><span class="gt-ic">${GICON[k]}</span><b>${GINFO[k].n}</b><small>${GINFO[k].d}</small></button>`).join('')}
    </div>
    <p class="section-t">ألعاب آخر 3 أيام</p>
    ${active.length ? `<ul class="list">${active.map(gameRow).join('')}</ul>` : `<div class="empty"><span class="empty-ic">${GICON.pad}</span><b>ما فيه ألعاب جارية</b><small>اختر لعبة فوق وابدأ مع أهلك</small></div>`}`;
  C.hydrate(pane);
  pane.onclick = (e) => {
    if (e.target.closest('[data-word]')) return openWord();
    const n = e.target.closest('[data-new]')?.dataset.new;
    if (n) return newGameSheet(n);
    const id = e.target.closest('[data-game]')?.dataset.game;
    if (id) openGame(id);
  };
}
function gameRow(g) {
  const c = C.chatOf(g.chat_id);
  let sub = c ? C.chatName(c) : '';
  let flag = '';
  if (TURN.has(g.kind)) {
    const w = winnerOf(g);
    if (declined(g)) sub += ' · ' + (g.state.to === me() ? 'اعتذرت' : 'اعتذر ' + C.short(g.state.to));
    else if (pendingInvite(g)) {
      if (g.state.to === me()) flag = '<span class="turn-badge">يتحداك</span>';
      else sub += ' · ننتظر موافقة ' + C.short(g.state.to);
    } else if (w) sub += ' · ' + (w === 'draw' ? 'تعادل' : w === me() ? 'فزت' : 'فاز ' + C.short(w));
    else if (turnOf(g) === me()) flag = '<span class="turn-badge">دورك</span>';
    else sub += ' · دور ' + C.short(turnOf(g));
  } else {
    const n = new Set(movesOf(g.id).map((m) => m.user_id)).size;
    if (n) sub += ` · ${n} ${g.kind === 'wheel' ? 'لفّات' : 'شاركوا'}`;
  }
  return `<li class="row grow-row" data-game="${g.id}"><span class="av gav" style="background:${GINFO[g.kind].c}">${GICON[g.kind]}</span>
    <div class="row-main"><div class="row-text"><b>${esc(gameTitle(g))}</b><span>${esc(sub)}</span></div>
    <div class="row-side"><time>${C.listTime(g.created_at)}</time>${flag}</div></div></li>`;
}

// ---------- لعبة جديدة ----------
function groupOptions(pre) {
  const groups = C.chats().filter((c) => !c.is_direct);
  return groups.map((c, i) => `<label class="check">${C.chatAvatar(c, 'sm')}<span style="flex:1">${esc(C.chatName(c))}</span><input type="radio" name="gchat" value="${c.id}" ${(pre ? c.id === pre : i === 0) ? 'checked' : ''}></label>`).join('');
}
export async function newGameSheet(kind, preChat) {
  const info = GINFO[kind];
  if (kind === 'xo' || kind === 'c4') {
    const rows = C.memberRows();
    C.openSheet(`<h3>${info.n}: اختر خصمك</h3>${rows || '<p class="empty">ما فيه أحد ثاني في العائلة للحين</p>'}`, async (e) => {
      const u = e.target.closest('[data-u]')?.dataset.u;
      if (!u) return;
      C.closeSheet();
      const chatId = await C.openDirect(u);
      if (!chatId) return;
      createGame(kind, chatId, { x: me(), o: u, to: u }, `تحدي ${info.n}`);
    });
    return;
  }
  const groups = groupOptions(preChat);
  if (!groups) return C.toast('سوّ قروب أول عشان تلعبون');
  let extra = '';
  if (kind === 'who') {
    const q = WHO_QUESTIONS[Math.floor(Math.random() * WHO_QUESTIONS.length)];
    extra = `<div class="form"><label>السؤال<textarea id="gwQ" rows="2" maxlength="120">${esc(q)}</textarea></label>
      <button type="button" class="btn ghost" id="gwRnd">سؤال ثاني</button></div>`;
  } else if (kind === 'wheel') {
    extra = `<div class="form"><label>وش نختار؟<input id="gwT" maxlength="60" value="${esc(WHEEL_TITLES[0])}"></label>
      <div class="chips" id="gwChips">${WHEEL_TITLES.map((t) => `<button type="button">${esc(t)}</button>`).join('')}</div>
      <label>الخيارات (سطر لكل خيار، أو خلّها فاضية وتصير أسماء أعضاء القروب)<textarea id="gwItems" rows="3" placeholder="مثال:\nكبسة\nمندي\nبيتزا"></textarea></label></div>`;
  }
  C.openSheet(`<h3>${info.n}</h3>${extra}<p class="section-t">في أي قروب؟</p>${groups}
    <div class="form" style="margin-top:12px"><button class="btn" id="gwGo">ابدأ وأرسلها للقروب</button></div>`);
  $('#gwRnd')?.addEventListener('click', () => { $('#gwQ').value = WHO_QUESTIONS[Math.floor(Math.random() * WHO_QUESTIONS.length)]; });
  $('#gwChips')?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) $('#gwT').value = b.textContent; });
  $('#gwGo').onclick = async (ev) => {
    const chatId = $('#sheet input[name=gchat]:checked')?.value;
    if (!chatId) return C.toast('اختر قروب');
    if (ev.currentTarget.disabled) return;
    ev.currentTarget.disabled = true;
    setTimeout(() => { const b = $('#gwGo'); if (b) b.disabled = false; }, 2500);
    let state = {};
    if (kind === 'who') {
      const q = $('#gwQ').value.trim();
      if (!q) return C.toast('اكتب السؤال');
      state = { q };
    } else if (kind === 'wheel') {
      const t = $('#gwT').value.trim() || 'عجلة الحظ';
      const lines = $('#gwItems').value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
      let items;
      if (lines.length >= 2) items = lines.map((l) => ({ l }));
      else {
        const { data } = await C.sb.from('chat_members').select('user_id').eq('chat_id', chatId);
        items = (data || []).map((r) => ({ u: r.user_id }));
      }
      if (items.length < 2) return C.toast('تحتاج خيارين على الأقل');
      state = { t, items };
    } else if (kind === 'quiz') {
      const rnd = seeded(crypto.randomUUID());
      state = { qs: shuffle(QUIZ.map((_, i) => i), rnd).slice(0, 10) };
    }
    C.closeSheet();
    createGame(kind, chatId, state);
  };
}
async function createGame(kind, chatId, state, cardText, stay) {
  const id = crypto.randomUUID();
  const { error } = await C.sb.from('games').insert({ id, chat_id: chatId, kind, state, created_by: me() });
  if (error) { console.error(error); return C.toast('ما قدرنا نبدأ اللعبة'); }
  const g = { id, chat_id: chatId, kind, state, created_by: me(), status: 'open', created_at: new Date().toISOString() };
  if (!G.list.some((x) => x.id === id)) G.list.unshift(g);
  if (!G.moves.has(id)) G.moves.set(id, []);
  C.sendTo(chatId, 'game', { g: id, k: kind, t: cardText || gameTitle(g) });
  if (stay) { renderGame(); return g; }
  openGame(id);
  return g;
}

// ---------- شاشة اللعبة ----------
export async function openGame(id) {
  let g = G.list.find((x) => x.id === id);
  if (!g) {
    const { data } = await C.sb.from('games').select('*').eq('id', id).single();
    if (!data) return C.toast('اللعبة ما عادت موجودة');
    g = data;
    G.list.unshift(g);
  }
  const { data: mv } = await C.sb.from('game_moves').select('*').eq('game_id', id);
  G.moves.set(id, mv || []);
  if (g.kind === 'wheel') G.wheelShown = spins(g).length;
  if (g.kind === 'quiz') G.quizRun = null;
  if (g.kind === 'who' || g.kind === 'wheel' || g.kind === 'quiz') {
    const { data: cm } = await C.sb.from('chat_members').select('user_id').eq('chat_id', g.chat_id);
    G.chatMembers = (cm || []).map((r) => r.user_id);
  }
  G.open = g;
  if (TURN.has(g.kind) && winnerOf(g)) G.celebrated.add(g.id);
  if (g.kind === 'word' && wordState(g, me()).done) G.celebrated.add(g.id);
  const el = $('#game');
  const was = gameIsOpen();
  el.classList.remove('off');
  if (!was) history.pushState({ game: 1 }, '');
  renderGame(true);
}
async function openWord() {
  const day = today();
  const { data: id, error } = await C.sb.rpc('word_game', { d: day });
  if (error || !id) return C.toast('ما قدرنا نفتح كلمة اليوم');
  G.wordInput = '';
  openGame(id);
}

function shell(title, sub, body) {
  const g = G.open;
  return `<div class="info-bar game-bar"><button class="glass-btn" data-a="back" aria-label="رجوع">${C.ICON.back}</button>
      <div class="gb-t"><b>${esc(title)}</b><small>${esc(sub)}</small></div>
      <span class="gb-ic" style="background:${GINFO[g.kind].c}">${GICON[g.kind]}</span></div>
    <div class="game-body">${body}</div>`;
}
function renderGame(first) {
  const g = G.open;
  if (!g) return;
  if (G.spinning) { G.pendingRender = true; return; }
  if (!first) gameEffects(g);
  else G.seen.set(g.id, movesOf(g.id).length);
  const el = $('#game');
  const c = C.chatOf(g.chat_id);
  const sub = c ? C.chatName(c) : '';
  const render = { who: renderWho, wheel: renderWheel, quiz: renderQuiz, xo: renderXO, c4: renderC4, word: renderWord }[g.kind];
  const scroll = el.scrollTop;
  el.innerHTML = shell(GINFO[g.kind].n, g.kind === 'word' ? 'للعائلة كلها · ' + today() : sub, render(g));
  if (!first) el.scrollTop = scroll;
  C.hydrate(el);
  el.onclick = (e) => onGameClick(e);
  if (g.kind === 'wheel') afterWheelRender(g);
  if (g.kind === 'word') bindWordKeys();
}
// أصوات الحركات الجديدة واحتفال الفوز
function gameEffects(g) {
  const n = movesOf(g.id).length;
  const before = G.seen.get(g.id) ?? n;
  G.seen.set(g.id, n);
  if (n > before) {
    if (g.kind === 'xo') sfx('pop');
    else if (g.kind === 'c4') sfx('drop');
    else if (g.kind === 'who') sfx('pop');
  }
  if (TURN.has(g.kind)) {
    const w = winnerOf(g);
    if (w && !G.celebrated.has(g.id)) {
      G.celebrated.add(g.id);
      if (w === me()) { sfx('win'); C.confetti?.(); buzz([30, 50, 30]); }
      else if (w !== 'draw') sfx('lose');
      else sfx('ding');
    }
  }
}

async function onGameClick(e) {
  const g = G.open;
  if (!g) return;
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'back') return history.back();
  if (a === 'chat') { history.back(); setTimeout(() => C.openChat(g.chat_id), 250); return; }
  if (g.kind === 'who') {
    const v = e.target.closest('[data-vote]')?.dataset.vote;
    if (v) return move(g, 'v', { u: v }, true);
    if (a === 'again') return newGameSheet('who', g.chat_id);
  }
  if (g.kind === 'wheel' && a === 'spin') return spinWheel(g);
  if (g.kind === 'wheel' && a === 'again') return newGameSheet('wheel', g.chat_id);
  if (g.kind === 'quiz') {
    if (a === 'start') return startQuiz(g);
    const opt = e.target.closest('[data-opt]')?.dataset.opt;
    if (opt !== undefined) return answerQuiz(g, Number(opt));
    if (a === 'again') return newGameSheet('quiz', g.chat_id);
  }
  if (g.kind === 'xo') {
    const cell = e.target.closest('[data-cell]')?.dataset.cell;
    if (cell !== undefined) return playTurn(g, { i: Number(cell) });
  }
  if (g.kind === 'c4') {
    const col = e.target.closest('[data-col]')?.dataset.col;
    if (col !== undefined) return playTurn(g, { c: Number(col) });
  }
  if (TURN.has(g.kind)) {
    if (a === 'accept') return acceptInvite(g);
    if (a === 'decline') return declineInvite(g);
    if (a === 'remind') { C.notify(g.chat_id, 'invite', g.state.to); return C.toast('ذكّرناه'); }
    if (a === 'cancel') { if (await C.ask('تلغي التحدي؟', 'إلغاء التحدي', true)) { await move(g, 'dec', {}, true); C.sb.from('games').update({ status: 'done' }).eq('id', g.id).then(() => {}); } return; }
    if (a === 'resign') { if (await C.ask('تنسحب؟ بتنحسب خسارة', 'انسحاب', true)) { await move(g, 'res', {}, true); finishGame(g); } return; }
    if (a === 'rematch') return askRematch(g);
    if (a === 'newfoe') return newGameSheet(g.kind);
    const rg = e.target.closest('[data-rg]')?.dataset.rg;
    const r = rg && G.list.find((x) => x.id === rg);
    if (r && a === 'r-accept') return acceptInvite(r, true);
    if (r && a === 'r-decline') return declineInvite(r);
    if (r && a === 'r-open') return openGame(r.id);
  }
  if (g.kind === 'word') {
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k) wordKey(g, k);
    if (a === 'share') shareWord(g);
  }
}
async function move(g, key, data, upsert) {
  const row = { game_id: g.id, user_id: me(), key, data };
  const arr = G.moves.get(g.id) || [];
  const j = arr.findIndex((m) => m.user_id === me() && m.key === key);
  const local = { ...row, created_at: new Date().toISOString() };
  if (j >= 0) arr[j] = local; else arr.push(local);
  G.moves.set(g.id, arr);
  renderGame();
  const q = upsert ? C.sb.from('game_moves').upsert(row) : C.sb.from('game_moves').insert(row);
  const { error } = await q;
  if (error) {
    const k = arr.indexOf(local);
    if (k >= 0) arr.splice(k, 1);
    renderGame();
    C.toast(TURN.has(g.kind) ? 'سبقك أحد، حدّثنا اللعبة' : 'ما انحفظت حركتك');
    const { data: mv } = await C.sb.from('game_moves').select('*').eq('game_id', g.id);
    G.moves.set(g.id, mv || []);
    renderGame();
    return false;
  }
  return true;
}
const memberList = () => (G.chatMembers || []).filter((u) => C.members().has(u));
const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);

// ---------- مين فينا؟ ----------
function renderWho(g) {
  const votes = movesOf(g.id).filter((m) => m.key === 'v');
  const mine = votes.find((m) => m.user_id === me());
  const people = memberList();
  const counts = new Map(people.map((u) => [u, 0]));
  votes.forEach((v) => counts.set(v.data.u, (counts.get(v.data.u) || 0) + 1));
  const total = votes.length;
  let body = `<div class="q-card" style="--gc:${GINFO.who.c}"><small>سؤال من ${esc(C.nameOf(g.created_by))}</small><h2>${esc(g.state.q)}</h2><p>${total} من ${people.length} صوّتوا</p></div>`;
  if (!mine) {
    body += `<p class="section-t">صوّت لواحد</p><div class="vote-grid">${people.map((u) =>
      `<button data-vote="${u}">${C.avatar(u, 'sm')}<span>${esc(u === me() ? 'أنا' : C.short(u))}</span></button>`).join('')}</div>`;
  } else {
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0]?.[1] || 0;
    body += `<p class="section-t">النتيجة</p><div class="bars">${sorted.map(([u, n]) =>
      `<button class="bar-row${n && n === top ? ' top' : ''}" data-vote="${u}">${C.avatar(u, 'xs')}<span class="bn">${esc(u === me() ? 'أنت' : C.short(u))}</span>
       <span class="bt"><i style="width:${pct(n, total)}%"></i></span><b>${n}</b></button>`).join('')}</div>
      <p class="hint center">صوّتّ لـ ${esc(mine.data.u === me() ? 'نفسك' : C.short(mine.data.u))}. تقدر تغيّر صوتك بالضغط على اسم ثاني.</p>`;
  }
  body += `<div class="g-actions"><button class="btn ghost" data-a="chat">رجوع للقروب</button><button class="btn" data-a="again">سؤال جديد</button></div>`;
  return body;
}

// ---------- عجلة الحظ ----------
const WCOL = ['#E8A33D', '#7C5CFF', '#1DAA61', '#3B82F6', '#E5484D', '#0F8B8D', '#C2416F', '#8A6D3B', '#2C7A7B', '#B45309', '#4F46E5', '#059669'];
const spins = (g) => movesOf(g.id).filter((m) => /^s\d+$/.test(m.key)).sort((a, b) => Number(a.key.slice(1)) - Number(b.key.slice(1)));
const itemLabel = (it) => (it.u ? (it.u === me() ? 'أنت' : C.short(it.u)) : it.l);
function wheelSVG(items) {
  const n = items.length, R = 140, cx = 150, cy = 150, seg = 360 / n;
  const pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  let out = '';
  items.forEach((it, k) => {
    const a0 = k * seg, a1 = (k + 1) * seg;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    out += `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${WCOL[k % WCOL.length]}"/>`;
    const mid = a0 + seg / 2;
    const [tx, ty] = pt(mid, R * 0.62);
    const label = itemLabel(it);
    out += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${(mid - 90 + (mid > 180 ? 180 : 0)).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-size="${n > 8 ? 12 : 15}" font-weight="700" fill="#fff">${esc(label.length > 12 ? label.slice(0, 11) + '…' : label)}</text>`;
  });
  return `<svg class="wheel-svg" viewBox="0 0 300 300">${out}<circle cx="150" cy="150" r="22" fill="#fff"/><circle cx="150" cy="150" r="140" fill="none" stroke="#fff" stroke-width="4"/></svg>`;
}
const wheelAngle = (n, i, count) => n * 2160 + (360 - (i + 0.5) * (360 / count));
function renderWheel(g) {
  const items = g.state.items || [];
  const sp = spins(g);
  const last = sp[sp.length - 1];
  const shownN = Math.min(G.wheelShown, sp.length);
  const shown = shownN ? sp[shownN - 1] : null;
  const rot = shown ? wheelAngle(shownN, shown.data.i, items.length) : 0;
  const result = shown ? itemLabel(items[shown.data.i]) : '';
  return `<div class="q-card" style="--gc:${GINFO.wheel.c}"><small>من ${esc(C.nameOf(g.created_by))}</small><h2>${esc(g.state.t)}</h2></div>
    <div class="wheel-wrap"><span class="wheel-ptr"></span><div class="wheel" id="wheel" style="transform:rotate(${rot}deg)">${wheelSVG(items)}</div></div>
    <p class="wheel-res" id="wheelRes">${shown ? `اختارت العجلة: <b>${esc(result)}</b>` : 'اضغط «لف العجلة» والكل بيشوف النتيجة'}</p>
    <div class="g-actions"><button class="btn" data-a="spin" ${last && last !== shown ? 'disabled' : ''}>لف العجلة</button></div>
    ${shownN ? `<p class="section-t">اللفّات</p><ul class="mini-list">${sp.slice(0, shownN).reverse().slice(0, 8).map((s) => `<li><b>${esc(itemLabel(items[s.data.i]))}</b><span>لفّها ${esc(C.short(s.user_id))}</span></li>`).join('')}</ul>` : ''}
    <div class="g-actions"><button class="btn ghost" data-a="chat">رجوع للقروب</button><button class="btn ghost" data-a="again">عجلة جديدة</button></div>`;
}
const SPIN_MS = 7200;
const easeSpin = (t) => 1 - Math.pow(1 - t, 3.6);
function afterWheelRender(g) {
  const sp = spins(g);
  if (sp.length <= G.wheelShown) return;
  const items = g.state.items;
  const count = items.length;
  const n = sp.length;
  const s = sp[n - 1];
  const prev = n > 1 ? sp[n - 2] : null;
  const a0 = prev ? wheelAngle(n - 1, prev.data.i, count) : 0;
  const a1 = wheelAngle(n, s.data.i, count);
  const wheel = $('#wheel');
  const ptr = $('.wheel-ptr');
  const res = $('#wheelRes');
  const btn = $('[data-a=spin]');
  if (!wheel) return;
  G.wheelShown = n;
  G.spinning = true;
  if (btn) btn.disabled = true;
  if (res) res.innerHTML = `<span class="spin-who">${esc(s.user_id === me() ? 'أنت تلف' : C.short(s.user_id) + ' يلف')} العجلة…</span>`;
  wheel.style.transition = 'none';
  const seg = 360 / count;
  const under = (ang) => Math.floor((((360 - (ang % 360)) % 360) + 360) % 360 / seg);
  let last = under(a0);
  const t0 = performance.now();
  const frame = (now) => {
    if (G.open?.id !== g.id) { G.spinning = false; return; }
    const t = Math.min(1, (now - t0) / SPIN_MS);
    const ang = a0 + (a1 - a0) * easeSpin(t);
    wheel.style.transform = `rotate(${ang}deg)`;
    const u = under(ang);
    if (u !== last) {
      last = u;
      sfx('tick');
      if (ptr) { ptr.classList.remove('flick'); void ptr.offsetWidth; ptr.classList.add('flick'); }
    }
    if (t < 1) return requestAnimationFrame(frame);
    G.spinning = false;
    sfx('ding');
    buzz([20, 40, 60]);
    C.confetti?.();
    G.pendingRender = false;
    renderGame();
    const r = $('#wheelRes');
    if (r) r.classList.add('pop');
  };
  requestAnimationFrame(frame);
}
async function spinWheel(g) {
  const n = spins(g).length + 1;
  const i = Math.floor(Math.random() * g.state.items.length);
  await move(g, 's' + n, { i }, false);
}

// ---------- مسابقة سريعة ----------
const QTIME = 15000;
function quizView(g, idx) {
  const qi = g.state.qs[idx];
  const [q, opts] = QUIZ[qi];
  const order = shuffle([0, 1, 2, 3], seeded(g.id + ':' + idx + ':' + me()));
  return { q, opts, order };
}
function quizScores(g) {
  const by = new Map();
  for (const m of movesOf(g.id)) {
    if (!/^q\d+$/.test(m.key)) continue;
    const idx = Number(m.key.slice(1));
    const correct = m.data.a === QUIZ[g.state.qs[idx]][2];
    const s = by.get(m.user_id) || { n: 0, c: 0, pts: 0 };
    s.n++;
    if (correct) { s.c++; s.pts += 100 + Math.max(0, Math.round(50 * (1 - (m.data.ms || QTIME) / QTIME))); }
    by.set(m.user_id, s);
  }
  return [...by.entries()].sort((a, b) => b[1].pts - a[1].pts);
}
function renderQuiz(g) {
  const mine = movesOf(g.id).filter((m) => m.user_id === me() && /^q\d+$/.test(m.key));
  const total = g.state.qs.length;
  const run = G.quizRun;
  const scores = quizScores(g);
  const board = scores.length ? `<p class="section-t">الترتيب</p><div class="board">${scores.map(([u, s], i) =>
    `<div class="br${u === me() ? ' me' : ''}"><span class="rk">${i + 1}</span>${C.avatar(u, 'xs')}<span class="bn">${esc(u === me() ? 'أنت' : C.short(u))}</span>
     <small>${s.n < total ? `يلعب ${s.n}/${total}` : `${s.c}/${total} صح`}</small><b>${s.pts}</b></div>`).join('')}</div>` : '';
  if (run && mine.length < total) {
    const idx = mine.length;
    const { q, opts, order } = quizView(g, idx);
    const fb = run.feedback;
    return `<div class="quiz-top"><span>سؤال ${idx + 1} من ${total}</span><span class="qt-bar"><i id="qtBar"></i></span><b id="qtSec" class="qt-sec">15</b></div>
      <div class="q-card big" style="--gc:${GINFO.quiz.c}"><h2>${esc(q)}</h2></div>
      <div class="opts">${order.map((o) => {
        let cls = '';
        if (fb && fb.idx === idx) { if (o === QUIZ[g.state.qs[idx]][2]) cls = 'ok'; else if (o === fb.a) cls = 'bad'; }
        return `<button data-opt="${o}" class="${cls}" ${fb ? 'disabled' : ''}>${esc(opts[o])}</button>`;
      }).join('')}</div>`;
  }
  if (mine.length >= total) {
    const s = scores.find(([u]) => u === me())?.[1];
    return `<div class="q-card" style="--gc:${GINFO.quiz.c}"><small>خلّصت المسابقة</small><h2>${s ? s.pts : 0} نقطة</h2><p>${s ? s.c : 0} إجابات صحيحة من ${total}</p></div>
      ${board}<div class="g-actions"><button class="btn ghost" data-a="chat">رجوع للقروب</button><button class="btn" data-a="again">مسابقة جديدة</button></div>`;
  }
  return `<div class="q-card" style="--gc:${GINFO.quiz.c}"><small>من ${esc(C.nameOf(g.created_by))}</small><h2>${total} أسئلة، 15 ثانية لكل سؤال</h2>
      <p>الإجابة الصحيحة 100 نقطة، وكل ما جاوبت أسرع تاخذ زيادة لين 50</p></div>
    <div class="g-actions"><button class="btn" data-a="start">${mine.length ? 'كمّل' : 'ابدأ'}</button></div>${board}`;
}
function qStart(g, idx) {
  const k = g.id + ':' + idx;
  if (!G.quizStarts[k]) G.quizStarts[k] = Date.now();
  return G.quizStarts[k];
}
function startQuiz(g) {
  const idx = movesOf(g.id).filter((m) => m.user_id === me() && /^q\d+$/.test(m.key)).length;
  G.quizRun = { t0: qStart(g, idx) };
  renderGame();
  tickQuiz(g);
}
function tickQuiz(g) {
  clearInterval(G.quizTimer);
  G.quizTimer = setInterval(() => {
    const run = G.quizRun;
    if (!run || G.open?.id !== g.id) return clearInterval(G.quizTimer);
    if (run.feedback) return;
    const left = Math.max(0, QTIME - (Date.now() - run.t0));
    const bar = $('#qtBar');
    if (bar) { bar.style.width = (left / QTIME) * 100 + '%'; bar.classList.toggle('low', left < 5000); }
    const sec = $('#qtSec');
    const sl = Math.ceil(left / 1000);
    if (sec && sec.textContent !== String(sl)) { sec.textContent = sl; if (sl <= 3 && sl > 0) sfx('tick'); }
    if (left <= 0) answerQuiz(g, -1);
  }, 100);
}
async function answerQuiz(g, a) {
  const run = G.quizRun;
  if (!run || run.feedback) return;
  const idx = movesOf(g.id).filter((m) => m.user_id === me() && /^q\d+$/.test(m.key)).length;
  const ms = Date.now() - run.t0;
  run.feedback = { idx, a };
  renderGame();
  const ok = a === QUIZ[g.state.qs[idx]][2];
  sfx(ok ? 'correct' : 'wrong');
  buzz(ok ? 15 : [30, 40, 30]);
  setTimeout(async () => {
    await move(g, 'q' + idx, { a, ms: Math.min(ms, QTIME) }, false);
    const doneNow = movesOf(g.id).filter((m) => m.user_id === me() && /^q\d+$/.test(m.key)).length >= g.state.qs.length;
    if (G.quizRun === run) { run.feedback = null; run.t0 = qStart(g, idx + 1); }
    renderGame();
    if (doneNow) {
      const sc = quizScores(g);
      const mineS = sc.find(([u]) => u === me())?.[1];
      if (mineS && mineS.c >= 7) { sfx('win'); C.confetti?.(); } else sfx('ding');
    }
  }, 1000);
}

// ---------- إكس أو / أربعة بخط واحد ----------
const XO_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function xoBoard(moves) { const b = Array(9).fill(null); moves.forEach((m, n) => { b[m.data.i] = n % 2 ? 'o' : 'x'; }); return b; }
export function xoWin(b) {
  for (const l of XO_LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { s: b[l[0]], line: l };
  return b.every(Boolean) ? { s: 'draw' } : null;
}
export function c4Board(moves) {
  const b = Array.from({ length: 6 }, () => Array(7).fill(null));
  moves.forEach((m, n) => { for (let r = 5; r >= 0; r--) if (!b[r][m.data.c]) { b[r][m.data.c] = n % 2 ? 'o' : 'x'; break; } });
  return b;
}
export function c4Win(b) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    const s = b[r][c];
    if (!s) continue;
    for (const [dr, dc] of dirs) {
      const cells = [[r, c]];
      for (let k = 1; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr > 5 || cc < 0 || cc > 6 || b[rr][cc] !== s) break; cells.push([rr, cc]); }
      if (cells.length === 4) return { s, cells };
    }
  }
  return b[0].every(Boolean) ? { s: 'draw' } : null;
}
// التحدي: اللي انطلب منه لازم يوافق قبل ما تبدأ
const pendingInvite = (g) => !!g.state?.to && !movesOf(g.id).some((m) => m.key === 'acc' && m.user_id === g.state.to) && !turnMoves(g.id).length;
const declined = (g) => !!g.state?.to && movesOf(g.id).some((m) => m.key === 'dec' && (m.user_id === g.state.to || m.user_id === g.created_by)) && pendingInvite(g);
const resignedBy = (g) => movesOf(g.id).find((m) => m.key === 'res' && (m.user_id === g.state.x || m.user_id === g.state.o))?.user_id;
const rematchOf = (g) => G.list.find((x) => x.state?.prev === g.id && !declined(x));
function winnerOf(g) {
  const rs = resignedBy(g);
  if (rs) return rs === g.state.x ? g.state.o : g.state.x;
  const mv = turnMoves(g.id);
  const w = g.kind === 'xo' ? xoWin(xoBoard(mv)) : c4Win(c4Board(mv));
  if (!w) return null;
  return w.s === 'draw' ? 'draw' : w.s === 'x' ? g.state.x : g.state.o;
}
function turnOf(g) { return turnMoves(g.id).length % 2 ? g.state.o : g.state.x; }
function seriesOf(g) {
  const sc = { ...(g.state.sc || {}) };
  const w = winnerOf(g);
  if (w) sc[w] = (sc[w] || 0) + 1;
  return sc;
}
function turnHeader(g) {
  const w = winnerOf(g);
  const t = turnOf(g);
  const inv = pendingInvite(g) || declined(g);
  const sc = seriesOf(g);
  const showSc = g.state.prev || w;
  const p = (u, s) => `<div class="pl${!w && !inv && t === u ? ' on' : ''}${w === u ? ' win' : ''}">${C.avatar(u, 'sm')}<b>${esc(u === me() ? 'أنت' : C.short(u))}</b><span class="pc ${s}"></span>${showSc ? `<span class="sc">${sc[u] || 0}</span>` : ''}</div>`;
  const rs = resignedBy(g);
  let status;
  if (declined(g)) status = movesOf(g.id).some((m) => m.key === 'dec' && m.user_id === g.created_by) ? 'انلغى التحدي' : g.state.to === me() ? 'اعتذرت عن التحدي' : `${C.short(g.state.to)} اعتذر عن التحدي`;
  else if (pendingInvite(g)) status = g.state.to === me() ? `${C.short(g.created_by)} يتحداك` : `ننتظر موافقة ${C.short(g.state.to)}`;
  else if (w) status = w === 'draw' ? 'تعادل' : w === me() ? (rs ? `انسحب ${C.short(rs)}، فزت` : 'فزت! كفو') : (rs === me() ? 'انسحبت' : `فاز ${C.short(w)}`);
  else status = t === me() ? 'دورك' : `دور ${C.short(t)}`;
  const cls = w || inv ? ' end' : t === me() ? ' mine' : '';
  return `<div class="players">${p(g.state.x, 'x')}<span class="vs">${showSc && sc.d ? `تعادل ${sc.d}` : 'ضد'}</span>${p(g.state.o, 'o')}</div><p class="g-status${cls}">${esc(status)}</p>${inviteBox(g)}`;
}
// صندوق الدعوة (قبول / رفض) أو الانتظار
function inviteBox(g) {
  if (declined(g)) return '';
  if (!pendingInvite(g)) return '';
  if (g.state.to === me()) {
    return `<div class="invite-card"><p>${esc(C.short(g.created_by))} ${g.state.prev ? 'يبي جولة ثانية' : `يتحداك في ${GINFO[g.kind].n}`}. تلعب؟</p>
      <div class="g-actions"><button class="btn ghost" data-a="decline">لا، مو الحين</button><button class="btn" data-a="accept">يلا نلعب</button></div></div>`;
  }
  return `<div class="invite-card wait"><span class="dots"><i></i><i></i><i></i></span><p>أرسلنا التحدي لـ ${esc(C.short(g.state.to))}. اللعبة تبدأ أول ما يوافق.</p>
    <div class="g-actions"><button class="btn ghost" data-a="cancel">إلغاء</button><button class="btn ghost" data-a="remind">ذكّره</button></div></div>`;
}
// تحت اللوحة: انسحاب أثناء اللعب، أو جولة ثانية بعد النهاية
function turnFooter(g) {
  const w = winnerOf(g);
  const r = w ? rematchOf(g) : null;
  let rbox = '';
  if (r) {
    if (pendingInvite(r)) {
      rbox = r.state.to === me()
        ? `<div class="invite-card" data-rg="${r.id}"><p>${esc(C.short(r.created_by))} يبي جولة ثانية. تلعب؟</p><div class="g-actions"><button class="btn ghost" data-a="r-decline">لا شكراً</button><button class="btn" data-a="r-accept">يلا</button></div></div>`
        : `<div class="invite-card wait" data-rg="${r.id}"><span class="dots"><i></i><i></i><i></i></span><p>طلبت جولة ثانية. ننتظر موافقة ${esc(C.short(r.state.to))}.</p></div>`;
    } else rbox = `<div class="g-actions" data-rg="${r.id}"><button class="btn" data-a="r-open">افتح الجولة الثانية</button></div>`;
  }
  const playing = !w && !pendingInvite(g) && !declined(g);
  const meIn = g.state.x === me() || g.state.o === me();
  return `${rbox}<div class="g-actions"><button class="btn ghost" data-a="chat">الدردشة</button>
    ${playing && meIn && turnMoves(g.id).length ? '<button class="btn ghost danger" data-a="resign">انسحاب</button>' : ''}
    ${w && !r && meIn ? '<button class="btn" data-a="rematch">جولة ثانية</button>' : ''}
    ${declined(g) ? '<button class="btn" data-a="newfoe">تحدّى أحد ثاني</button>' : ''}</div>`;
}
function renderXO(g) {
  const mv = turnMoves(g.id);
  const b = xoBoard(mv);
  const w = xoWin(b);
  const last = mv.length ? mv[mv.length - 1].data.i : -1;
  const lock = w || pendingInvite(g) || declined(g) || resignedBy(g);
  return turnHeader(g) + `<div class="xo${pendingInvite(g) || declined(g) ? ' dim' : ''}">${b.map((s, i) => `<button data-cell="${i}" class="${s || ''}${w?.line?.includes(i) ? ' wl' : ''}${i === last ? ' last' : ''}" ${s || lock ? 'disabled' : ''} aria-label="خانة ${i + 1}">${s === 'x' ? '<i class="mx"></i>' : s === 'o' ? '<i class="mo"></i>' : ''}</button>`).join('')}</div>` + turnFooter(g);
}
function renderC4(g) {
  const mv = turnMoves(g.id);
  const b = c4Board(mv);
  const w = c4Win(b);
  const wset = new Set((w?.cells || []).map(([r, c]) => r + ':' + c));
  let lastCell = '';
  if (mv.length) { const c = mv[mv.length - 1].data.c; for (let r = 0; r < 6; r++) if (b[r][c]) { lastCell = r + ':' + c; break; } }
  const lock = w || pendingInvite(g) || declined(g) || resignedBy(g);
  return turnHeader(g) + `<div class="c4${pendingInvite(g) || declined(g) ? ' dim' : ''}">${[0, 1, 2, 3, 4, 5, 6].map((c) => `<button class="col" data-col="${c}" ${b[0][c] || lock ? 'disabled' : ''} aria-label="عمود ${c + 1}">${b.map((row, r) => `<i class="${row[c] || ''}${wset.has(r + ':' + c) ? ' wl' : ''}${lastCell === r + ':' + c ? ' drop' : ''}" style="--r:${r}"></i>`).join('')}</button>`).join('')}</div>` + turnFooter(g);
}
async function playTurn(g, data) {
  if (winnerOf(g) || declined(g)) return;
  if (pendingInvite(g)) return C.toast(g.state.to === me() ? 'اقبل التحدي أول' : 'ننتظر موافقته');
  if (turnOf(g) !== me()) return C.toast('مو دورك، انتظر');
  const n = turnMoves(g.id).length;
  const ok = await move(g, 'm' + n, data, false);
  if (!ok) return;
  if (winnerOf(g)) finishGame(g);
  else C.notify(g.chat_id, 'turn', g.state.x === me() ? g.state.o : g.state.x);
}
function finishGame(g) {
  C.sb.from('games').update({ status: 'done' }).eq('id', g.id).then(() => {});
  g.status = 'done';
}
async function acceptInvite(g, open) {
  if (g.state.to !== me() || G.accepting === g.id) return;
  G.accepting = g.id;
  setTimeout(() => { if (G.accepting === g.id) G.accepting = null; }, 3000);
  const ok = await move(g, 'acc', {}, true);
  if (!ok) return;
  sfx('ding');
  C.notify(g.chat_id, 'accept', g.created_by);
  if (open || G.open?.id !== g.id) openGame(g.id);
}
async function declineInvite(g) {
  if (g.state.to !== me()) return;
  await move(g, 'dec', {}, true);
  finishGame(g);
  C.toast('اعتذرنا عنك بلطف');
}
// جولة ثانية: نرسل طلب للخصم، ويبدأ اللي بدأ ثاني المرة اللي فاتت
async function askRematch(g) {
  if (rematchOf(g) || G.rematching) return;
  G.rematching = true;
  setTimeout(() => { G.rematching = false; }, 4000);
  const other = g.state.x === me() ? g.state.o : g.state.x;
  const sc = seriesOf(g);
  const r = await createGame(g.kind, g.chat_id, { x: g.state.o, o: g.state.x, to: other, prev: g.id, sc }, 'جولة ثانية', true);
  if (r) C.toast('أرسلنا الطلب، ننتظر موافقته');
}

// ---------- كلمة اليوم ----------
const KB = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['enter', 'ء', 'ذ', 'ر', 'و', 'ز', 'ظ', 'د', 'del'],
];
function wordState(g, uid) {
  const target = normWord(wordOf(g.day || today()));
  const guesses = movesOf(g.id).filter((m) => m.user_id === uid && /^g\d$/.test(m.key)).sort((a, b) => a.key.localeCompare(b.key)).map((m) => m.data.w);
  const solved = guesses.includes(target);
  return { target, guesses, solved, done: solved || guesses.length >= 6 };
}
function renderWord(g) {
  const st = wordState(g, me());
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const w = st.guesses[r];
    const cur = !w && r === st.guesses.length && !st.done ? G.wordInput : '';
    const sc = w ? scoreGuess(w, st.target) : null;
    rows.push(`<div class="wrow${cur && G.wordShake ? ' shake' : ''}">${[0, 1, 2, 3, 4].map((i) => {
      const ch = w ? [...w][i] : [...cur][i] || '';
      const cls = sc ? ['n', 'y', 'g'][sc[i]] : ch ? 'f' : '';
      return `<span class="wt ${cls}" style="--i:${i}">${esc(ch)}</span>`;
    }).join('')}</div>`);
  }
  const keyState = {};
  st.guesses.forEach((w) => scoreGuess(w, st.target).forEach((s, i) => { const ch = [...w][i]; keyState[ch] = Math.max(keyState[ch] ?? -1, s); }));
  const kb = st.done ? '' : `<div class="kb">${KB.map((row) => `<div class="kr">${row.map((k) =>
    k === 'enter' ? '<button data-k="enter" class="wide">إدخال</button>' : k === 'del' ? `<button data-k="del" class="wide" aria-label="مسح">${C.ICON.del}</button>`
      : `<button data-k="${k}" class="${keyState[k] === undefined ? '' : ['n', 'y', 'g'][keyState[k]]}">${k}</button>`).join('')}</div>`).join('')}</div>`;
  const others = [...new Set(movesOf(g.id).map((m) => m.user_id))].map((u) => [u, wordState(g, u)])
    .sort((a, b) => (b[1].solved - a[1].solved) || (a[1].guesses.length - b[1].guesses.length));
  const result = st.done ? `<div class="q-card" style="--gc:${GINFO.word.c}"><small>${st.solved ? 'أحسنت' : 'المرة الجاية'}</small><h2>${esc(wordOf(g.day || today()))}</h2>
      <p>${st.solved ? `حلّيتها في ${st.guesses.length} من 6` : 'خلصت محاولاتك'}. بكرة كلمة جديدة.</p></div>
      <div class="g-actions"><button class="btn" data-a="share">أرسل نتيجتي للعائلة</button></div>` : '';
  const board = others.length ? `<p class="section-t">العائلة اليوم</p><div class="board">${others.map(([u, s]) =>
    `<div class="br${u === me() ? ' me' : ''}">${C.avatar(u, 'xs')}<span class="bn">${esc(u === me() ? 'أنت' : C.short(u))}</span>
      <span class="mini-grid">${s.guesses.map((w) => `<span>${scoreGuess(w, s.target).map((x) => `<i class="${['n', 'y', 'g'][x]}"></i>`).join('')}</span>`).join('')}</span>
      <b>${s.solved ? s.guesses.length + '/6' : s.done ? 'X/6' : '…'}</b></div>`).join('')}</div>` : '';
  return `${result}<div class="wgrid">${rows.join('')}</div>
    ${st.done ? '' : '<p class="hint center">الأخضر: الحرف بمكانه. الأصفر: موجود بمكان ثاني. الرمادي: مو موجود. ة = ه، وأ وإ وآ = ا.</p>'}
    ${kb}${board}`;
}
function bindWordKeys() {
  if (G.wordKeysBound) return;
  G.wordKeysBound = true;
  addEventListener('keydown', (e) => {
    const g = G.open;
    if (!g || g.kind !== 'word' || !gameIsOpen() || e.target.closest?.('input,textarea')) return;
    if (e.key === 'Enter') wordKey(g, 'enter');
    else if (e.key === 'Backspace') wordKey(g, 'del');
    else { const ch = normWord(e.key); if (ch.length === 1) wordKey(g, ch); }
  });
}
async function wordKey(g, k) {
  const st = wordState(g, me());
  if (st.done) return;
  const cur = [...G.wordInput];
  sfx('key');
  if (k === 'del') cur.pop();
  else if (k === 'enter') {
    if (cur.length < 5) { G.wordShake = true; renderGame(); G.wordShake = false; sfx('wrong'); return C.toast('الكلمة لازم 5 حروف'); }
    const w = cur.join('');
    if (st.guesses.includes(w)) return C.toast('جربت هذي الكلمة');
    G.wordInput = '';
    sfx('flip');
    await move(g, 'g' + (st.guesses.length + 1), { w }, false);
    const after = wordState(g, me());
    if (after.done && !G.celebrated.has(g.id)) {
      G.celebrated.add(g.id);
      setTimeout(() => {
        if (after.solved) { sfx('win'); C.confetti?.(); C.toast(['عبقري!', 'رهيب!', 'ممتاز!', 'كفو!', 'حلوة!', 'أخيراً!'][after.guesses.length - 1] || 'صح عليك!'); }
        else sfx('lose');
      }, 700);
    }
    return;
  } else if (cur.length < 5) cur.push(k);
  G.wordInput = cur.join('');
  renderGame();
}
async function shareWord(g) {
  const st = wordState(g, me());
  const t = st.solved ? `حلّيت كلمة اليوم في ${st.guesses.length} من 6 محاولات. جرّبوها من تبويب الألعاب` : 'ما قدرت أحل كلمة اليوم. جرّبوا حظكم من تبويب الألعاب';
  await C.sendTo(g.chat_id, 'game', { g: g.id, k: 'word', t });
  C.toast('انرسلت للعائلة');
}

// ---------- حركات آلية (للتجربة) ----------
export function botMove(kind, moves) {
  if (kind === 'xo') {
    const b = xoBoard(moves);
    const me_ = moves.length % 2 ? 'o' : 'x', op = me_ === 'x' ? 'o' : 'x';
    const free = b.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    const tryWin = (s) => free.find((i) => { const t = [...b]; t[i] = s; return xoWin(t)?.s === s; });
    let i = tryWin(me_) ?? tryWin(op);
    if (i === undefined) i = b[4] ? free[Math.floor(Math.random() * free.length)] : 4;
    return { i };
  }
  const b = c4Board(moves);
  const me_ = moves.length % 2 ? 'o' : 'x', op = me_ === 'x' ? 'o' : 'x';
  const cols = [0, 1, 2, 3, 4, 5, 6].filter((c) => !b[0][c]);
  const drop = (c, s) => { const t = b.map((r) => [...r]); for (let r = 5; r >= 0; r--) if (!t[r][c]) { t[r][c] = s; break; } return t; };
  let c = cols.find((x) => c4Win(drop(x, me_))?.s === me_) ?? cols.find((x) => c4Win(drop(x, op))?.s === op);
  if (c === undefined) { const pref = [3, 2, 4, 1, 5, 0, 6].filter((x) => cols.includes(x)); c = Math.random() < 0.6 ? pref[0] : cols[Math.floor(Math.random() * cols.length)]; }
  return { c };
}
export const gameHelpers = { wordOf, today, normWord, scoreGuess, WORDS, QUIZ };
