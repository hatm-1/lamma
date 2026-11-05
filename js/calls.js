// لمّة · المكالمات الصوتية والمرئية (مباشرة بين الجوالين، مشفرة تلقائياً)
import { CONFIG } from './config.js';
import { IC, callMarkup, setPill, toggleSpeaker } from './callui.js';

let ctx;            // { sb, me, member(id), avatar(id, cls), toast, notify(chatId, kind, to), logCall(chatId, data), openDirect(id) }
let cur = null;     // المكالمة الحالية
const outChans = new Map();
const el = () => document.getElementById('call');

export function initCalls(c) {
  ctx = c;
  ctx.sb.channel('call-' + ctx.me, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'sig' }, ({ payload }) => onSignal(payload))
    .subscribe();
}

async function send(to, payload) {
  let ch = outChans.get(to);
  if (!ch) {
    ch = ctx.sb.channel('call-' + to, { config: { broadcast: { self: false, ack: false } } });
    outChans.set(to, ch);
    await new Promise((res) => {
      const t = setTimeout(res, 4000);
      ch.subscribe((s) => { if (s === 'SUBSCRIBED') { clearTimeout(t); res(); } });
    });
  }
  return ch.send({ type: 'broadcast', event: 'sig', payload: { ...payload, from: ctx.me } });
}

function waitIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((res) => {
    const t = setTimeout(res, 3000);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
    });
  });
}

function newPC() {
  const pc = new RTCPeerConnection({ iceServers: CONFIG.ICE_SERVERS });
  pc.ontrack = (e) => {
    const v = el().querySelector('video.remote');
    if (v && e.streams[0] && v.srcObject !== e.streams[0]) { v.srcObject = e.streams[0]; v.play().catch(() => {}); }
    // الطرف الثاني شغّل كاميرته
    if (e.track.kind === 'video' && cur && !cur.remoteVideo) {
      cur.remoteVideo = true;
      e.track.onunmute = () => { if (cur) render(); };
      render();
    }
  };
  pc.onconnectionstatechange = () => {
    if (!cur) return;
    if (pc.connectionState === 'connected' && !cur.startedAt) {
      cur.startedAt = Date.now();
      stopTone();
      cur.timer = setInterval(updateStatus, 1000);
      updateStatus();
      watchMedia(pc);
      autoHide();
    }
    if (pc.connectionState === 'failed') { ctx.toast('انقطع الاتصال'); hangup('failed'); }
    if (pc.connectionState === 'disconnected') {
      setTimeout(() => { if (cur && cur.pc === pc && pc.connectionState === 'disconnected') hangup('failed'); }, 6000);
    }
  };
  return pc;
}

async function getMedia(video) {
  try { if (navigator.audioSession && navigator.audioSession.type !== 'auto') navigator.audioSession.type = 'auto'; } catch (e) { /* ignore */ }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: video ? { facingMode: 'user' } : false,
    });
  } catch (e) {
    // بعض الأجهزة ترفض الإعدادات الدقيقة، نجرب بالإعدادات البسيطة
    if (e && (e.name === 'OverconstrainedError' || e.name === 'TypeError' || e.name === 'NotReadableError')) {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: !!video });
    }
    throw e;
  }
}

// ---------- المتصل ----------
export async function startCall(other, chatId, video) {
  if (cur) return ctx.toast('عندك مكالمة شغالة');
  if (!navigator.mediaDevices?.getUserMedia) return ctx.toast('جهازك ما يدعم المكالمات');
  cur = { id: crypto.randomUUID(), other, chatId, video, outgoing: true, state: 'calling' };
  render();
  try {
    cur.stream = await getMedia(video);
  } catch (e) {
    cleanup();
    return ctx.mediaError ? ctx.mediaError(e, video ? 'cam' : 'mic') : ctx.toast('اسمح للتطبيق باستخدام المايك');
  }
  if (!cur) return;
  attachLocal();
  const pc = (cur.pc = newPC());
  cur.stream.getTracks().forEach((t) => pc.addTrack(t, cur.stream));
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  if (!cur || cur.pc !== pc) return;
  const offer = { t: 'offer', id: cur.id, video, chat: chatId, sdp: pc.localDescription.sdp };
  ctx.notify(chatId, video ? 'video' : 'call', other);
  startTone('ringback');
  const fire = () => cur && cur.state === 'calling' && send(other, offer);
  fire();
  cur.resend = setInterval(fire, 3000);
  cur.timeout = setTimeout(() => { if (cur && cur.state === 'calling') hangup('missed'); }, 45000);
}

// ---------- المستقبل ----------
async function onSignal(p) {
  if (!p || !p.t) return;
  if (p.t === 'offer') {
    if (cur && cur.id === p.id) return;                 // نسخة مكررة من نفس المكالمة
    if (ctx.isBlocked?.(p.from)) return;                // محظور
    if (cur) return send(p.from, { t: 'busy', id: p.id });
    cur = { id: p.id, other: p.from, chatId: p.chat, video: p.video, outgoing: false, state: 'ringing', offer: p.sdp };
    render();
    startTone('ring');
    if (navigator.vibrate) navigator.vibrate([400, 300, 400, 300, 400]);
    cur.timeout = setTimeout(() => { if (cur && cur.state === 'ringing') cleanup(); }, 45000);
    return;
  }
  if (!cur || p.id !== cur.id) return;
  if (p.t === 'answer' && cur.outgoing && cur.state === 'calling') {
    cur.state = 'connecting';
    clearInterval(cur.resend);
    clearTimeout(cur.timeout);
    await cur.pc.setRemoteDescription({ type: 'answer', sdp: p.sdp });
    render();
  } else if (p.t === 'reoffer' && cur.pc) {
    // الطرف الثاني شغّل الكاميرا: نحدّث الاتصال
    const pc = cur.pc;
    try {
      if (pc.signalingState !== 'stable') {
        if (ctx.me < cur.other) return;                  // تصادم: اللي رقمه أصغر يكمّل طلبه
        await pc.setLocalDescription({ type: 'rollback' });
      }
      await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await waitIce(pc);
      send(cur.other, { t: 'reanswer', id: cur.id, sdp: pc.localDescription.sdp });
      if (p.video && !cur.remoteVideo) { cur.remoteVideo = true; ctx.toast((ctx.member(cur.other)?.name || '') + ' شغّل الكاميرا'); render(); }
    } catch (e) { console.error('reoffer', e); }
  } else if (p.t === 'reanswer' && cur.pc) {
    try { if (cur.pc.signalingState === 'have-local-offer') await cur.pc.setRemoteDescription({ type: 'answer', sdp: p.sdp }); } catch (e) { console.error('reanswer', e); }
  } else if (p.t === 'end') {
    if (cur.outgoing) hangup(p.why === 'declined' ? 'declined' : 'ended', true);
    else cleanup();
  } else if (p.t === 'busy' && cur.outgoing) {
    ctx.toast('مشغول في مكالمة ثانية');
    hangup('missed', true);
  }
}

async function accept() {
  if (!cur || cur.state !== 'ringing') return;
  stopTone();
  if (navigator.vibrate) navigator.vibrate(0);
  cur.state = 'connecting';
  clearTimeout(cur.timeout);
  render();
  try {
    cur.stream = await getMedia(cur.video);
  } catch (e) {
    const v = cur.video;
    send(cur.other, { t: 'end', id: cur.id, why: 'declined' });
    cleanup();
    return ctx.mediaError ? ctx.mediaError(e, v ? 'cam' : 'mic') : ctx.toast('اسمح للتطبيق باستخدام المايك');
  }
  attachLocal();
  const pc = (cur.pc = newPC());
  cur.stream.getTracks().forEach((t) => pc.addTrack(t, cur.stream));
  await pc.setRemoteDescription({ type: 'offer', sdp: cur.offer });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  if (!cur || cur.pc !== pc) return;
  send(cur.other, { t: 'answer', id: cur.id, sdp: pc.localDescription.sdp });
}

function decline() {
  if (!cur) return;
  send(cur.other, { t: 'end', id: cur.id, why: 'declined' });
  cleanup();
}

function hangup(why, remote) {
  if (!cur) return;
  const c = cur;
  if (!remote) send(c.other, { t: 'end', id: c.id, why: 'ended' });
  if (c.outgoing) {
    const d = c.startedAt ? Math.round((Date.now() - c.startedAt) / 1000) : 0;
    const st = c.startedAt ? 'ok' : why === 'declined' ? 'declined' : 'missed';
    ctx.logCall(c.chatId, { v: !!c.video, st, d });
  }
  cleanup();
}

function cleanup() {
  if (!cur) return;
  stopTone();
  if (navigator.vibrate) navigator.vibrate(0);
  clearInterval(cur.resend); clearInterval(cur.timer); clearTimeout(cur.timeout); clearTimeout(cur.hideT);
  cur.stream?.getTracks().forEach((t) => t.stop());
  try { cur.pc?.close(); } catch (e) { /* ignore */ }
  cur = null;
  setPill(null);
  const o = el();
  o.classList.add('hidden');
  o.innerHTML = '';
  o.classList.remove('bare');
}

function attachLocal() {
  const v = el().querySelector('video.local');
  if (v && cur.video) { v.srcObject = cur.stream; v.play().catch(() => {}); }
}

// ---------- تحويل المكالمة الصوتية لفيديو ----------
async function toVideo() {
  if (!cur || !cur.pc || !cur.stream) return;
  let track;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    track = s.getVideoTracks()[0];
  } catch (e) { return ctx.mediaError ? ctx.mediaError(e, 'cam') : ctx.toast('ما اشتغلت الكاميرا'); }
  if (!cur) { track.stop(); return; }
  cur.stream.addTrack(track);
  cur.video = true;
  cur.facing = 'user';
  const pc = cur.pc;
  pc.addTrack(track, cur.stream);
  render();
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc);
    if (cur && cur.pc === pc) send(cur.other, { t: 'reoffer', id: cur.id, sdp: pc.localDescription.sdp, video: true });
  } catch (e) { console.error('toVideo', e); ctx.toast('ما قدرنا نشغّل الفيديو'); }
}

// إذا الطرف الثاني طلع من التطبيق أو انقطع عنه النت، المكالمة ما تظل معلّقة للأبد
function watchMedia(pc) {
  let last = -1, still = 0;
  const iv = setInterval(async () => {
    if (!cur || cur.pc !== pc) return clearInterval(iv);
    try {
      let bytes = 0;
      (await pc.getStats()).forEach((r) => { if (r.type === 'inbound-rtp') bytes += r.bytesReceived || 0; });
      if (bytes === last) still += 5; else still = 0;
      last = bytes;
      if (still === 15) ctx.toast('الصوت مقطوع من الطرف الثاني…');
      if (still >= 30) { clearInterval(iv); ctx.toast('انقطعت المكالمة'); hangup('failed'); }
    } catch (e) { /* ignore */ }
  }, 5000);
}

// في مكالمة الفيديو: اضغط على الشاشة تختفي الأزرار، واضغط ثاني ترجع
function autoHide() {
  if (!cur) return;
  clearTimeout(cur.hideT);
  const o = el();
  const vid = o.classList.contains('video-on');
  o.classList.remove('bare');
  if (vid && cur.startedAt) cur.hideT = setTimeout(() => { if (cur && !cur.minimized) el().classList.add('bare'); }, 5000);
}

// ---------- الواجهة ----------
const fmt = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
function statusText() {
  if (!cur) return '';
  if (cur.startedAt) return fmt(Math.round((Date.now() - cur.startedAt) / 1000));
  return {
    calling: 'جاري الاتصال…',
    ringing: cur.video ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة',
    connecting: 'جاري التوصيل…',
  }[cur.state] || '';
}
function updateStatus() {
  const p = el().querySelector('.cstat');
  if (p) p.textContent = statusText();
  if (cur?.minimized) setPill(`${ctx.member(cur.other)?.name || ''} · ${statusText()}`, restore);
}
function minimize() { if (!cur) return; cur.minimized = true; el().classList.add('hidden'); updateStatus(); }
function restore() { if (!cur) return; cur.minimized = false; setPill(null); el().classList.remove('hidden'); }

function render() {
  const o = el();
  const m = ctx.member(cur.other);
  const anyVideo = cur.video || cur.remoteVideo || !!cur.stream?.getVideoTracks().length;
  o.className = 'overlay call' + (anyVideo ? ' video-on' : '') + (cur.state === 'ringing' ? ' ringing' : '');
  o.innerHTML = callMarkup(cur, ctx, statusText());
  o.querySelector('h2').textContent = m?.name || 'فرد من العائلة';
  if (!cur.minimized) o.classList.remove('hidden');
  ctx.hydrate?.(o);
  if (cur.stream) attachLocal();
  if (cur.pc) {
    const r = cur.pc.getReceivers().map((x) => x.track).filter(Boolean);
    if (r.length) { const v = o.querySelector('video.remote'); v.srcObject = new MediaStream(r); v.play().catch(() => {}); }
  }
  autoHide();
  o.onclick = async (e) => {
    if (!cur) return;
    const b = e.target.closest('button');
    if (!b) {
      // ضغطة على الفيديو: نخفي أو نرجّع الأزرار
      if (o.classList.contains('video-on') && cur.state !== 'ringing') {
        if (o.classList.contains('bare')) autoHide(); else { clearTimeout(cur.hideT); o.classList.add('bare'); }
      }
      return;
    }
    autoHide();
    const a = b.dataset.a;
    if (a === 'accept') accept();
    else if (a === 'decline') decline();
    else if (a === 'hang') hangup('ended');
    else if (a === 'min') minimize();
    else if (a === 'chat') { minimize(); ctx.openChat?.(cur.chatId); }
    else if (a === 'tovideo') toVideo();
    else if (a === 'more') {
      ctx.menu?.([
        { label: 'فتح الدردشة', run: () => { minimize(); ctx.openChat?.(cur.chatId); } },
        ...(cur.stream?.getVideoTracks().length ? [] : [{ label: 'تحويل لمكالمة فيديو', run: toVideo }]),
        { label: 'تصغير المكالمة', run: minimize },
      ]);
    } else if (a === 'speaker') {
      if (await toggleSpeaker(o.querySelector('video.remote'), cur, ctx.toast)) render();
    } else if (a === 'mute' && cur.stream) {
      const t = cur.stream.getAudioTracks()[0]; if (!t) return;
      t.enabled = !t.enabled; cur.muted = !t.enabled; render();
    } else if (a === 'cam' && cur.stream) {
      const t = cur.stream.getVideoTracks()[0]; if (!t) return;
      t.enabled = !t.enabled; cur.camOff = !t.enabled; render();
    } else if (a === 'flip' && cur.stream && cur.pc) {
      try {
        cur.facing = cur.facing === 'environment' ? 'user' : 'environment';
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cur.facing } });
        const nt = s.getVideoTracks()[0];
        const sender = cur.pc.getSenders().find((x) => x.track && x.track.kind === 'video');
        await sender?.replaceTrack(nt);
        const old = cur.stream.getVideoTracks()[0];
        cur.stream.removeTrack(old); old.stop(); cur.stream.addTrack(nt);
        const lv = el().querySelector('video.local');
        if (lv) lv.style.transform = cur.facing === 'user' ? 'scaleX(-1)' : 'none';
      } catch (err) { ctx.toast('ما قدرنا نبدل الكاميرا'); }
    }
  };
}

// ---------- النغمات ----------
let ac, toneTimer;
function startTone(kind) {
  stopTone();
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    ac.resume?.();
    const beep = () => {
      const notes = kind === 'ring' ? [[880, 0], [660, 0.18], [880, 0.36], [660, 0.54]] : [[440, 0]];
      notes.forEach(([f, at]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = f; o.type = 'sine';
        const len = kind === 'ring' ? 0.16 : 1.2;
        g.gain.setValueAtTime(0, ac.currentTime + at);
        g.gain.linearRampToValueAtTime(0.12, ac.currentTime + at + 0.02);
        g.gain.setValueAtTime(0.12, ac.currentTime + at + len - 0.05);
        g.gain.linearRampToValueAtTime(0, ac.currentTime + at + len);
        o.connect(g).connect(ac.destination);
        o.start(ac.currentTime + at); o.stop(ac.currentTime + at + len);
      });
    };
    beep();
    toneTimer = setInterval(beep, kind === 'ring' ? 1800 : 3500);
  } catch (e) { /* الصوت ممنوع قبل أول لمسة، عادي */ }
}
function stopTone() { clearInterval(toneTimer); toneTimer = null; }

export const inCall = () => !!cur;
