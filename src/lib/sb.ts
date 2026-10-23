import { createClient } from "@supabase/supabase-js";

export const APP_NAME = "VibeChat";
export const SUPABASE_URL = "https://iaoswqgkjxfbnfbsnqou.supabase.co";
export const SUPABASE_KEY = "sb_publishable_z7Oaiz99ftTYdBWsyR65Bw_BWPDR_XH";
export const FINISH_LOGIN_URL = SUPABASE_URL + "/functions/v1/finish-login";

// بعض بيئات المعاينة بتعدّل fetch وبتفشل لو الهيدرز كائن Headers — بنحوّله لكائن عادي
const safeFetch: typeof fetch = (url, opts = {}) => {
  if (opts.headers instanceof Headers) {
    const h: Record<string, string> = {};
    opts.headers.forEach((v, k) => (h[k] = v));
    opts = { ...opts, headers: h };
  }
  return fetch(url, opts);
};

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { fetch: safeFetch } });

export const COUNTRIES = [
  { n: "مصر", flag: "🇪🇬", d: "20" },
  { n: "السعودية", flag: "🇸🇦", d: "966" },
  { n: "اليمن", flag: "🇾🇪", d: "967" },
  { n: "العراق", flag: "🇮🇶", d: "964" },
  { n: "الأردن", flag: "🇯🇴", d: "962" },
];

// يرجّع الرقم بصيغة دولية أرقام بس (من غير +)
export function toIntl(raw: string, dial: string): string {
  let s = String(raw || "").trim().replace(/[\s\-()‎‏]/g, "");
  s = s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (s.startsWith("+")) s = s.slice(1);
  else if (s.startsWith("00")) s = s.slice(2);
  else {
    s = s.replace(/^0+/, "");
    if (!(s.startsWith(dial) && s.length >= dial.length + 8)) s = dial + s;
  }
  return s.replace(/\D/g, "");
}
export const validIntl = (d: string) => d.length >= 10 && d.length <= 15;
export const showPhone = (p?: string | null) => (p ? "+" + p : "");
export const myDialOf = (phone?: string | null) =>
  COUNTRIES.find((c) => (phone || "").startsWith(c.d))?.d || localStorage.getItem("dial") || "20";

export function errText(e: any): string {
  const m = (e && e.message) || "حصلت مشكلة";
  const c = e && (e.code || e.status);
  if (c === "PGRST202" || /could not find the function/i.test(m)) return "الدالة مش موجودة في قاعدة البيانات (" + m + ")";
  if (c === "42501" || /permission denied/i.test(m)) return "مفيش صلاحية على الدالة دي في Supabase (" + m + ")";
  return m + (c ? " (" + c + ")" : "");
}

export const fmtTime = (t: string) =>
  new Date(t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
export const fmtFull = (t?: string | null) =>
  t ? new Date(t).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "";
export function fmtDay(t: string) {
  const d = new Date(t);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "النهارده";
  if (d.toDateString() === yest.toDateString()) return "امبارح";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}
export const rnd6 = () => String(Math.floor(100000 + Math.random() * 900000));

// نغمة تنبيه قصيرة للرسايل الجديدة
let audioCtx: AudioContext | null = null;
export function ping() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = audioCtx.currentTime;
    [880, 1174.66].forEach((f, i) => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.22);
      o.connect(g).connect(audioCtx!.destination);
      o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.25);
    });
  } catch { /* الصوت مش متاح */ }
}

export interface Profile {
  id: string;
  phone: string;
  display_name: string | null;
  is_banned?: boolean;
  banned_until?: string | null;
  strikes?: number;
}
export interface Conv {
  id: string;
  is_group: boolean;
  is_public?: boolean;
  name?: string | null;
  created_at?: string;
  title: string;
  otherId?: string;
}
export interface Msg {
  id?: string;
  conversation_id: string;
  sender_id: string;
  type: "text" | "image" | "audio";
  body?: string | null;
  media_url?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}