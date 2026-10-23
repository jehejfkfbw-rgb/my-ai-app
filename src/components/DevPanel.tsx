import { useCallback, useEffect, useState } from "react";
import { Activity, Ban, Check, Copy, Dice5, RefreshCw, Send, Sparkles, Trash2, Wrench, X } from "lucide-react";
import { Btn, Field, Modal, useToast } from "./ui";
import { FINISH_LOGIN_URL, SUPABASE_KEY, SUPABASE_URL, errText, fmtFull, rnd6, sb, toIntl, validIntl } from "../lib/sb";
import { SOCIAL_SQL, resetSocialMode, socialMode } from "../lib/social";

async function sysChecks() {
  const o: any = {};
  try {
    const t = performance.now();
    const r = await fetch(SUPABASE_URL + "/auth/v1/health", { headers: { apikey: SUPABASE_KEY } });
    o.auth = r.ok; o.authMs = Math.round(performance.now() - t);
  } catch { o.auth = false; }
  try {
    const t = performance.now();
    const { error } = await sb.rpc("public_status");
    o.db = !error; o.dbMs = Math.round(performance.now() - t);
  } catch { o.db = false; }
  try {
    const r = await fetch(FINISH_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
      body: "{}",
    });
    o.fn = r.status;
  } catch { o.fn = 0; }
  return o;
}

export default function DevPanel({ code, onClose, onMaintChange }: { code: string; onClose: () => void; onMaintChange: () => void }) {
  const toast = useToast();
  const [st, setSt] = useState<any>(null);
  const [rq, setRq] = useState<any>(null);
  const [us, setUs] = useState<any>(null);
  const [chk, setChk] = useState<any>({});
  const [note, setNote] = useState<string>("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [mPhone, setMPhone] = useState("");
  const [mCode, setMCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [socialOk, setSocialOk] = useState<boolean | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => { socialMode().then((m) => setSocialOk(m === "cloud")); }, []);

  const dev = useCallback(async (fn: string, args: Record<string, any> = {}) => {
    const { data, error } = await sb.rpc(fn, { p_code: code, ...args });
    if (error) { const m = errText(error); toast(m); setNote("⚠️ " + m); return null; }
    if (data && data.ok === false) {
      const m = data.error === "auth" ? "كود المطوّر غلط أو مقفول مؤقتاً (محاولات كتير)" : (data.error || "فشل");
      toast(m); setNote("⚠️ " + m); return null;
    }
    return data;
  }, [code, toast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, r, u, c] = await Promise.all([dev("dev_status"), dev("dev_requests"), dev("dev_users"), sysChecks()]);
    setChk(c);
    if (!s || !r || !u) { onClose(); return; }
    setSt(s); setRq(r); setUs(u);
    const init: Record<string, string> = {};
    (r.rows || []).forEach((x: any) => { if (x.code && !x.used) init[x.phone] = x.code; });
    setCodes((p) => ({ ...init, ...p }));
    setLoading(false);
  }, [dev, onClose]);

  useEffect(() => { refresh(); }, [refresh]);

  const mOn = st?.maintenance_until && new Date(st.maintenance_until) > new Date();
  const fnTxt = chk.fn === 400 ? "شغالة" : chk.fn === 401 ? "Verify JWT شغّال، اقفله" : chk.fn === 404 ? "مش موجودة" : "مش بترد (" + chk.fn + ")";

  const wa = (ph: string, c: string) =>
    window.open("https://wa.me/" + ph + "?text=" + encodeURIComponent("كود دخولك في VibeChat: " + c), "_blank");

  async function issue(ph: string, v: string) {
    if (!/^\d{6}$/.test(v)) return toast("اكتب كود من 6 أرقام");
    if (await dev("dev_issue_code", { p_phone: ph, p_new: v })) {
      setNote(`✅ تم تفعيل الكود ${v} للرقم +${ph}`);
      refresh();
    }
  }

  const Line = ({ ok, label, extra }: { ok: boolean; label: string; extra?: string }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-grape-100 dark:border-white/10 text-sm">
      <span>{ok ? "✅" : "❌"} {label}</span>
      <span className="text-xs text-grape-400" dir="ltr">{extra || ""}</span>
    </div>
  );

  return (
    <Modal wide title={<span className="flex items-center gap-2"><Wrench size={18} /> لوحة المطوّر</span>} onClose={onClose}>
      <div className="flex gap-2">
        <Btn variant="sec" onClick={refresh} className="flex items-center gap-1.5 text-xs"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> تحديث</Btn>
        <Btn variant="sec" onClick={onClose} className="flex items-center gap-1.5 text-xs"><X size={14} /> إغلاق</Btn>
      </div>

      {note && <div className="rounded-xl bg-grape-50 dark:bg-white/5 px-3 py-2.5 text-sm leading-relaxed animate-pop">{note}</div>}

      <div className="font-display font-bold flex items-center gap-1.5"><Activity size={15} /> حالة النظام</div>
      <Line ok={!!chk.auth} label="تسجيل الدخول (Auth)" extra={chk.authMs ? chk.authMs + " ms" : ""} />
      <Line ok={!!chk.db} label="قاعدة البيانات" extra={chk.dbMs ? chk.dbMs + " ms" : ""} />
      <Line ok={chk.fn === 400} label="دالة finish-login" extra={fnTxt} />
      {st && (
        <div className="text-xs text-grape-400 dark:text-grape-300/70">
          مستخدمين: {st.users} · محظورين: {st.banned} · طلبات جديدة: {st.pending} · رسايل آخر 24 ساعة: {st.messages24h}
        </div>
      )}

      <div className="font-display font-bold mt-1">إيقاف التطبيق للتحديثات</div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-grape-50 dark:bg-white/5 px-3 py-2.5 text-sm">
        <span>{mOn ? "🔴 متوقف لحد " + fmtFull(st.maintenance_until) : "🟢 شغال"}</span>
        <span className="flex gap-2">
          <Btn variant="danger" className="text-xs px-3 py-1.5" onClick={async () => {
            const msg = prompt("رسالة تظهر للمستخدمين (اختياري)", "بنعمل تحديثات على التطبيق وهنرجع قريب") || "";
            if (await dev("dev_maintenance", { p_hours: 24, p_msg: msg })) { toast("تم إيقاف التطبيق"); onMaintChange(); refresh(); }
          }}>إيقاف 24 ساعة</Btn>
          {mOn && <Btn className="text-xs px-3 py-1.5" onClick={async () => {
            if (await dev("dev_maintenance", { p_hours: 0, p_msg: "" })) { toast("تم تشغيل التطبيق"); onMaintChange(); refresh(); }
          }}>تشغيل</Btn>}
        </span>
      </div>

      <div className="font-display font-bold mt-1 flex items-center gap-1.5"><Sparkles size={15} /> تجهيز السوشيال (بوستات + حالات)</div>
      <div className="rounded-xl bg-grape-50 dark:bg-white/5 px-3 py-2.5 text-sm flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span>{socialOk === null ? "⏳ بنفحص…" : socialOk ? "🟢 جداول السوشيال متفعلة والشغل سحابي" : "🟡 لسه مش متفعلة — السوشيال شغال محلياً"}</span>
          <Btn variant="sec" className="text-xs px-2.5 py-1.5" onClick={async () => {
            resetSocialMode();
            const m = await socialMode();
            setSocialOk(m === "cloud");
            toast(m === "cloud" ? "السوشيال سحابي ✅" : "لسه محلي — نفّذ السكريبت في Supabase");
          }}>إعادة فحص</Btn>
        </div>
        <p className="text-xs text-grape-400 dark:text-grape-300/70 m-0 leading-relaxed">
          انسخ السكريبت والصقه مرة واحدة في <b dir="ltr">Supabase → SQL Editor → Run</b> وهيشتغل البوستات والحالات واللايكات لكل المستخدمين فوراً.
        </p>
        <Btn className="flex items-center justify-center gap-2 text-xs" onClick={() => {
          navigator.clipboard?.writeText(SOCIAL_SQL).then(() => { setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); });
        }}>
          {sqlCopied ? <Check size={14} /> : <Copy size={14} />} {sqlCopied ? "اتنسخ! الصقه في SQL Editor" : "نسخ سكريبت التفعيل"}
        </Btn>
      </div>

      <div className="font-display font-bold mt-1">تفعيل كود لرقم</div>
      <div className="flex gap-2">
        <Field dir="ltr" type="tel" inputMode="tel" placeholder="رقم الموبايل" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className="text-left" />
        <Field dir="ltr" maxLength={6} inputMode="numeric" placeholder="6 أرقام" value={mCode} onChange={(e) => setMCode(e.target.value)} className="text-center w-28" />
        <Btn variant="sec" onClick={() => setMCode(rnd6())} title="كود عشوائي"><Dice5 size={16} /></Btn>
        <Btn onClick={() => {
          const p = toIntl(mPhone, localStorage.getItem("dial") || "20");
          if (!validIntl(p) || !/^\d{6}$/.test(mCode.trim())) return toast("اكتب رقم صح وكود 6 أرقام");
          issue(p, mCode.trim());
        }}>تفعيل</Btn>
      </div>

      <div className="font-display font-bold mt-1">طلبات الدخول</div>
      {(rq?.rows || []).length === 0 && <div className="text-sm text-grape-400">مفيش طلبات</div>}
      {(rq?.rows || []).map((r: any) => {
        const ready = r.code && !r.used;
        const ph = String(r.phone);
        return (
          <div key={ph} className="rounded-2xl border border-grape-100 dark:border-white/10 p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <b dir="ltr">+{ph}</b>
              <span className="text-[11px] text-grape-400">{fmtFull(r.requested_at)}</span>
            </div>
            <div className="text-xs text-grape-400">
              {r.used ? "اتستخدم" + (r.name ? " · " + r.name : "") : ready ? `كود جاهز (محاولات غلط: ${r.attempts || 0})` : "طلب جديد"}
            </div>
            <div className="flex gap-2">
              <Field dir="ltr" maxLength={6} inputMode="numeric" placeholder="كود 6 أرقام" className="text-center"
                value={codes[ph] ?? ""} onChange={(e) => setCodes((p) => ({ ...p, [ph]: e.target.value }))} />
              <Btn variant="sec" onClick={() => setCodes((p) => ({ ...p, [ph]: rnd6() }))} title="كود عشوائي"><Dice5 size={16} /></Btn>
              <Btn onClick={() => issue(ph, (codes[ph] || "").trim())}>تفعيل</Btn>
            </div>
            <div className="flex gap-2">
              {ready && (
                <Btn variant="sec" className="flex items-center gap-1.5 text-xs flex-1" onClick={() => wa(ph, r.code)}>
                  <Send size={13} /> ابعت على واتساب
                </Btn>
              )}
              <Btn variant="sec" className="flex items-center gap-1.5 text-xs text-red-600" onClick={async () => {
                if (!confirm("تمسح الطلب ده؟")) return;
                if (await dev("dev_delete_request", { p_phone: ph })) refresh();
              }}><Trash2 size={13} /> حذف</Btn>
            </div>
            {note.startsWith("✅") && codes[ph] && (
              <Btn variant="ghost" className="text-xs" onClick={() => wa(ph, codes[ph])}><Send size={13} className="inline" /> ابعت الكود الجديد على واتساب</Btn>
            )}
          </div>
        );
      })}

      <div className="font-display font-bold mt-1">المستخدمين</div>
      {(us?.rows || []).length === 0 && <div className="text-sm text-grape-400">مفيش مستخدمين</div>}
      {(us?.rows || []).map((u: any) => (
        <div key={u.id} className="rounded-2xl border border-grape-100 dark:border-white/10 p-3 flex flex-col gap-2">
          <div className="text-sm">
            <b>{u.display_name || "—"}</b>{" "}
            <span dir="ltr" className="inline-block text-grape-400">+{u.phone || ""}</span>{" "}
            {u.is_banned && <span className="text-red-600 text-xs">{u.banned_until ? "🚫 محظور لحد " + fmtFull(u.banned_until) : "🚫 محظور دائم"}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[{ m: 60, t: "ساعة" }, { m: 1440, t: "24 س" }, { m: 10080, t: "7 أيام" }, { m: 0, t: "دائم" }].map((b) => (
              <Btn key={b.m} variant="danger" className="text-xs px-2.5 py-1.5 flex items-center gap-1" onClick={async () => {
                if (await dev("dev_ban", { p_user: u.id, p_minutes: b.m })) { toast("تم الحظر"); refresh(); }
              }}><Ban size={12} /> {b.t}</Btn>
            ))}
            {u.is_banned && (
              <Btn className="text-xs px-2.5 py-1.5" onClick={async () => {
                if (await dev("dev_unban", { p_user: u.id })) { toast("تم فك الحظر"); refresh(); }
              }}>فك الحظر</Btn>
            )}
          </div>
        </div>
      ))}
    </Modal>
  );
}