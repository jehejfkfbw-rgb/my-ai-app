import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { Globe, LogOut, MessageCircleHeart, MessagesSquare, Moon, Plus, Search, Settings, Sun, UserSearch } from "lucide-react";
import Auth from "./components/Auth";
import Feed from "./components/Feed";
import CallLayer from "./components/CallLayer";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/Chat";
import DevPanel from "./components/DevPanel";
import Maintenance from "./components/Maintenance";
import Logo from "./components/Logo";
import { Btn, ToastProvider, useToast } from "./components/ui";
import { FindGroupDialog, FindUserDialog, ForceNameDialog, InviteDialog, JoinCodeDialog, NewGroupDialog, ProfileDialog, type Prefs } from "./components/Dialogs";
import { ping, sb, showPhone, type Conv, type Msg, type Profile } from "./lib/sb";

type Dialog = null | "findUser" | "findGroup" | "newGroup" | "joinCode" | "invite" | "profile";

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem("vibe-prefs") || "{}");
    return { dark: !!p.dark, wp: p.wp || "wp-dots", font: p.font || "base", sound: p.sound !== false };
  } catch { return { dark: false, wp: "wp-dots", font: "base", sound: true }; }
}

function Shell() {
  const toast = useToast();
  const [me, setMe] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [current, setCurrent] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typingName, setTypingName] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [maint, setMaint] = useState<{ until: number; msg: string }>({ until: 0, msg: "" });
  const [forceName, setForceName] = useState(false);
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState<"chats" | "social">("chats");
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [, setTick] = useState(0);

  const currentRef = useRef<Conv | null>(null);
  const convsRef = useRef<Conv[]>([]);
  const profileRef = useRef<Profile | null>(null);
  const prefsRef = useRef(prefs);
  const namesRef = useRef<Record<string, string>>({});
  const startedRef = useRef(false);
  const typingChRef = useRef<RealtimeChannel | null>(null);
  const lastTypedRef = useRef(0);
  const typingTimer = useRef<number>(0);
  currentRef.current = current;
  convsRef.current = convs;
  profileRef.current = profile;
  prefsRef.current = prefs;

  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    localStorage.setItem("vibe-prefs", JSON.stringify(p));
  };
  useEffect(() => {
    document.documentElement.classList.toggle("dark", prefs.dark);
  }, [prefs.dark]);

  // توست من مكوّن الشات
  useEffect(() => {
    const h = (e: Event) => toast((e as CustomEvent).detail);
    window.addEventListener("vibe-toast", h);
    return () => window.removeEventListener("vibe-toast", h);
  }, [toast]);

  /* ---------- الصيانة ---------- */
  const pollStatus = useCallback(async () => {
    try {
      const { data } = await sb.rpc("public_status");
      setMaint({
        until: data?.maintenance_until ? new Date(data.maintenance_until).getTime() : 0,
        msg: data?.msg || "",
      });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    pollStatus();
    const t = setInterval(pollStatus, 60000);
    return () => clearInterval(t);
  }, [pollStatus]);
  useEffect(() => {
    if (maint.until <= Date.now()) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [maint.until]);

  /* ---------- دخول المطوّر ---------- */
  const closeDev = useCallback(() => setDevCode(null), []);
  const openDev = useCallback(async (code: string) => {
    const { data, error } = await sb.rpc("dev_status", { p_code: code });
    if (error || !data || data.ok === false) return false;
    setDevCode(code);
    return true;
  }, []);

  /* ---------- الجلسة ---------- */
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { if (data.session) setMe(data.session.user); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (session) setMe(session.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await sb.from("profiles").select("*").eq("id", uid).single();
    if (error) console.error("profiles", error);
    setProfile(data);
    profileRef.current = data;
    return data as Profile | null;
  }, []);

  const ensureNames = useCallback(async (ids: (string | undefined)[]) => {
    const need = [...new Set(ids.filter(Boolean) as string[])].filter((i) => !namesRef.current[i]);
    if (!need.length) return;
    const { data } = await sb.from("profiles").select("id,display_name,phone").in("id", need);
    const add: Record<string, string> = {};
    (data || []).forEach((p: any) => { add[p.id] = p.display_name || showPhone(p.phone) || "مستخدم"; });
    namesRef.current = { ...namesRef.current, ...add };
    setNames(namesRef.current);
  }, []);

  const loadConvs = useCallback(async (uid: string): Promise<Conv[]> => {
    const { data, error } = await sb.from("conversation_members")
      .select("conversation_id, conversations(id,is_group,is_public,name,created_at)")
      .eq("user_id", uid);
    if (error) { toast(error.message); return []; }
    const list: Conv[] = (data || []).map((r: any) => r.conversations).filter(Boolean).map((c: any) => ({ ...c, title: "" }));
    const priv = list.filter((c) => !c.is_group).map((c) => c.id);
    if (priv.length) {
      const { data: mem } = await sb.from("conversation_members")
        .select("conversation_id, user_id, profiles(display_name,phone)")
        .in("conversation_id", priv).neq("user_id", uid);
      (mem || []).forEach((r: any) => {
        const c = list.find((x) => x.id === r.conversation_id);
        if (c) {
          c.title = r.profiles?.display_name || showPhone(r.profiles?.phone) || "مستخدم";
          c.otherId = r.user_id;
          if (r.profiles) namesRef.current[r.user_id] = r.profiles.display_name || showPhone(r.profiles.phone) || "مستخدم";
        }
      });
      setNames({ ...namesRef.current });
    }
    list.forEach((c) => {
      if (c.is_group) c.title = c.name || "مجموعة";
      if (!c.title) c.title = "محادثة";
    });
    setConvs(list);
    convsRef.current = list;
    return list;
  }, [toast]);

  /* ---------- بدء التطبيق بعد الدخول ---------- */
  useEffect(() => {
    if (!me || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        try { await sb.rpc("refresh_my_ban"); } catch { /* ignore */ }
        const p = await loadProfile(me.id);
        setBooted(true);
        if (!p) toast("دخلت، بس مفيش ملف شخصي (profiles) للحساب ده. راجع الـ trigger في قاعدة البيانات.");
        if (p && (!p.display_name || p.display_name === p.phone)) setForceName(true);
        await loadConvs(me.id);
      } catch (e: any) {
        console.error(e);
        setBooted(true);
        toast("حصلت مشكلة وأنا بحمّل التطبيق: " + (e.message || e));
      }
    })();
  }, [me, loadProfile, loadConvs, toast]);

  /* ---------- ريل تايم: رسايل + تواجد ---------- */
  useEffect(() => {
    if (!me) return;
    const ch = sb.channel("msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (p) => {
        const m = p.new as Msg;
        if (currentRef.current && m.conversation_id === currentRef.current.id) {
          await ensureNames([m.sender_id]);
          setMsgs((prev) => (m.id && prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        } else if (m.sender_id !== me.id) {
          setUnread((u) => ({ ...u, [m.conversation_id]: (u[m.conversation_id] || 0) + 1 }));
          if (prefsRef.current.sound) ping();
          const c = convsRef.current.find((x) => x.id === m.conversation_id);
          toast("💬 رسالة جديدة" + (c ? " من " + c.title : ""));
        }
        if (!convsRef.current.find((c) => c.id === m.conversation_id)) await loadConvs(me.id);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => {
        const old = p.old as Partial<Msg>;
        if (old.id) setMsgs((prev) => prev.filter((x) => x.id !== old.id));
      })
      .subscribe();

    const pres = sb.channel("vibe-online", { config: { presence: { key: me.id } } });
    pres.on("presence", { event: "sync" }, () => {
      setOnlineIds(new Set(Object.keys(pres.presenceState())));
    }).subscribe(async (s) => {
      if (s === "SUBSCRIBED") await pres.track({ user_id: me.id });
    });

    return () => { sb.removeChannel(ch); sb.removeChannel(pres); };
  }, [me, ensureNames, loadConvs, toast]);

  /* ---------- مؤشر الكتابة ---------- */
  useEffect(() => {
    if (!me || !current) return;
    setTypingName(null);
    const ch = sb.channel("typing-" + current.id);
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.uid === me.id) return;
      setTypingName(payload.name || "حد");
      clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTypingName(null), 3000);
    }).subscribe();
    typingChRef.current = ch;
    return () => { clearTimeout(typingTimer.current); sb.removeChannel(ch); typingChRef.current = null; };
  }, [me, current]);

  const onTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypedRef.current < 1500) return;
    lastTypedRef.current = now;
    typingChRef.current?.send({
      type: "broadcast", event: "typing",
      payload: { uid: me?.id, name: profileRef.current?.display_name || "حد" },
    });
  }, [me]);

  /* ---------- فتح محادثة ---------- */
  const openConv = useCallback(async (c: Conv) => {
    setCurrent(c);
    currentRef.current = c;
    setMsgs([]);
    setUnread((u) => ({ ...u, [c.id]: 0 }));
    const { data, error } = await sb.from("messages").select("*")
      .eq("conversation_id", c.id).order("created_at", { ascending: true }).limit(200);
    if (error) return toast(error.message);
    await ensureNames((data || []).map((m: Msg) => m.sender_id));
    setMsgs(data || []);
  }, [ensureNames, toast]);

  const openConvById = useCallback(async (cid: string) => {
    setDialog(null);
    setView("chats");
    if (!me) return;
    const list = await loadConvs(me.id);
    const c = list.find((x) => x.id === cid);
    if (c) openConv(c);
  }, [me, loadConvs, openConv]);

  const onJoined = useCallback((cid: string) => openConvById(cid), [openConvById]);

  // راسل أي حد من الساحة (بوست أو حالة)
  const messageUser = useCallback(async (uid: string) => {
    if (uid === me?.id) return;
    const { data: cid, error } = await sb.rpc("start_private_chat", { other: uid });
    if (error) return toast(error.message);
    await openConvById(cid);
  }, [me, toast, openConvById]);

  /* ---------- الإرسال (نفس قواعد الحظر والتحذيرات) ---------- */
  const sendMsg = useCallback(async (row: Partial<Msg>) => {
    const cur = currentRef.current;
    if (!cur || !me) return;
    let p = profileRef.current;
    if (p?.is_banned && p.banned_until && new Date(p.banned_until) <= new Date()) {
      try { await sb.rpc("refresh_my_ban"); } catch { /* ignore */ }
      p = await loadProfile(me.id);
    }
    if (p?.is_banned) return;
    const { error } = await sb.from("messages").insert({ conversation_id: cur.id, sender_id: me.id, ...row });
    if (error) {
      if (/row-level security/i.test(error.message)) {
        try { await sb.rpc("refresh_my_ban"); } catch { /* ignore */ }
        await loadProfile(me.id);
      }
      return toast("فشل الإرسال: " + error.message);
    }
    if (row.type === "text") {
      const before = profileRef.current?.strikes || 0;
      const np = await loadProfile(me.id);
      if (np?.is_banned) toast("تم حظر حسابك بسبب الشتائم");
      else if ((np?.strikes || 0) > before) toast(`تحذير: ممنوع الشتائم في المحادثات الخاصة (${np?.strikes})`);
    }
  }, [me, loadProfile, toast]);

  const deleteMsg = useCallback(async (m: Msg) => {
    if (!m.id) return;
    const { error } = await sb.from("messages").delete().eq("id", m.id);
    if (error) return toast("معندكش صلاحية حذف الرسالة دي: " + error.message);
    setMsgs((prev) => prev.filter((x) => x.id !== m.id));
    toast("اتمسحت الرسالة");
  }, [toast]);

  const logout = async () => { await sb.auth.signOut(); location.reload(); };

  /* ---------- العرض ---------- */
  const maintActive = maint.until > Date.now();
  const otherOnline = !!current?.otherId && onlineIds.has(current.otherId);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const RailBtn = ({ active, onClick, icon, label, badge }: { active?: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) => (
    <button onClick={onClick}
      className={`relative w-[60px] py-2.5 rounded-2xl flex flex-col items-center gap-1 text-[10px] font-bold transition cursor-pointer ${
        active ? "bg-gradient-to-br from-grape-500 to-candy-500 text-white shadow-lg shadow-grape-500/30" : "text-grape-500 dark:text-grape-300 hover:bg-grape-50 dark:hover:bg-white/5"
      }`}>
      {icon}
      {label}
      {!!badge && <span className="absolute top-1 right-2 bg-candy-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{badge}</span>}
    </button>
  );

  return (
    <CallLayer meId={me?.id || "guest"} myName={profile?.display_name || "أنا"} onToast={toast}>
    <div className="h-full font-body text-grape-950 dark:text-grape-50 bg-grape-50 dark:bg-[#0a1f1d]">
      {!me ? (
        <Auth onDev={openDev} />
      ) : !booted ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 bg-grape-950 text-white">
          <Logo size={90} />
          <div className="font-display font-bold animate-pulse">بنظبّط الموجات… 🎶</div>
        </div>
      ) : (
        <div className={`h-full flex ${view === "chats" && current ? "" : "pb-16 md:pb-0"}`}>
          {/* شريط التنقل الجانبي — كمبيوتر */}
          <nav className="hidden md:flex flex-col items-center w-[80px] shrink-0 bg-white dark:bg-[#0d2724] border-l border-grape-100 dark:border-white/10 py-4 gap-2">
            <Logo size={42} animated={false} />
            <div className="h-px w-10 bg-grape-100 dark:bg-white/10 my-2" />
            <RailBtn active={view === "chats"} onClick={() => setView("chats")} icon={<MessagesSquare size={21} />} label="الدردشات" badge={totalUnread} />
            <RailBtn active={view === "social"} onClick={() => setView("social")} icon={<Globe size={21} />} label="الساحة" />
            <div className="flex-1" />
            <RailBtn onClick={() => setPrefs({ ...prefs, dark: !prefs.dark })} icon={prefs.dark ? <Sun size={19} /> : <Moon size={19} />} label={prefs.dark ? "فاتح" : "داكن"} />
            <RailBtn onClick={() => setDialog("profile")} icon={<Settings size={19} />} label="بياناتي" />
            <RailBtn onClick={logout} icon={<LogOut size={19} />} label="خروج" />
          </nav>
          {view === "chats" && (
          <div className={`${current ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
            <Sidebar
              profile={profile} convs={convs} currentId={current?.id} unread={unread} onlineIds={onlineIds}
              dark={prefs.dark} onToggleDark={() => setPrefs({ ...prefs, dark: !prefs.dark })}
              onOpen={openConv}
              actions={{
                findUser: () => setDialog("findUser"),
                findGroup: () => setDialog("findGroup"),
                newGroup: () => setDialog("newGroup"),
                joinCode: () => setDialog("joinCode"),
                profile: () => setDialog("profile"),
                logout,
              }}
            />
          </div>
          )}
          <main className={`${view === "social" || current ? "flex" : "hidden md:flex"} flex-1 min-w-0 h-full flex-col`}>
            {view === "social" ? (
              <Feed meId={me.id} myName={profile?.display_name || "أنا"} onMessage={messageUser} onOpenConv={openConvById} />
            ) : current ? (
              <ChatView
                conv={current} meId={me.id} profile={profile} msgs={msgs} names={names} prefs={prefs}
                typingName={typingName} otherOnline={otherOnline}
                onSend={sendMsg} onTyping={onTyping}
                onBack={() => { setCurrent(null); currentRef.current = null; }}
                onInvite={() => setDialog("invite")}
                onDelete={deleteMsg}
              />
            ) : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4 text-center px-6 wp-dots">
                <Logo size={110} />
                <h2 className="font-display font-black text-3xl m-0">
                  دردش على <span className="text-grape-500">موجتك</span> 🎶
                </h2>
                <p className="text-grape-400 dark:text-grape-300/60 m-0 max-w-sm leading-relaxed">
                  اختار محادثة من القائمة، أو دوّر على حد برقمه، أو اعمل مجموعة جديدة وابدأ الـ Vibe.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Btn onClick={() => setDialog("findUser")} className="flex items-center gap-2"><UserSearch size={16} /> بحث برقم</Btn>
                  <Btn variant="sec" onClick={() => setDialog("newGroup")} className="flex items-center gap-2"><Plus size={16} /> مجموعة جديدة</Btn>
                  <Btn variant="sec" onClick={() => setDialog("findGroup")} className="flex items-center gap-2"><Search size={16} /> مجموعات عامة</Btn>
                  <Btn variant="sec" onClick={() => setView("social")} className="flex items-center gap-2"><Globe size={16} /> استكشف الساحة</Btn>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-grape-300 dark:text-grape-300/40 mt-6">
                  <MessageCircleHeart size={14} /> رسايلك متزامنة لحظياً على كل أجهزتك
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* المودالات */}
      {dialog === "findUser" && <FindUserDialog onClose={() => setDialog(null)} onJoined={onJoined} onDev={openDev} profile={profile} />}
      {dialog === "findGroup" && <FindGroupDialog onClose={() => setDialog(null)} onJoined={onJoined} />}
      {dialog === "newGroup" && <NewGroupDialog onClose={() => setDialog(null)} onJoined={onJoined} profile={profile} />}
      {dialog === "joinCode" && <JoinCodeDialog onClose={() => setDialog(null)} onJoined={onJoined} />}
      {dialog === "invite" && current && <InviteDialog onClose={() => setDialog(null)} convId={current.id} />}
      {dialog === "profile" && me && (
        <ProfileDialog onClose={() => setDialog(null)} meId={me.id} profile={profile}
          onSaved={async () => { await loadProfile(me.id); }} prefs={prefs} setPrefs={setPrefs} />
      )}
      {forceName && me && (
        <ForceNameDialog meId={me.id} onDone={async () => { await loadProfile(me.id); setForceName(false); }} />
      )}

      {/* شريط التنقل السفلي — موبايل */}
      {me && booted && !(view === "chats" && current) && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white dark:bg-[#0d2724] border-t border-grape-100 dark:border-white/10 flex items-stretch justify-around px-2">
          {[
            { v: "chats" as const, icon: <MessagesSquare size={20} />, label: "الدردشات", badge: totalUnread },
            { v: "social" as const, icon: <Globe size={20} />, label: "الساحة", badge: 0 },
          ].map((b) => (
            <button key={b.v} onClick={() => setView(b.v)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition cursor-pointer ${view === b.v ? "text-grape-600 dark:text-grape-300" : "text-grape-400 dark:text-grape-300/50"}`}>
              <span className={`px-4 py-1 rounded-full transition ${view === b.v ? "bg-gradient-to-l from-grape-500/15 to-candy-500/15" : ""}`}>{b.icon}</span>
              {b.label}
              {!!b.badge && <span className="absolute top-1.5 right-[calc(50%-22px)] bg-candy-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center animate-pop">{b.badge}</span>}
            </button>
          ))}
          <button onClick={() => setDialog("profile")}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-grape-400 dark:text-grape-300/50 cursor-pointer">
            <span className="px-4 py-1"><Settings size={20} /></span>
            بياناتي
          </button>
        </nav>
      )}

      {/* الصيانة ولوحة المطوّر */}
      {maintActive && <Maintenance until={maint.until} msg={maint.msg} onDev={openDev} />}
      {devCode && <DevPanel code={devCode} onClose={closeDev} onMaintChange={pollStatus} />}
    </div>
    </CallLayer>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}