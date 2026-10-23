import { useEffect, useRef, useState } from "react";
import { ArrowRight, KeyRound, Loader2, PhoneCall, RefreshCw, ShieldCheck } from "lucide-react";
import Logo from "./Logo";
import { Btn, CountrySelect, Field } from "./ui";
import { FINISH_LOGIN_URL, SUPABASE_KEY, errText, sb, toIntl, validIntl } from "../lib/sb";

export default function Auth({ onDev }: { onDev: (code: string) => Promise<boolean> }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [dial, setDial] = useState(localStorage.getItem("dial") || "20");
  const [phone, setPhone] = useState("");
  const [pendingDigits, setPendingDigits] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifying = useRef(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function sendCode() {
    setMsg("");
    const raw = phone.trim();
    if (/^\d{6}$/.test(raw)) {
      setBusy(true);
      const ok = await onDev(raw);
      setBusy(false);
      if (ok) { setPhone(""); return; }
      return setMsg("الرقم مش مظبوط، راجعه تاني");
    }
    const digits = toIntl(raw, dial);
    if (!validIntl(digits)) return setMsg("الرقم مش مظبوط، راجعه تاني");
    setBusy(true);
    const { error } = await sb.rpc("request_login_code", { p_phone: digits });
    setBusy(false);
    if (error) return setMsg(errText(error));
    setPendingDigits(digits);
    localStorage.setItem("dial", dial);
    setOtp(Array(6).fill(""));
    setStep(2);
    setLeft(40);
    setTimeout(() => otpRefs.current[0]?.focus(), 60);
    setMsg("طلبك وصل لفريق الدعم، هيبعتولك الكود على رقمك خلال شوية.");
  }

  async function resend() {
    if (!pendingDigits) return;
    setMsg("");
    const { error } = await sb.rpc("request_login_code", { p_phone: pendingDigits });
    if (error) return setMsg(errText(error));
    setLeft(40);
    setMsg("اتبعت طلب تاني لفريق الدعم ✅");
  }

  async function verify(code?: string) {
    if (verifying.current) return;
    setMsg("");
    const token = code ?? otp.join("");
    if (token.length < 6) return setMsg("اكتب الكود كامل (6 أرقام)");
    if (!pendingDigits) return setMsg("ابدأ من أول: اكتب رقمك واطلب الكود");
    verifying.current = true;
    setBusy(true);
    try {
      const res = await fetch(FINISH_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
        body: JSON.stringify({ phone: pendingDigits, code: token }),
      });
      const raw = await res.text();
      let body: any = {};
      try { body = JSON.parse(raw); } catch { /* ignore */ }
      if (!res.ok) {
        const m = body.error || body.message || "";
        if (res.status === 401 || /jwt/i.test(m)) setMsg("السيرفر رفض الطلب (401). لازم تقفل خيار Verify JWT في دالة finish-login من لوحة Supabase، وبعدها جرب تاني.");
        else if (res.status === 404) setMsg("دالة finish-login مش موجودة على السيرفر.");
        else if (res.status >= 500) setMsg("في مشكلة جوه الدالة على السيرفر (" + res.status + "): " + (m || raw.slice(0, 120)));
        else setMsg((body.error || "الكود غلط أو انتهت صلاحيته") + " (" + res.status + ")");
        setOtp(Array(6).fill(""));
        otpRefs.current[0]?.focus();
        return;
      }
      if (!body.email || !body.password) return setMsg("الدالة ردّت من غير بيانات الدخول (email/password). راجع كود finish-login.");
      const { error } = await sb.auth.signInWithPassword({ email: body.email, password: body.password });
      if (error) {
        setMsg(errText(error));
        setOtp(Array(6).fill(""));
      }
    } catch {
      setMsg("مفيش اتصال بالدالة (غالباً CORS أو النت). افتح التطبيق من لينك مرفوع وراجع إعدادات finish-login.");
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every((x) => x)) verify(next.join(""));
  }

  return (
    <div className="min-h-full relative overflow-hidden bg-grape-950 flex items-center justify-center p-4">
      {/* خلفية حية: موجات وتوهج */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,153,138,.45),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,107,74,.3),transparent_50%)]" />
      <div className="absolute bottom-0 inset-x-0 h-40 flex items-end justify-center gap-1.5 opacity-25 pointer-events-none" dir="ltr">
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 rounded-t-full bg-gradient-to-t from-grape-500 to-candy-400 animate-eq${(i % 5) + 1}`}
            style={{ height: `${25 + ((i * 37) % 70)}%` }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-sm animate-rise">
        <div className="flex flex-col items-center gap-2 mb-5">
          <Logo size={92} />
          <h1 className="font-display font-black text-4xl text-white m-0 tracking-tight" dir="ltr">
            Vibe<span className="text-candy-400">Chat</span>
          </h1>
          <p className="text-grape-200 text-sm m-0">دردش على موجتك 🎶</p>
        </div>

        <div className="bg-white dark:bg-[#10312c] rounded-3xl p-6 shadow-2xl shadow-grape-950/60 flex flex-col gap-4">
          {step === 1 ? (
            <>
              <div className="flex items-center gap-2 text-grape-700">
                <PhoneCall size={18} />
                <span className="font-display font-bold">ادخل برقم موبايلك</span>
              </div>
              <div className="flex gap-2">
                <CountrySelect value={dial} onChange={setDial} className="w-[45%]" />
                <Field
                  dir="ltr" type="tel" inputMode="tel" placeholder="رقم الموبايل" autoComplete="tel-national"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  className="text-left flex-1"
                />
              </div>
              <Btn onClick={sendCode} disabled={busy} className="flex items-center justify-center gap-2 py-3">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                إرسال كود التأكيد
              </Btn>
              <p className="text-xs text-grape-400 dark:text-grape-300/60 text-center m-0 leading-relaxed">
                متاح لمصر والسعودية واليمن والعراق والأردن — الكود بيوصلك من فريق الدعم
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-grape-700 dark:text-grape-100">
                <ShieldCheck size={18} />
                <span className="font-display font-bold">اتأكد إنك صاحب الرقم</span>
              </div>
              <div className="text-sm text-grape-500 dark:text-grape-300 text-center">
                اتبعت كود على <b dir="ltr" className="inline-block text-grape-700 dark:text-white">+{pendingDigits}</b>
              </div>
              <div className="flex gap-2 justify-center" dir="ltr">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    value={v}
                    maxLength={2}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                    }}
                    onPaste={(e) => {
                      const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
                      if (!t) return;
                      e.preventDefault();
                      const next = Array(6).fill("");
                      [...t].forEach((d, k) => (next[k] = d));
                      setOtp(next);
                      otpRefs.current[Math.min(t.length, 5)]?.focus();
                      if (t.length === 6) verify(t);
                    }}
                    className="w-11 h-13 text-center text-2xl font-bold rounded-xl border-2 border-grape-200 focus:border-grape-500 bg-grape-50 dark:bg-white/5 dark:border-white/15 dark:text-white transition"
                  />
                ))}
              </div>
              <Btn onClick={() => verify()} disabled={busy} className="flex items-center justify-center gap-2 py-3">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} className="rotate-180" />}
                دخول
              </Btn>
              <div className="flex justify-between">
                <Btn variant="ghost" onClick={resend} disabled={left > 0} className="flex items-center gap-1.5 text-xs">
                  <RefreshCw size={14} />
                  {left > 0 ? `إعادة الإرسال (${left})` : "إعادة الإرسال"}
                </Btn>
                <Btn variant="ghost" onClick={() => { setMsg(""); setStep(1); }} className="text-xs">تغيير الرقم</Btn>
              </div>
            </>
          )}
          {msg && (
            <div className={`text-sm rounded-xl px-3 py-2.5 leading-relaxed animate-pop ${/وصل|✅/.test(msg) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}