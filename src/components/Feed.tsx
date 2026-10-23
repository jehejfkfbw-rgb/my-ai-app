import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, ImagePlus, Info, Loader2, MessageCircle, Plus, RefreshCw, Search, Send, Share2, Sparkles, Trash2, X } from "lucide-react";
import { Avatar, Btn, Modal, useToast } from "./ui";
import { sb } from "../lib/sb";
import {
  STORY_BACKGROUNDS, addComment, compressImage, createPost, createStory, deletePost, deleteStory,
  fetchPosts, fetchStories, socialMode, storyTimeLeft, timeAgo, toggleLike, type Post, type Story,
} from "../lib/social";

/* ================= عارض الحالات ================= */
function StoryViewer({ groups, startGroup, meId, onClose, onDeleted, onOpenConv }: {
  groups: Story[][]; startGroup: number; meId: string; onClose: () => void; onDeleted: () => void;
  onOpenConv: (cid: string) => void;
}) {
  const toast = useToast();
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(0);
  const [prog, setProg] = useState(0);
  const [reply, setReply] = useState("");
  const [paused, setPaused] = useState(false);
  const [sending, setSending] = useState(false);
  const group = groups[gi];
  const story = group?.[si];

  // الرد على الحالة يوصل رسالة خاصة لصاحبها
  async function sendReply() {
    const t = reply.trim();
    if (!t || !story || sending) return;
    setSending(true);
    const { data: cid, error } = await sb.rpc("start_private_chat", { other: story.user_id });
    if (error) { toast(error.message); setSending(false); return; }
    const quote = story.caption ? `↩️ رد على حالتك: "${story.caption.slice(0, 60)}"` : "↩️ رد على صورتك في الحالة";
    const { error: e2 } = await sb.from("messages").insert({ conversation_id: cid, sender_id: meId, type: "text", body: quote + "\n" + t });
    setSending(false);
    if (e2) return toast("فشل الإرسال: " + e2.message);
    toast("ردك اتبعت في الخاص ✅");
    onOpenConv(cid);
  }

  const next = useCallback(() => {
    setProg(0);
    if (si + 1 < (groups[gi]?.length || 0)) setSi((s) => s + 1);
    else if (gi + 1 < groups.length) { setGi((g) => g + 1); setSi(0); }
    else onClose();
  }, [si, gi, groups, onClose]);

  const prev = () => {
    setProg(0);
    if (si > 0) setSi((s) => s - 1);
    else if (gi > 0) { setGi((g) => g - 1); setSi(0); }
  };

  useEffect(() => {
    setProg(0);
    if (paused) return;
    const t = setInterval(() => setProg((p) => Math.min(100, p + 2)), 100);
    return () => clearInterval(t);
  }, [gi, si, paused]);

  useEffect(() => {
    if (prog >= 100) next();
  }, [prog, next]);

  if (!story) return null;
  return (
    <div className="fixed inset-0 z-[65] bg-grape-950/95 flex items-center justify-center">
      <div className="relative w-full h-full sm:w-[420px] sm:h-[92vh] sm:rounded-3xl overflow-hidden flex flex-col animate-pop"
        style={{ background: story.image_url ? "#061a18" : story.bg }}>
        {story.image_url && (
          <img src={story.image_url} alt="" className="absolute inset-0 w-full h-full object-contain bg-black" />
        )}
        {/* أشرطة التقدم */}
        <div className="relative flex gap-1 p-2.5 z-10" dir="ltr">
          {group.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-[width] duration-100"
                style={{ width: i < si ? "100%" : i === si ? prog + "%" : "0%" }} />
            </div>
          ))}
        </div>
        {/* الرأس */}
        <div className="relative z-10 flex items-center gap-2.5 px-3 pb-2 text-white">
          <Avatar name={story.author || "?"} size={38} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate drop-shadow">{story.author}</div>
            <div className="text-[11px] text-white/80 drop-shadow">{timeAgo(story.created_at)} · {storyTimeLeft(story.created_at)}</div>
          </div>
          {story.user_id === meId && (
            <button onClick={async () => {
              if (!confirm("تمسح الحالة دي؟")) return;
              try { await deleteStory(story); onDeleted(); onClose(); } catch (e: any) { toast(e.message); }
            }} className="p-2 rounded-full bg-black/30 text-white cursor-pointer"><Trash2 size={16} /></button>
          )}
          <button onClick={onClose} className="p-2 rounded-full bg-black/30 text-white cursor-pointer"><X size={16} /></button>
        </div>
        {/* مناطق التنقل */}
        <button className="absolute inset-y-0 right-0 w-1/3 z-[5] cursor-pointer" onClick={prev} aria-label="السابق" />
        <button className="absolute inset-y-0 left-0 w-1/3 z-[5] cursor-pointer" onClick={next} aria-label="التالي" />
        {/* النص */}
        <div className="relative flex-1 flex items-center justify-center p-6 pointer-events-none">
          {story.caption && (
            <p className={`font-display font-extrabold text-center leading-relaxed m-0 whitespace-pre-wrap ${story.image_url ? "absolute bottom-8 inset-x-4 text-white text-lg bg-black/45 rounded-2xl px-4 py-3 backdrop-blur-sm" : "text-white text-3xl drop-shadow-lg"}`}>
              {story.caption}
            </p>
          )}
        </div>
        {/* أسهم للكمبيوتر */}
        <button onClick={prev} className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/15 text-white hover:bg-white/30 cursor-pointer"><ChevronRight size={20} /></button>
        <button onClick={next} className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/15 text-white hover:bg-white/30 cursor-pointer"><ChevronLeft size={20} /></button>
        {/* الرد على الحالة → رسالة خاصة */}
        {story.user_id !== meId && (
          <div className="relative z-10 flex items-center gap-2 p-3 bg-black/35 backdrop-blur-sm">
            <input
              value={reply}
              onChange={(e) => { setReply(e.target.value); setPaused(e.target.value.trim().length > 0); }}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(reply.trim().length > 0)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder={`رد على ${story.author} في الخاص…`}
              className="flex-1 rounded-full bg-white/15 border border-white/25 focus:border-white/60 px-4 py-2.5 text-sm text-white placeholder:text-white/60"
            />
            <button onClick={sendReply} disabled={sending || !reply.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-l from-grape-500 to-candy-500 text-white text-sm font-bold cursor-pointer active:scale-95 transition disabled:opacity-50">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="-scale-x-100" />} إرسال
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= نشر حالة ================= */
function StoryComposer({ meId, onClose, onDone }: { meId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"text" | "image">("text");
  const [caption, setCaption] = useState("");
  const [bg, setBg] = useState(STORY_BACKGROUNDS[1]);
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function publish() {
    if (tab === "text" && !caption.trim()) return toast("اكتب حاجة في الحالة");
    if (tab === "image" && !img) return toast("اختار صورة الأول");
    setBusy(true);
    try {
      await createStory(meId, caption.trim(), bg, tab === "image" ? img : null);
      toast("حالتك اتنشرت ✨ هتفضل 24 ساعة");
      onDone();
      onClose();
    } catch (e: any) { toast("فشل النشر: " + e.message); }
    setBusy(false);
  }

  return (
    <Modal title="✨ حالة جديدة (24 ساعة)" onClose={onClose}>
      <div className="flex gap-2">
        <Btn variant={tab === "text" ? "primary" : "sec"} className="flex-1" onClick={() => setTab("text")}>🎨 نص ملوّن</Btn>
        <Btn variant={tab === "image" ? "primary" : "sec"} className="flex-1" onClick={() => setTab("image")}>📷 صورة</Btn>
      </div>
      {/* المعاينة */}
      <div className="relative h-56 rounded-2xl overflow-hidden flex items-center justify-center transition-all"
        style={{ background: tab === "text" ? bg : "#061a18" }}>
        {tab === "image" && img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-contain" />}
        <p className={`relative font-display font-extrabold text-white text-center px-5 whitespace-pre-wrap m-0 ${tab === "text" ? "text-2xl" : "absolute bottom-3 inset-x-3 text-sm bg-black/45 rounded-xl px-3 py-2"}`}>
          {caption || (tab === "text" ? "اكتب حالتك هنا…" : "")}
        </p>
      </div>
      {tab === "text" && (
        <div className="flex gap-2 justify-center">
          {STORY_BACKGROUNDS.map((b) => (
            <button key={b} onClick={() => setBg(b)} style={{ background: b }}
              className={`w-9 h-9 rounded-full cursor-pointer transition ${bg === b ? "ring-2 ring-offset-2 ring-grape-500 scale-110" : ""}`} />
          ))}
        </div>
      )}
      {tab === "image" && (
        <>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            try { setImg(await compressImage(f)); } catch (err: any) { toast(err.message); }
          }} />
          <Btn variant="sec" onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2">
            <ImagePlus size={16} /> {img ? "غيّر الصورة" : "اختار صورة"}
          </Btn>
        </>
      )}
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} rows={2}
        placeholder={tab === "text" ? "اكتب اللي في بالك…" : "تعليق على الصورة (اختياري)"}
        className="w-full rounded-xl border border-grape-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm dark:text-grape-50 placeholder:text-grape-400 resize-none" />
      <Btn onClick={publish} disabled={busy} className="flex items-center justify-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} انشر الحالة
      </Btn>
    </Modal>
  );
}

/* ================= كارت البوست ================= */
function PostCard({ post, meId, onChanged, onMessage }: { post: Post; meId: string; onChanged: () => void; onMessage: (uid: string) => void }) {
  const toast = useToast();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [liking, setLiking] = useState(false);
  const liked = post.likes.includes(meId);

  async function like() {
    if (liking) return;
    setLiking(true);
    try { await toggleLike(post, meId); onChanged(); } catch (e: any) { toast(e.message); }
    setLiking(false);
  }
  async function sendComment() {
    const b = comment.trim();
    if (!b) return;
    setComment("");
    try { await addComment(post, meId, b); onChanged(); } catch (e: any) { toast(e.message); }
  }

  return (
    <article className="bg-white dark:bg-[#10312c] rounded-3xl shadow-sm border border-grape-100 dark:border-white/10 overflow-hidden animate-rise">
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <Avatar name={post.author || "?"} size={42} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{post.author}</div>
          <div className="text-[11px] text-grape-400">{timeAgo(post.created_at)}</div>
        </div>
        {post.user_id === meId ? (
          <button onClick={async () => {
            if (!confirm("تمسح البوست ده؟")) return;
            try { await deletePost(post); onChanged(); toast("اتمسح البوست"); } catch (e: any) { toast(e.message); }
          }} className="p-2 rounded-xl text-grape-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer" title="حذف البوست">
            <Trash2 size={16} />
          </button>
        ) : (
          <button onClick={() => onMessage(post.user_id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-grape-50 dark:bg-white/5 text-grape-600 dark:text-grape-200 text-xs font-bold hover:bg-grape-100 dark:hover:bg-white/10 transition cursor-pointer" title="ابعتله رسالة خاصة">
            <MessageCircle size={13} /> راسل
          </button>
        )}
      </div>
      {post.caption && (
        <p className="px-4 pt-2.5 pb-1 m-0 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{post.caption}</p>
      )}
      {post.image_url && (
        <img src={post.image_url} alt="" loading="lazy"
          className="w-full max-h-[480px] object-cover mt-2 cursor-pointer" onClick={() => window.open(post.image_url!, "_blank")} />
      )}
      {/* شريط التفاعل */}
      <div className="flex items-center gap-1 px-2.5 py-2 mt-1 border-t border-grape-50 dark:border-white/5">
        <button onClick={like}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer active:scale-90 ${liked ? "text-candy-500 bg-candy-500/10" : "text-grape-500 dark:text-grape-300 hover:bg-grape-50 dark:hover:bg-white/5"}`}>
          <Heart size={17} fill={liked ? "currentColor" : "none"} className={liked ? "animate-pop" : ""} />
          {post.likes.length > 0 ? post.likes.length : ""} إعجاب
        </button>
        <button onClick={() => setShowComments((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${showComments ? "text-grape-600 bg-grape-100 dark:bg-white/10" : "text-grape-500 dark:text-grape-300 hover:bg-grape-50 dark:hover:bg-white/5"}`}>
          <MessageCircle size={17} />
          {post.comments.length > 0 ? post.comments.length : ""} تعليق
        </button>
        <button onClick={() => {
          navigator.clipboard?.writeText((post.caption || "") + (post.image_url ? "\n" + post.image_url : "")).then(() => toast("اتنسخ البوست — ابعته لأصحابك 📋"));
        }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-grape-500 dark:text-grape-300 hover:bg-grape-50 dark:hover:bg-white/5 transition cursor-pointer mr-auto">
          <Share2 size={16} /> مشاركة
        </button>
      </div>
      {/* التعليقات */}
      {showComments && (
        <div className="px-4 pb-3.5 flex flex-col gap-2.5 animate-pop">
          {post.comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar name={c.author || "?"} size={30} />
              <div className="bg-grape-50 dark:bg-white/5 rounded-2xl rounded-tr-md px-3 py-2 flex-1">
                <div className="text-xs font-bold text-grape-700 dark:text-grape-200">{c.author} <span className="font-normal text-grape-400 mr-1">{timeAgo(c.created_at)}</span></div>
                <div className="text-sm mt-0.5">{c.body}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-2 items-center">
            <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="اكتب تعليق…"
              className="flex-1 rounded-full bg-grape-50 dark:bg-white/5 border border-transparent focus:border-grape-300 px-4 py-2 text-sm dark:text-grape-50 placeholder:text-grape-400/70" />
            <button onClick={sendComment} className="p-2.5 rounded-full bg-gradient-to-l from-grape-500 to-candy-500 text-white cursor-pointer active:scale-90 transition">
              <Send size={15} className="-scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ================= الساحة (الفيد الرئيسي) ================= */
export default function Feed({ meId, myName, onMessage, onOpenConv }: {
  meId: string; myName: string;
  onMessage: (uid: string) => void;
  onOpenConv: (cid: string) => void;
}) {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [mode, setMode] = useState<"cloud" | "local" | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedQ, setFeedQ] = useState("");
  const [caption, setCaption] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [storyModal, setStoryModal] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, s, m] = await Promise.all([fetchPosts(), fetchStories(), socialMode()]);
      setPosts(p); setStories(s); setMode(m);
    } catch (e: any) { if (!silent) toast("فشل تحميل الساحة: " + e.message); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // تحديث حي: أي بوست/حالة/لايك/تعليق جديد يظهر لوحده + تحديث دوري خفيف
  useEffect(() => {
    let deb = 0;
    const bump = () => { clearTimeout(deb); deb = window.setTimeout(() => load(true), 800); };
    const ch = sb.channel("social-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, bump)
      .subscribe();
    const t = setInterval(() => load(true), 45000);
    return () => { clearTimeout(deb); clearInterval(t); sb.removeChannel(ch); };
  }, [load]);

  const shownPosts = feedQ.trim()
    ? posts.filter((p) => (p.caption || "").includes(feedQ.trim()) || (p.author || "").includes(feedQ.trim()))
    : posts;

  // تجميع الحالات لكل مستخدم — حالتي الأول
  const groups = useMemo(() => {
    const map = new Map<string, Story[]>();
    stories.forEach((s) => { map.set(s.user_id, [...(map.get(s.user_id) || []), s]); });
    const arr = [...map.values()];
    arr.sort((a, b) => (a[0].user_id === meId ? -1 : b[0].user_id === meId ? 1 : 0));
    return arr;
  }, [stories, meId]);
  const myStories = stories.filter((s) => s.user_id === meId);

  async function publish() {
    if (!caption.trim() && !img) return;
    setPublishing(true);
    try {
      await createPost(meId, caption.trim(), img);
      setCaption(""); setImg(null);
      toast("البوست اتنشر 🎉");
      await load();
    } catch (e: any) { toast("فشل النشر: " + e.message); }
    setPublishing(false);
  }

  return (
    <div className="flex-1 h-full overflow-y-auto nice-scroll bg-grape-50 dark:bg-[#0a1f1d] wp-dots">
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-4 flex flex-col gap-4 pb-24 md:pb-6">
        {/* رأس الساحة */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-2xl m-0">الساحة 🌐</h2>
            <p className="text-xs text-grape-400 dark:text-grape-300/60 m-0 mt-0.5">بوستات وحالات مجتمع VibeChat</p>
          </div>
          <Btn variant="sec" onClick={() => load()} className="flex items-center gap-1.5 text-xs px-3 py-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> تحديث
          </Btn>
        </div>

        {/* بحث في الساحة */}
        <div className="relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-grape-400" />
          <input value={feedQ} onChange={(e) => setFeedQ(e.target.value)}
            placeholder="دوّر في البوستات بالكلام أو باسم الشخص…"
            className="w-full rounded-2xl bg-white dark:bg-[#10312c] border border-grape-100 dark:border-white/10 focus:border-grape-300 pr-10 pl-9 py-2.5 text-sm dark:text-grape-50 placeholder:text-grape-400/70 shadow-sm" />
          {feedQ && (
            <button onClick={() => setFeedQ("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-grape-400 cursor-pointer"><X size={15} /></button>
          )}
        </div>
        {feedQ.trim() && (
          <div className="text-xs text-grape-500 dark:text-grape-300 -mt-2 px-1">
            {shownPosts.length ? `${shownPosts.length} بوست مطابق لـ «${feedQ.trim()}»` : `مفيش بوستات فيها «${feedQ.trim()}»`}
          </div>
        )}

        {mode === "local" && (
          <div className="flex gap-2.5 items-start bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 rounded-2xl px-3.5 py-3 text-xs leading-relaxed">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>
              السوشيال شغال <b>محلياً على جهازك</b> دلوقتي. عشان البوستات والحالات تظهر لكل المستخدمين،
              ادخل لوحة المطوّر ← «تجهيز السوشيال» وفعّل الجداول بضغطة نسخ ولصق في Supabase.
            </span>
          </div>
        )}

        {/* شريط الحالات */}
        <div className="flex gap-3 overflow-x-auto nice-scroll pb-1 -mx-1 px-1">
          {/* حالتي / إضافة */}
          <button onClick={() => (myStories.length ? setViewer(0) : setStoryModal(true))}
            className="relative shrink-0 w-[76px] flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className={`relative w-[68px] h-[68px] rounded-full p-[3px] ${myStories.length ? "bg-gradient-to-tr from-grape-500 via-candy-500 to-amber-400" : "bg-grape-200 dark:bg-white/15"}`}>
              <div className="w-full h-full rounded-full bg-white dark:bg-[#10312c] p-[3px]">
                {myStories.length && myStories[myStories.length - 1].image_url ? (
                  <img src={myStories[myStories.length - 1].image_url!} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-white font-display font-extrabold text-xl"
                    style={{ background: myStories.length ? myStories[myStories.length - 1].bg : "linear-gradient(135deg,#16998a,#ff6b4a)" }}>
                    {myName.trim().charAt(0) || "+"}
                  </div>
                )}
              </div>
              <span onClick={(e) => { e.stopPropagation(); setStoryModal(true); }}
                className="absolute -bottom-0.5 -left-0.5 w-6 h-6 rounded-full bg-grape-500 text-white flex items-center justify-center ring-2 ring-grape-50 dark:ring-[#0a1f1d] group-hover:scale-110 transition">
                <Plus size={14} />
              </span>
            </div>
            <span className="text-[11px] font-semibold text-grape-600 dark:text-grape-200 truncate w-full text-center">حالتي</span>
          </button>
          {/* حالات الناس */}
          {groups.filter((g) => g[0].user_id !== meId).map((g) => {
            const idx = groups.indexOf(g);
            const last = g[g.length - 1];
            return (
              <button key={g[0].user_id} onClick={() => setViewer(idx)}
                className="shrink-0 w-[76px] flex flex-col items-center gap-1.5 cursor-pointer group">
                <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-tr from-grape-500 via-candy-500 to-amber-400 group-hover:scale-105 transition">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#10312c] p-[3px]">
                    {last.image_url ? (
                      <img src={last.image_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center text-white font-display font-extrabold text-xl" style={{ background: last.bg }}>
                        {(last.author || "?").charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-grape-600 dark:text-grape-200 truncate w-full text-center">{last.author}</span>
              </button>
            );
          })}
          {groups.length === 0 && (
            <div className="flex items-center text-xs text-grape-400 dark:text-grape-300/50 px-2 leading-relaxed">
              مفيش حالات دلوقتي —<br />كن أول واحد ينشر ✨
            </div>
          )}
        </div>

        {/* صندوق النشر */}
        <div className="bg-white dark:bg-[#10312c] rounded-3xl shadow-sm border border-grape-100 dark:border-white/10 p-4 flex flex-col gap-3">
          <div className="flex gap-2.5">
            <Avatar name={myName} size={42} />
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={caption ? 3 : 2} maxLength={1000}
              placeholder={`بتفكر في إيه يا ${myName.split(" ")[0]}؟`}
              className="flex-1 rounded-2xl bg-grape-50 dark:bg-white/5 border border-transparent focus:border-grape-300 px-3.5 py-2.5 text-sm dark:text-grape-50 placeholder:text-grape-400/80 resize-none" />
          </div>
          {img && (
            <div className="relative animate-pop">
              <img src={img} alt="" className="w-full max-h-72 object-cover rounded-2xl" />
              <button onClick={() => setImg(null)} className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white cursor-pointer"><X size={15} /></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              try { setImg(await compressImage(f)); } catch (err: any) { toast(err.message); }
            }} />
            <Btn variant="sec" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs">
              <ImagePlus size={15} /> صورة
            </Btn>
            <Btn variant="sec" onClick={() => setStoryModal(true)} className="flex items-center gap-1.5 text-xs">
              <Sparkles size={15} /> حالة 24س
            </Btn>
            <Btn onClick={publish} disabled={publishing || (!caption.trim() && !img)} className="mr-auto flex items-center gap-1.5">
              {publishing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="-scale-x-100" />} انشر
            </Btn>
          </div>
        </div>

        {/* البوستات */}
        {loading && posts.length === 0 ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-[#10312c] rounded-3xl p-4 border border-grape-100 dark:border-white/10">
                <div className="flex gap-2.5 animate-pulse">
                  <div className="w-10 h-10 rounded-2xl bg-grape-100 dark:bg-white/10" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 w-32 rounded bg-grape-100 dark:bg-white/10" />
                    <div className="h-3 w-20 rounded bg-grape-100 dark:bg-white/10" />
                  </div>
                </div>
                <div className="h-40 rounded-2xl bg-grape-50 dark:bg-white/5 mt-3 animate-pulse" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-grape-400 dark:text-grape-300/50">
            <div className="text-5xl mb-3">📣</div>
            <div className="font-display font-bold text-lg text-grape-600 dark:text-grape-200">الساحة لسه فاضية</div>
            <p className="text-sm m-0 mt-1">انشر أول بوست وابدأ الحركة!</p>
          </div>
        ) : (
          shownPosts.map((p) => <PostCard key={p.id} post={p} meId={meId} onChanged={load} onMessage={onMessage} />)
        )}
      </div>

      {storyModal && <StoryComposer meId={meId} onClose={() => setStoryModal(false)} onDone={load} />}
      {viewer !== null && groups[viewer] && (
        <StoryViewer groups={groups} startGroup={viewer} meId={meId} onClose={() => setViewer(null)} onDeleted={load}
          onOpenConv={(cid) => { setViewer(null); onOpenConv(cid); }} />
      )}
    </div>
  );
}