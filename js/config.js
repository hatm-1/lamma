// ============================================================
//  لمّة · الإعدادات — عدّل هذا الملف بس
// ============================================================
export const CONFIG = {
  // من Supabase > Project Settings > API (أو Data API)
  SUPABASE_URL: 'https://odmkcxilyaxtgxvmeouc.supabase.co',
  // المفتاح العام: "anon public" أو "publishable" (اللي يبدأ بـ sb_publishable_)
  SUPABASE_KEY: 'sb_publishable_-1bVFwmtR56A-Mf-2uenzA_BIp-f4K7',

  // مفتاح الإشعارات العام (جاهز، لا تغيّره إلا لو ولّدت مفاتيح جديدة)
  VAPID_PUBLIC_KEY: 'BPVWZmtC4vdICM9PxVcOq3U1hN8Qn633hu4eRU01jkjg-ny9IPMoig6Tz6MGPbnmzL8wo1-i4lxCEoaChNSdD7E',

  // اسم التطبيق اللي يطلع فوق
  APP_NAME: 'لمّة',

  // يُستخدم داخلياً لتحويل رقم الجوال لحساب. لا تغيّره بعد ما تسجّل العائلة
  AUTH_DOMAIN: 'lamma-family.app',

  // خوادم المكالمات. جوجل STUN مجاني ويكفي أغلب الحالات.
  // لو المكالمات ما توصل بين شبكتين جوال، أضف خادم TURN مجاني (شوف الدليل)
  ICE_SERVERS: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // { urls: 'turn:YOUR-TURN-SERVER:443', username: '...', credential: '...' },
  ],
};
