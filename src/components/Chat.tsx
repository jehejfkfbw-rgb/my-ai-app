import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Download, Image as ImageIcon, Mic, Phone, Search, Send, Smile, Square, Ticket, Trash2, Users, Video, X } from "lucide-react";
import { useCall } from "./CallLayer";
import { Avatar, Btn } from "./ui";
import { fmtDay, fmtFull, fmtTime, sb, type Conv, type Msg, type Profile } from "../lib/sb";
import type { Prefs } from "./Dialogs";

const EMOJIS = ["😀","😂","🤣","😍","🥰","😘","😎","🤩","🥳","😅","😉","😊","🙃","😇","🤔","🤗","😴","😭","😢","😡","🤯","😱","🥶","😬","👍","👎","👏","🙏","💪","🤝","❤️","💜","💔","🔥","✨","🎉","🎶","🎧","⚽","🌹","☕","🍕","🌙","🚀","💯","⭐"];

const mediaCache = new Map<string, string>();
function Media({ path, kind, mine }: { path: string; kind: "image" | "audio"; mine: boolean }) {
  const [url, setUrl] = useState(mediaCache.get(path) || "");
  useEffect(() => {
    let live = true;
    if (!mediaCache.has(path)) {
      sb.storage.from("chat-media").createSignedUrl(path, 3600).then(({ data }) => {
        if (data?.signedUrl) { mediaCache.set(path, data.signedUrl); if (live) setUrl(data.signedUrl); }
      });
    } else setUrl(mediaCache.get(path)!);
    return () => { live = false; };
  }, [path]);
  if (!url) return <div className="w-44 h-24 rounded-xl bg-grape-100 dark:bg-white/10 animate-pulse" />;
  if (kind === "image")
    return (
      <div className="relative group/img">
        <img src={url} alt="صورة" className="max-w-full max-h-[300px] rounded-xl block" loading="lazy" />
        <a href={url} download target="_blank" rel="noreferrer" title="تحميل الصورة"
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover/img:opacity-100 transition">
          <Download size={14} />
        </a>
      </div>
    );
  return <audio controls src={url} className="max-w-full h-10" style={mine ? { filter: "none" } : undefined} />;
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "gi"));
  return <>{parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p))}</>;
}

export default function Chat({ conv, meId, profile, msgs, names, prefs, typingName, otherOnline, onSend, onTyping, onBack, onInvite, onDelete }: {
  conv: Conv;
  meId: string;
  profile: Profile | null;
  msgs: Msg[];
  names: Record<string, string>;
  prefs: Prefs;
  typingName: string | null;
  otherOnline: boolean;
  onSend: (row: Partial<Msg>) => Promise<void>;
  onTyping: () => void;
  onBack: () => void;
  onInvite: () => void;
  onDelete: (m: Msg) => void;
}) {
  const [txt, setTxt] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [searchOn, setSearchOn] = useState(false);
  const [q, setQ] = useState("");
  const [recSecs, setRecSecs] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimer = useRef<number>(0);
  const toast = (t: string) => window.dispatchEvent(new CustomEvent("vibe-toast", { detail: t }));
  const { start: startCall } = useCall();

  useEffect(() => {
    const e = boxRef.current;
    if (e) e.scrollTop = e.scrollHeight;
  }, [msgs.length, typingName, conv.id]);

  useEffect(() => { setQ(""); setSearchOn(false); setEmoji(false); }, [conv.id]);

  const shown = useMemo(
    () => (q ? msgs.filter((m) => m.type === "text" && (m.body || "").toLowerCase().includes(q.toLowerCase())) : msgs),
    [msgs, q]
  );

  const fontCls = prefs.font === "sm" ? "text-[13px]" : prefs.font === "lg" ? "text-[17px]" : "text-[15px]";
  const banned = !!profile?.is_banned;

  async function sendText() {
    const t = txt.trim();
    if (!t) return;
    setTxt("");
    setEmoji(false);
    await onSend({ type: "text", body: t });
    inputRef.current?.focus();
  }

  async function upload(blob: Blob, ext: string): Promise<string | null> {
    const path = `${conv.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("chat-media").upload(path, blob, { contentType: blob.type });
    if (error) { toast("فشل رفع الملف: " + error.message); return null; }
    return path;
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast("الصورة أكبر من 8 ميجا");
    setUploading(true);
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const p = await upload(f, ext);
    setUploading(false);
    if (p) onSend({ type: "image", media_url: p });
  }

  async function toggleRec() {
    if (recRef.current) { recRef.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      const start = Date.now();
      setRecSecs(0);
      recTimer.current = window.setInterval(() => setRecSecs(Math.round((Date.now() - start) / 1000)), 500);
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recTimer.current);
        setRecSecs(null);
        const type = rec.mimeType || "audio/webm";
        recRef.current = null;
        const blob = new Blob(chunksRef.current, { type });
        const secs = Math.round((Date.now() - start) / 1000);
        if (secs < 1) return;
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const p = await upload(blob, ext);
        if (p) onSend({ type: "audio", media_url: p, duration_seconds: secs });
      };
      rec.start();
      recRef.current = rec;
    } catch (err: any) {
      toast("مش قادر أوصل للمايك: " + err.message);
    }
  }

  function copyMsg(m: Msg) {
    navigator.clipboard?.writeText(m.body || "").then(() => {
      setCopiedId(m.id || "");
      setTimeout(() => setCopiedId(null), 1200);
    });
  }

  let lastDay = "";
  return (
    <section className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
      {/* الهيدر */}
      <div className="bg-gradient-to-l from-grape-700 to-grape-500 text-white px-3 py-2.5 flex items-center gap-2.5 shadow-md z-10">
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg bg-white/15 cursor-pointer"><ArrowRight size={18} /></button>
        <Avatar name={conv.title} size={38} online={!conv.is_group && otherOnline} />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate leading-tight">{conv.title}</div>
          <div className="text-[11px] h-4 leading-4">
            {typingName ? (
              <span className="text-emerald-300 flex items-center gap-1">
                {typingName} بيكتب
                <span className="flex gap-0.5" dir="ltr">
                  <i className="w-1 h-1 rounded-full bg-emerald-300 animate-blink" />
                  <i className="w-1 h-1 rounded-full bg-emerald-300 animate-blink" style={{ animationDelay: ".2s" }} />
                  <i className="w-1 h-1 rounded-full bg-emerald-300 animate-blink" style={{ animationDelay: ".4s" }} />
                </span>
              </span>
            ) : conv.is_group ? (
              <span className="text-white/60 flex items-center gap-1"><Users size={11} /> مجموعة</span>
            ) : otherOnline ? (
              <span className="text-emerald-300">متصل دلوقتي</span>
            ) : (
              <span className="text-white/60">محادثة خاصة</span>
            )}
          </div>
        </div>
        {!conv.is_group && conv.otherId && (
          <>
            <button onClick={() => startCall(conv.otherId!, conv.title, "voice")} title="مكالمة صوتية"
              className="p-2 rounded-xl bg-white/15 hover:bg-emerald-500/80 transition cursor-pointer">
              <Phone size={16} />
            </button>
            <button onClick={() => startCall(conv.otherId!, conv.title, "video")} title="مكالمة فيديو"
              className="p-2 rounded-xl bg-white/15 hover:bg-emerald-500/80 transition cursor-pointer">
              <Video size={16} />
            </button>
          </>
        )}
        <button onClick={() => { setSearchOn((s) => !s); setQ(""); }} title="بحث في الرسايل"
          className={`p-2 rounded-xl transition cursor-pointer ${searchOn ? "bg-white text-grape-700" : "bg-white/15 hover:bg-white/25"}`}>
          <Search size={16} />
        </button>
        {conv.is_group && (
          <button onClick={onInvite} title="كود دعوة" className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition cursor-pointer">
            <Ticket size={16} />
          </button>
        )}
      </div>

      {/* شريط البحث في الرسايل (جديد) */}
      {searchOn && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#10312c] border-b border-grape-100 dark:border-white/10 animate-pop">
          <Search size={15} className="text-grape-400 shrink-0" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر في رسايل المحادثة…"
            className="flex-1 bg-transparent text-sm dark:text-grape-50 placeholder:text-grape-400/70" />
          {q && <span className="text-[11px] text-grape-400 shrink-0">{shown.length} نتيجة</span>}
          <button onClick={() => { setSearchOn(false); setQ(""); }} className="p-1 text-grape-400 cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* بانر الحظر */}
      {banned && (
        <div className="bg-red-600 text-white text-sm text-center font-semibold px-3 py-2.5">
          🚫 {profile?.banned_until
            ? <>تم حظرك مؤقتاً لحد {fmtFull(profile.banned_until)}. مش هتقدر تبعت رسائل لحد ما ينتهي الحظر.</>
            : "تم حظر حسابك بسبب مخالفة القواعد. مش هتقدر تبعت رسائل."}
        </div>
      )}

      {/* الرسايل */}
      <div ref={boxRef} className={`flex-1 overflow-y-auto nice-scroll px-3 py-4 bg-grape-50 dark:bg-[#0a1f1d] ${prefs.wp}`}>
        {shown.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-grape-400 dark:text-grape-300/50 text-sm gap-2">
            <span className="text-4xl">{q ? "🔎" : "👋"}</span>
            {q ? "مفيش رسايل فيها الكلمة دي" : "ابعت أول رسالة وابدأ الـ Vibe"}
          </div>
        )}
        <div className="flex flex-col gap-1.5 max-w-3xl mx-auto">
          {shown.map((m, i) => {
            const mine = m.sender_id === meId;
            const day = fmtDay(m.created_at);
            const showDay = !q && day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id || i} className="contents">
                {showDay && (
                  <div className="self-center my-2 text-[11px] font-semibold text-grape-500 dark:text-grape-200 bg-white/80 dark:bg-white/10 rounded-full px-3 py-1 shadow-sm">
                    {day}
                  </div>
                )}
                <div className={`group relative max-w-[80%] animate-msg ${mine ? "self-end" : "self-start"}`}>
                  <div className={`px-3 py-2 shadow-sm ${fontCls} leading-relaxed break-words ${
                    mine
                      ? "bg-gradient-to-br from-grape-500 to-grape-600 text-white rounded-2xl rounded-bl-md"
                      : "bg-white dark:bg-[#143832] text-grape-950 dark:text-grape-50 rounded-2xl rounded-br-md"
                  }`}>
                    {!mine && conv.is_group && (
                      <div className="text-[11px] font-bold text-candy-500 mb-0.5">{names[m.sender_id] || ""}</div>
                    )}
                    {m.type === "image" ? <Media path={m.media_url!} kind="image" mine={mine} />
                      : m.type === "audio" ? <Media path={m.media_url!} kind="audio" mine={mine} />
                      : <span className="whitespace-pre-wrap"><Highlight text={m.body || ""} q={q} /></span>}
                    <div className={`text-[10px] mt-1 text-left ${mine ? "text-white/60" : "text-grape-400 dark:text-grape-300/50"}`} dir="ltr">
                      {fmtTime(m.created_at)}{m.type === "audio" && m.duration_seconds ? ` · ${m.duration_seconds}s` : ""}
                    </div>
                  </div>
                  {/* أزرار سريعة (جديد) */}
                  <div className={`absolute -top-3 ${mine ? "left-1" : "right-1"} hidden group-hover:flex gap-0.5 bg-white dark:bg-[#1a453e] rounded-full shadow-md border border-grape-100 dark:border-white/10 px-1 py-0.5 z-10`}>
                    {m.type === "text" && (
                      <button onClick={() => copyMsg(m)} title="نسخ" className="p-1 text-grape-500 dark:text-grape-200 cursor-pointer">
                        {copiedId === m.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                    {mine && m.id && (
                      <button onClick={() => onDelete(m)} title="حذف" className="p-1 text-red-500 cursor-pointer"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {typingName && !q && (
            <div className="self-start bg-white dark:bg-[#143832] rounded-2xl rounded-br-md px-4 py-3 shadow-sm animate-pop">
              <span className="flex gap-1" dir="ltr">
                <i className="w-1.5 h-1.5 rounded-full bg-grape-400 animate-blink" />
                <i className="w-1.5 h-1.5 rounded-full bg-grape-400 animate-blink" style={{ animationDelay: ".2s" }} />
                <i className="w-1.5 h-1.5 rounded-full bg-grape-400 animate-blink" style={{ animationDelay: ".4s" }} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* منتقي الإيموجي (جديد) */}
      {emoji && (
        <div className="bg-white dark:bg-[#10312c] border-t border-grape-100 dark:border-white/10 px-3 py-2 grid grid-cols-8 sm:grid-cols-12 gap-1 max-h-40 overflow-y-auto nice-scroll animate-pop">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => { setTxt((t) => t + e); inputRef.current?.focus(); }}
              className="text-xl hover:bg-grape-100 dark:hover:bg-white/10 rounded-lg p-1 transition cursor-pointer">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* شريط الكتابة */}
      <div className="bg-white dark:bg-[#0d2724] border-t border-grape-100 dark:border-white/10 px-2.5 py-2.5 flex items-center gap-1.5">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} title="صورة"
          className="p-2.5 rounded-xl bg-grape-50 dark:bg-white/5 text-grape-600 dark:text-grape-200 hover:bg-grape-100 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50">
          <ImageIcon size={18} className={uploading ? "animate-pulse" : ""} />
        </button>
        <button onClick={() => setEmoji((s) => !s)} title="إيموجي"
          className={`p-2.5 rounded-xl transition cursor-pointer ${emoji ? "bg-grape-500 text-white" : "bg-grape-50 dark:bg-white/5 text-grape-600 dark:text-grape-200 hover:bg-grape-100 dark:hover:bg-white/10"}`}>
          <Smile size={18} />
        </button>
        {recSecs !== null ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 text-sm font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-blink" />
            بي سجّل… <span dir="ltr">{String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}</span>
          </div>
        ) : (
          <input
            ref={inputRef} value={txt}
            onChange={(e) => { setTxt(e.target.value); onTyping(); }}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder={banned ? "الحساب محظور مؤقتاً…" : "اكتب رسالة…"}
            autoComplete="off"
            className="flex-1 min-w-0 rounded-xl bg-grape-50 dark:bg-white/5 border border-transparent focus:border-grape-300 dark:focus:border-white/20 px-3.5 py-2.5 text-sm dark:text-grape-50 placeholder:text-grape-400/70"
          />
        )}
        <button onClick={toggleRec} title="رسالة صوتية"
          className={`p-2.5 rounded-xl transition cursor-pointer ${recSecs !== null ? "bg-red-600 text-white" : "bg-grape-50 dark:bg-white/5 text-grape-600 dark:text-grape-200 hover:bg-grape-100 dark:hover:bg-white/10"}`}>
          {recSecs !== null ? <Square size={18} /> : <Mic size={18} />}
        </button>
        <Btn onClick={sendText} className="p-2.5 rounded-xl" title="إرسال"><Send size={18} className="-scale-x-100" /></Btn>
      </div>
    </section>
  );
}