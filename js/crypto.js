// لمّة · التشفير من طرف لطرف
// كلمة سر العائلة ما تطلع من الجوال أبداً. منها نطلع شيئين:
//  1) مفتاح AES-256 لتشفير الرسائل والصور والصوت والقصص
//  2) "رمز انضمام" مختلف تماماً، يتحقق منه السيرفر بدون ما يعرف المفتاح
const te = new TextEncoder();
const td = new TextDecoder();

export function toB64(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function deriveFromPassphrase(pass) {
  const base = await crypto.subtle.importKey('raw', te.encode(pass.trim().normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const run = (salt) => crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode(salt), iterations: 310000, hash: 'SHA-256' }, base, 256);
  const [keyBits, joinBits] = await Promise.all([run('lamma-enc-v1'), run('lamma-join-v1')]);
  return { raw: toB64(keyBits), token: hex(joinBits) };
}

export function importKey(rawB64) {
  return crypto.subtle.importKey('raw', fromB64(rawB64), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encBytes(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}
export async function decBytes(key, data) {
  const b = new Uint8Array(data);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, key, b.subarray(12));
}

export async function encJSON(key, obj) {
  return toB64(await encBytes(key, te.encode(JSON.stringify(obj))));
}
export async function decJSON(key, b64) {
  return JSON.parse(td.decode(await decBytes(key, fromB64(b64))));
}
