import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Moon, Phone, Search, Sun, Type, UserPlus, Volume2, VolumeX, Wallpaper } from "lucide-react";
import { useCall } from "./CallLayer";
import { Avatar, Btn, CountrySelect, Field, Modal, useToast } from "./ui";
import { myDialOf, sb, showPhone, toIntl, validIntl, type Profile } from "../lib/sb";

/* ---------- بحث عن شخص برقم الموبايل ---------- */
export function FindUserDialog({ onClose, onJoined, onDev, profile }: {
  onClose: () => void;
  onJoined: (cid: string) => void;
  onDev: (code: string) => Promise<boolean>;
  profile: Profile | null;
}) {
  const toast = useToast();
  const { start: startCall } = useCall();
  const [dial, setDial] = useState(myDialOf(profile?.phone));
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<{ id: string; display_name?: string }[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setNote(""); setRes(null);
    const raw = phone.trim();
    if (/^\d{6}$/.test(raw) && (await onDev(raw))) { onClose(); return; }
    const p = toIntl(raw, dial);
    if (!validIntl(p)) return setNote("الرقم مش مظبوط");
    setBusy(true);
    const { data, error } = await sb.rpc("search_users_by_phone", { p });
    setBusy(false);
    if (error) return setNote(error.message);
    if (!data?.length) return setNote("مفيش حد بالرقم ده على التطبيق");
    setRes(data);
  }

  return (
    <Modal title="🔍 دوّر على حد برقمه" onClose={onClose}>
      <div className="flex gap-2">
        <CountrySelect value={dial} onChange={setDial} className="w-[45%]" />
        <Field dir="ltr" type="tel" inputMode="tel" placeholder="رقم الموبايل" value={phone}
          onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} className="text-left" />
      </div>
      <Btn onClick={go} disabled={busy} className="flex items-center justify-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} بحث
      </Btn>
      {note && <div className="text-sm text-grape-500 dark:text-grape-300 text-center">{note}</div>}
      {res?.map((u) => (
        <div key={u.id} className="flex items-center justify-between gap-2 py-2 border-b border-grape-100 dark:border-white/10 last:border-0">
          <div className="flex items-center gap-2.5">
            <Avatar name={u.display_name || "?"} size={38} />
            <span className="font-semibold text-sm">{u.display_name || showPhone(toIntl(phone, dial))}</span>
          </div>
          <div className="flex gap-1.5">
            <Btn variant="sec" className="px-2.5 py-1.5 text-xs flex items-center gap-1" title="اتصل بيه دلوقتي"
              onClick={() => startCall(u.id, u.display_name || "مستخدم", "voice")}>
              <Phone size={13} /> اتصال
            </Btn>
            <Btn className="px-3 py-1.5 text-xs" onClick={async () => {
              const { data: cid, error } = await sb.rpc("start_private_chat", { other: u.id });
              if (error) return toast(error.message);
              onJoined(cid);
            }}>محادثة</Btn>
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ---------- بحث المجموعات العامة ---------- */
export function FindGroupDialog({ onClose, onJoined }: { onClose: () => void; onJoined: (cid: string) => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ id: string; name: string }[] | null>(null);
  const [note, setNote] = useState("");

  async function go(query?: string) {
    setNote(""); setRes(null);
    const { data, error } = await sb.rpc("search_groups", { q: (query ?? q).trim() });
    if (error) return setNote(error.message);
    if (!data?.length) return setNote(query === "" ? "لسه مفيش مجموعات عامة — اعمل أول واحدة!" : "مفيش مجموعات بالاسم ده");
    setRes(data);
  }

  // كل المجموعات العامة تظهر أول ما تفتح
  useEffect(() => { go(""); /* eslint-disable-next-line */ }, []);

  return (
    <Modal title="🌐 المجموعات العامة" onClose={onClose}>
      <Field placeholder="اسم المجموعة" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <Btn onClick={() => go()} className="flex items-center justify-center gap-2"><Search size={16} /> بحث</Btn>
      {note && <div className="text-sm text-grape-500 dark:text-grape-300 text-center">{note}</div>}
      {res?.map((g) => (
        <div key={g.id} className="flex items-center justify-between gap-2 py-2 border-b border-grape-100 dark:border-white/10 last:border-0">
          <div className="flex items-center gap-2.5">
            <Avatar name={g.name} size={38} />
            <span className="font-semibold text-sm">{g.name}</span>
          </div>
          <Btn className="px-3 py-1.5 text-xs" onClick={async () => {
            const { error } = await sb.rpc("join_public_group", { cid: g.id });
            if (error) return toast(error.message);
            onJoined(g.id);
          }}>انضم</Btn>
        </div>
      ))}
    </Modal>
  );
}

/* ---------- إنشاء مجموعة ---------- */
export function NewGroupDialog({ onClose, onJoined, profile }: { onClose: () => void; onJoined: (cid: string) => void; profile: Profile | null }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [pub, setPub] = useState(false);
  const [phones, setPhones] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!name.trim()) return toast("اكتب اسم المجموعة");
    setBusy(true);
    const ids: string[] = [];
    for (const ph of phones.split(/[\s,،]+/).filter(Boolean)) {
      const p = toIntl(ph, myDialOf(profile?.phone));
      const { data } = validIntl(p) ? await sb.rpc("search_users_by_phone", { p }) : { data: null as any };
      if (data?.[0]) ids.push(data[0].id);
      else toast("مفيش حد بالرقم " + ph);
    }
    const { data: cid, error } = await sb.rpc("create_group", { g_name: name.trim(), member_ids: ids, g_public: pub });
    setBusy(false);
    if (error) return toast(error.message);
    onJoined(cid);
  }

  return (
    <Modal title="✨ مجموعة جديدة" onClose={onClose}>
      <Field placeholder="اسم المجموعة" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="w-4 h-4 accent-grape-500" />
        مجموعة عامة (تظهر في البحث)
      </label>
      <Field placeholder="أرقام الأعضاء (اختياري، مفصولة بمسافة)" value={phones} onChange={(e) => setPhones(e.target.value)} />
      <p className="text-xs text-grape-400 dark:text-grape-300/60 m-0 leading-relaxed">
        الأرقام من دولتك اكتبها عادي. لأي دولة تانية ابدأ بـ + وكود الدولة.
      </p>
      <Btn onClick={go} disabled={busy} className="flex items-center justify-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} إنشاء
      </Btn>
    </Modal>
  );
}

/* ---------- انضمام بكود ---------- */
export function JoinCodeDialog({ onClose, onJoined }: { onClose: () => void; onJoined: (cid: string) => void }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  return (
    <Modal title="🔗 انضم بكود دعوة" onClose={onClose}>
      <Field dir="ltr" placeholder="الكود" value={code} onChange={(e) => setCode(e.target.value)} className="text-center tracking-widest text-lg" />
      <Btn onClick={async () => {
        const { data: cid, error } = await sb.rpc("join_group_by_code", { c: code.trim() });
        if (error) return toast("الكود غلط أو منتهي");
        onJoined(cid);
      }}>انضم</Btn>
    </Modal>
  );
}

/* ---------- كود دعوة للمجموعة ---------- */
export function InviteDialog({ onClose, convId }: { onClose: () => void; convId: string }) {
  const toast = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <Modal title="🎟 كود الدعوة" onClose={onClose}>
      {!code ? (
        <Btn onClick={async () => {
          const { data, error } = await sb.rpc("create_invite", { cid: convId });
          if (error) return toast(error.message);
          setCode(data);
        }}>اعمل كود دعوة</Btn>
      ) : (
        <>
          <div dir="ltr" className="text-3xl font-bold text-center tracking-[.2em] py-4 rounded-2xl bg-grape-50 dark:bg-white/5 text-grape-700 dark:text-grape-100 border-2 border-dashed border-grape-300 dark:border-white/20">
            {code}
          </div>
          <Btn variant="sec" className="flex items-center justify-center gap-2" onClick={() => {
            navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
          }}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "اتنسخ!" : "نسخ الكود"}
          </Btn>
          <p className="text-xs text-grape-400 dark:text-grape-300/60 m-0">الكود صالح 7 أيام. ابعته لأي حد ويدخل بيه من زر "كود دعوة".</p>
        </>
      )}
    </Modal>
  );
}

/* ---------- بياناتي + المظهر (جديد) ---------- */
export interface Prefs { dark: boolean; wp: string; font: "sm" | "base" | "lg"; sound: boolean }
export const WALLPAPERS = [
  { id: "wp-dots", label: "نقط" },
  { id: "wp-waves", label: "موجات" },
  { id: "wp-bubbles", label: "فقاعات" },
  { id: "wp-grid", label: "شبكة" },
];

export function ProfileDialog({ onClose, meId, profile, onSaved, prefs, setPrefs }: {
  onClose: () => void; meId: string; profile: Profile | null;
  onSaved: () => Promise<void>; prefs: Prefs; setPrefs: (p: Prefs) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(profile?.display_name || "");
  return (
    <Modal title="⚙️ بياناتي والمظهر" onClose={onClose}>
      <div dir="ltr" className="text-left text-sm text-grape-400 dark:text-grape-300">{showPhone(profile?.phone)}</div>
      <Field placeholder="الاسم" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <Btn onClick={async () => {
        const v = name.trim();
        if (!v) return;
        const { error } = await sb.from("profiles").update({ display_name: v }).eq("id", meId);
        if (error) return toast(error.message);
        await onSaved();
        toast("تم الحفظ ✅");
        onClose();
      }}>حفظ الاسم</Btn>

      <div className="h-px bg-grape-100 dark:bg-white/10 my-1" />
      <div className="font-display font-bold text-sm">🎨 المظهر</div>
      <div className="flex gap-2">
        <Btn variant={prefs.dark ? "sec" : "primary"} className="flex-1 flex items-center justify-center gap-2" onClick={() => setPrefs({ ...prefs, dark: false })}>
          <Sun size={16} /> فاتح
        </Btn>
        <Btn variant={prefs.dark ? "primary" : "sec"} className="flex-1 flex items-center justify-center gap-2" onClick={() => setPrefs({ ...prefs, dark: true })}>
          <Moon size={16} /> داكن
        </Btn>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-semibold mt-1"><Wallpaper size={15} /> خلفية المحادثة</div>
      <div className="grid grid-cols-4 gap-2">
        {WALLPAPERS.map((w) => (
          <button key={w.id} onClick={() => setPrefs({ ...prefs, wp: w.id })}
            className={`h-14 rounded-xl bg-grape-50 dark:bg-[#0a201d] ${w.id} border-2 text-[11px] font-semibold text-grape-600 dark:text-grape-200 cursor-pointer transition ${prefs.wp === w.id ? "border-grape-500" : "border-grape-200 dark:border-white/10"}`}>
            {w.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-sm font-semibold mt-1"><Type size={15} /> حجم خط الرسايل</div>
      <div className="flex gap-2">
        {(["sm", "base", "lg"] as const).map((f, i) => (
          <Btn key={f} variant={prefs.font === f ? "primary" : "sec"} className="flex-1" onClick={() => setPrefs({ ...prefs, font: f })}>
            {["صغير", "وسط", "كبير"][i]}
          </Btn>
        ))}
      </div>

      <Btn variant={prefs.sound ? "primary" : "sec"} className="flex items-center justify-center gap-2" onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })}>
        {prefs.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        {prefs.sound ? "نغمة الرسايل شغالة" : "نغمة الرسايل مقفولة"}
      </Btn>
    </Modal>
  );
}

/* ---------- فرض كتابة الاسم أول مرة ---------- */
export function ForceNameDialog({ meId, onDone }: { meId: string; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const go = async () => {
    const v = name.trim();
    if (!v) return;
    const { error } = await sb.from("profiles").update({ display_name: v }).eq("id", meId);
    if (error) return toast(error.message);
    onDone();
  };
  return (
    <Modal title="👋 أهلاً بيك في VibeChat">
      <p className="text-sm text-grape-500 dark:text-grape-300 m-0">اكتب اسمك اللي هيظهر للناس</p>
      <Field placeholder="الاسم" maxLength={40} value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()} autoFocus />
      <Btn onClick={go}>متابعة</Btn>
    </Modal>
  );
}