// لمّة · صوت اللعبة: اللاعبين يسولفون وهم يلعبون (اتصال مباشر بين كل اثنين، مشفّر تلقائياً)
import { CONFIG } from './config.js';

let ctx;           // { sb, me, toast, mediaError, inCall, onChange }
let W = null;      // الغرفة اللي نراقبها: { gid, ch, present: Map(uid -> {muted}) }
let V = null;      // إذا دخلت الصوت: { gid, stream, muted, peers: Map(uid -> peer) }
let ac = null, vuTimer = null;
const levels = new Map();   // uid -> analyser

export function initVoice(c) { ctx = c; }

const chanName = (gid) => 'gv-' + gid;
const box = () => {
  let b = document.getElementById('gvAudio');
  if (!b) { b = document.createElement('div'); b.id = 'gvAudio'; b.style.display = 'none'; document.body.appendChild(b); }
  return b;
};

// ---------- نراقب مين في الصوت (حتى لو ما دخلت) ----------
export function watchVoice(gid) {
  if (W?.gid === gid) return;
  if (V && V.gid !== gid) leaveVoice(true);
  unwatch();
  const ch = ctx.sb.channel(chanName(gid), { config: { presence: { key: ctx.me() }, broadcast: { self: false, ack: false } } });
  W = { gid, ch, present: new Map(), ready: false };
  ch.on('presence', { event: 'sync' }, () => onSync(gid))
    .on('broadcast', { event: 'sig' }, ({ payload }) => onSignal(gid, payload))
    .subscribe((s) => {
      if (s !== 'SUBSCRIBED' || W?.ch !== ch) return;
      W.ready = true;
      if (V?.gid === gid) track();
    });
}
export function unwatch() {
  if (!W || V) return;    // إذا أنت في الصوت نخلي القناة شغالة
  const ch = W.ch;
  W = null;
  try { if (ctx.sb.removeChannel) ctx.sb.removeChannel(ch); else ch.unsubscribe?.(); } catch (e) { /* ignore */ }
}

function onSync(gid) {
  if (W?.gid !== gid) return;
  const st = W.ch.presenceState();
  const now = new Map();
  for (const [uid, metas] of Object.entries(st)) {
    const m = metas[metas.length - 1] || {};
    if (m.v) now.set(uid, { muted: !!m.muted });
  }
  W.present = now;
  if (V?.gid === gid) {
    // نسوي اتصال مع كل واحد جديد (الأصغر رقماً هو اللي يبدأ)
    for (const uid of now.keys()) if (uid !== ctx.me() && !V.peers.has(uid) && ctx.me() < uid) connect(uid);
    for (const uid of [...V.peers.keys()]) if (!now.has(uid)) dropPeer(uid);
  }
  ctx.onChange?.();
}

// مين في الصوت الحين
export function voiceState(gid) {
  const inRoom = W?.gid === gid ? W.present : new Map();
  return { joined: V?.gid === gid, muted: !!V?.muted, people: inRoom, connected: (uid) => V?.peers.get(uid)?.pc.connectionState === 'connected' };
}

async function track() {
  if (!W?.ready || !V) return;
  try { await W.ch.track({ v: 1, muted: V.muted }); } catch (e) { /* ignore */ }
}

// ---------- دخول وطلوع ----------
export async function joinVoice(gid) {
  if (V?.gid === gid) return;
  if (ctx.inCall?.()) return ctx.toast('سكّر المكالمة أول');
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) return ctx.toast('جهازك ما يدعم الصوت');
  if (V) leaveVoice(true);
  watchVoice(gid);
  let stream;
  try {
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) { /* ignore */ }
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .catch((e) => (e?.name === 'OverconstrainedError' || e?.name === 'TypeError' ? navigator.mediaDevices.getUserMedia({ audio: true }) : Promise.reject(e)));
  } catch (e) {
    return ctx.mediaError ? ctx.mediaError(e, 'mic') : ctx.toast('اسمح للتطبيق باستخدام المايك');
  }
  V = { gid, stream, muted: false, peers: new Map() };
  meter(ctx.me(), stream);
  // نفك قفل الصوت في الآيفون (لازم يصير من ضغطة)
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); } catch (e) { /* ignore */ }
  startVU();
  await track();
  onSync(gid);
  ctx.onChange?.();
}

export function leaveVoice(silent) {
  if (!V) return;
  const gid = V.gid;
  for (const uid of [...V.peers.keys()]) dropPeer(uid, true);
  V.stream.getTracks().forEach((t) => t.stop());
  levels.delete(ctx.me());
  V = null;
  try { W?.ch.untrack(); } catch (e) { /* ignore */ }
  try { if (navigator.audioSession) navigator.audioSession.type = 'auto'; } catch (e) { /* ignore */ }
  stopVU();
  if (!silent) ctx.toast('طلعت من الصوت');
  if (W && W.gid !== gid) unwatch();
  ctx.onChange?.();
}

export function toggleMute() {
  if (!V) return;
  V.muted = !V.muted;
  V.stream.getAudioTracks().forEach((t) => { t.enabled = !V.muted; });
  track();
  ctx.onChange?.();
}

// ---------- الاتصال بين اثنين ----------
function send(gid, to, data) {
  if (W?.gid !== gid) return;
  W.ch.send({ type: 'broadcast', event: 'sig', payload: { ...data, to, from: ctx.me() } }).catch?.(() => {});
}
function waitIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((res) => {
    const t = setTimeout(res, 2500);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
function newPeer(uid) {
  const pc = new RTCPeerConnection({ iceServers: CONFIG.ICE_SERVERS });
  const audio = document.createElement('audio');
  audio.autoplay = true; audio.setAttribute('playsinline', '');
  box().appendChild(audio);
  const p = { pc, audio, tries: 0, id: crypto.randomUUID() };
  V.stream.getTracks().forEach((t) => pc.addTrack(t, V.stream));
  pc.ontrack = (e) => {
    const s = e.streams[0] || new MediaStream([e.track]);
    if (audio.srcObject !== s) { audio.srcObject = s; audio.play().catch(() => {}); }
    meter(uid, s);
  };
  pc.onconnectionstatechange = () => {
    if (!V || V.peers.get(uid) !== p) return;
    if (pc.connectionState === 'connected') { clearTimeout(p.retry); ctx.onChange?.(); }
    if (pc.connectionState === 'failed') reconnect(uid);
    if (pc.connectionState === 'disconnected') setTimeout(() => { if (V?.peers.get(uid) === p && pc.connectionState === 'disconnected') reconnect(uid); }, 5000);
  };
  V.peers.set(uid, p);
  return p;
}
function reconnect(uid) {
  if (!V || !W?.present.has(uid)) return dropPeer(uid);
  dropPeer(uid, true);
  if (ctx.me() < uid) connect(uid);
  else send(V.gid, uid, { t: 'ask' });   // نطلب منه يبدأ من جديد
}
async function connect(uid) {
  if (!V) return;
  const gid = V.gid;
  const p = newPeer(uid);
  await p.pc.setLocalDescription(await p.pc.createOffer());
  await waitIce(p.pc);
  if (V?.peers.get(uid) !== p) return;
  const fire = () => {
    if (V?.peers.get(uid) !== p || p.pc.connectionState === 'connected') return;
    if (++p.tries > 6) return;
    send(gid, uid, { t: 'offer', id: p.id, sdp: p.pc.localDescription.sdp });
    p.retry = setTimeout(fire, 4000);
  };
  fire();
}
async function onSignal(gid, s) {
  if (!s || s.to !== ctx.me() || !V || V.gid !== gid) return;
  const uid = s.from;
  if (s.t === 'ask') { if (ctx.me() < uid && W?.present.has(uid)) { dropPeer(uid, true); connect(uid); } return; }
  if (s.t === 'offer') {
    const old = V.peers.get(uid);
    if (old && old.remoteId === s.id) {
      // نفس العرض وصل مرة ثانية: نرجع نفس الرد
      if (old.answer) send(gid, uid, { t: 'answer', id: s.id, sdp: old.answer });
      return;
    }
    if (old) dropPeer(uid, true);
    const p = newPeer(uid);
    p.remoteId = s.id;
    try {
      await p.pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      await waitIce(p.pc);
      if (V?.peers.get(uid) !== p) return;
      p.answer = p.pc.localDescription.sdp;
      send(gid, uid, { t: 'answer', id: s.id, sdp: p.answer });
    } catch (e) { dropPeer(uid, true); }
    return;
  }
  if (s.t === 'answer') {
    const p = V.peers.get(uid);
    if (!p || p.id !== s.id || p.pc.signalingState !== 'have-local-offer') return;
    try { await p.pc.setRemoteDescription({ type: 'answer', sdp: s.sdp }); } catch (e) { /* ignore */ }
  }
}
function dropPeer(uid, quiet) {
  const p = V?.peers.get(uid);
  if (!p) return;
  clearTimeout(p.retry);
  try { p.pc.close(); } catch (e) { /* ignore */ }
  p.audio.srcObject = null; p.audio.remove();
  V.peers.delete(uid);
  levels.delete(uid);
  if (!quiet) ctx.onChange?.();
}

// ---------- مين يتكلم الحين (حلقة خضراء على صورته) ----------
function meter(uid, stream) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    levels.set(uid, { an, buf: new Uint8Array(an.fftSize), on: 0 });
  } catch (e) { /* ignore */ }
}
function startVU() {
  if (vuTimer) return;
  vuTimer = setInterval(() => {
    const talking = new Set();
    for (const [uid, L] of levels) {
      if (uid === ctx.me() && V?.muted) continue;
      L.an.getByteTimeDomainData(L.buf);
      let sum = 0;
      for (let i = 0; i < L.buf.length; i += 4) { const x = (L.buf[i] - 128) / 128; sum += x * x; }
      const rms = Math.sqrt(sum / (L.buf.length / 4));
      L.on = rms > 0.035 ? 4 : Math.max(0, L.on - 1);    // يبقى شوي بعد ما يسكت
      if (L.on) talking.add(uid);
    }
    document.querySelectorAll('[data-vu]').forEach((el) => el.classList.toggle('talk', talking.has(el.dataset.vu)));
  }, 120);
}
function stopVU() {
  clearInterval(vuTimer); vuTimer = null;
  document.querySelectorAll('[data-vu].talk').forEach((el) => el.classList.remove('talk'));
}
export const inVoice = () => !!V;
