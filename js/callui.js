// لمّة · واجهة المكالمة (مشتركة بين المكالمة الحقيقية ونسخة التجربة)
const svg = (d, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${d}</svg>`;
const PHONE = '<path d="M6.6 3.8 9 3.5l1.6 4-2 1.5a11 11 0 0 0 6.4 6.4l1.5-2 4 1.6-.3 2.4a2 2 0 0 1-2 1.7A15.6 15.6 0 0 1 4.9 5.8a2 2 0 0 1 1.7-2z"/>';
export const IC = {
  accept: svg(PHONE),
  hang: svg(PHONE, 'hang'),
  mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
  micOff: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5M4 4l16 16"/>'),
  cam: svg('<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3z"/>'),
  camOff: svg('<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3zM3 4l17 16"/>'),
  flip: svg('<path d="M4.5 9.5A8 8 0 0 1 18 6.5l2 2M20 4.5v4h-4M19.5 14.5A8 8 0 0 1 6 17.5l-2-2M4 19.5v-4h4"/>'),
  speaker: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  chat: svg('<path d="M4 11.5C4 7.4 7.6 4.5 12 4.5s8 2.9 8 7-3.6 7-8 7c-1 0-2-.2-2.9-.5L5 19.5l1.2-3.4A6.6 6.6 0 0 1 4 11.5z"/>'),
  minimize: svg('<path d="M4.5 19.5 10 14M10 14H5.5M10 14v4.5M19.5 4.5 14 10M14 10h4.5M14 10V5.5"/>'),
  more: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
};

const cell = (a, icon, label, cls = '') => `<div class="cbtn"><button class="${cls}" data-a="${a}" aria-label="${label}">${icon}</button><span>${label}</span></div>`;

export function callMarkup(cur, ctx, status) {
  const ring = cur.state === 'ringing';
  const showLocal = cur.video && !ring;
  let panel;
  if (ring) {
    panel = cell('decline', IC.hang, 'رفض', 'end') + cell('accept', IC.accept, 'رد', 'accept');
  } else {
    const muted = cur.muted, camOff = cur.camOff;
    panel = (cur.video ? cell('cam', camOff ? IC.camOff : IC.cam, 'الكاميرا', camOff ? 'off' : '') : cell('chat', IC.chat, 'الدردشة'))
      + cell('speaker', IC.speaker, 'سماعة', cur.speaker ? 'off' : '')
      + cell('mute', muted ? IC.micOff : IC.mic, 'كتم', muted ? 'off' : '')
      + cell('more', IC.more, 'المزيد')
      + (cur.video ? cell('flip', IC.flip, 'قلب الكاميرا') : cell('min', IC.minimize, 'تصغير'))
      + cell('hang', IC.hang, 'إنهاء', 'end');
  }
  return `
    <div class="call-bg"></div>
    <video class="remote${cur.video ? '' : ' audio'}" playsinline autoplay></video>
    ${showLocal ? '<video class="local" playsinline autoplay muted></video>' : ''}
    <div class="call-top">
      ${ring ? '<span class="cspace"></span>' : `<button class="cglass" data-a="min" aria-label="تصغير المكالمة">${IC.minimize}</button>`}
      <div class="call-name"><h2></h2><p class="cstat">${status}</p></div>
      <span class="cspace"></span>
    </div>
    <div class="call-av">${ctx.avatar(cur.other, 'xl' + (ring || cur.state === 'calling' ? ' pulse' : ''))}</div>
    <div class="call-panel${ring ? ' ring' : ''}">${panel}</div>`;
}

export function setPill(text, onTap) {
  const p = document.getElementById('callPill');
  if (!p) return;
  document.body.classList.toggle('has-call', !!text);
  if (!text) { p.classList.add('hidden'); p.onclick = null; return; }
  p.innerHTML = IC.accept + '<span></span>';
  p.querySelector('span').textContent = text;
  p.classList.remove('hidden');
  p.onclick = onTap;
}

// اختيار السماعة: يشتغل في المتصفحات اللي تدعم تغيير مخرج الصوت (أغلب أندرويد)
export async function toggleSpeaker(video, cur, toast) {
  if (!video || typeof video.setSinkId !== 'function' || !navigator.mediaDevices?.enumerateDevices) {
    toast('تغيير السماعة من التطبيق غير مدعوم على هذا الجهاز. غيّرها من مركز التحكم في الجوال');
    return false;
  }
  try {
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audiooutput');
    const spk = outs.find((d) => /speaker|مكبر/i.test(d.label)) || outs.find((d) => d.deviceId !== 'default');
    if (!spk) { toast('ما لقينا سماعة ثانية'); return false; }
    cur.speaker = !cur.speaker;
    await video.setSinkId(cur.speaker ? spk.deviceId : 'default');
    return true;
  } catch (e) {
    toast('ما قدرنا نغيّر السماعة');
    return false;
  }
}
