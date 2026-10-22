"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, AtSign, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { SafeUser } from "@/lib/auth-types";

export function AuthScreen({ mode }: { mode: "login" | "register" | "developer" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const isDeveloper = mode === "developer";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(isDeveloper ? "developer@midar.app" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json() as { error?: string; user?: SafeUser };
      if (!response.ok || !data.user) throw new Error(data.error ?? "تعذر إكمال الطلب");
      const destination = data.user.status === "pending" ? "/activate" : data.user.role === "developer" ? "/developer" : "/platform";
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الاتصال بالخادم");
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-[100svh] overflow-hidden bg-[#07100e] text-white lg:grid-cols-[1.02fr_.98fr]">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-1/3 size-[520px] rounded-full bg-lime-300/[0.06] blur-[120px]" />
      <motion.section initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-l border-white/[0.06] p-12 lg:flex xl:p-16">
        <Logo />
        <div className="relative z-10 max-w-xl">
          <div className="section-kicker">حساب واحد. صلاحيات واضحة.</div>
          <h1 className="mt-6 text-[clamp(3rem,5vw,5.8rem)] font-medium leading-[1.08] tracking-[-0.05em]">مسارك إلى السوق<br /><span className="text-white/30">يبدأ باسمك.</span></h1>
          <p className="mt-6 max-w-lg text-sm font-light leading-8 text-white/45">حساب شخصي محمي، سجل مستقل لكل مستخدم، وتفعيل يدوي بكود من أربعة أرقام لضمان أن كل متداول معروف لدى إدارة المنصة.</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[{ icon: LockKeyhole, text: "كلمة مرور مجزأة" }, { icon: ShieldCheck, text: "جلسة آمنة" }, { icon: CheckCircle2, text: "تفعيل إلزامي" }].map((item) => <div key={item.text} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><item.icon className="size-4 text-lime-300/60" /><div className="mt-3 text-[10px] text-white/40">{item.text}</div></div>)}
          </div>
        </div>
        <div className="relative z-10 text-[10px] text-white/25">مِدار — هوية مالية واضحة قبل أي أمر.</div>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 90, repeat: Infinity, ease: "linear" }} className="absolute -left-56 top-1/2 size-[650px] -translate-y-1/2 rounded-full border border-white/[0.055]"><span className="absolute right-16 top-16 size-2 rounded-full bg-lime-300 shadow-[0_0_25px_#b9f46a]" /><span className="absolute inset-20 rounded-full border border-dashed border-white/[0.045]" /><span className="absolute inset-40 rounded-full border border-white/[0.04]" /></motion.div>
      </motion.section>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="w-full max-w-md">
          <div className="mb-12 flex items-center justify-between lg:hidden"><Logo /><span className="text-[10px] text-lime-300/50">اتصال آمن</span></div>
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <span className="text-[10px] text-lime-300/60">{isDeveloper ? "منطقة خاصة بالمطور" : isRegister ? "حساب جديد" : "مرحباً بعودتك"}</span>
              <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{isDeveloper ? "دخول لوحة المطور" : isRegister ? "أنشئ حسابك في مِدار" : "سجّل دخولك إلى مِدار"}</h2>
              <p className="mt-4 text-xs font-light leading-7 text-white/40">{isDeveloper ? "هذه البوابة مخصصة لإدارة المستخدمين والأكواد والإيداعات وإعدادات المنصة." : isRegister ? "بعد التسجيل سيكون حسابك بانتظار كود التفعيل الذي يرسله المطور." : "لديك حساب مفعّل؟ البريد وكلمة المرور فقط يكفيان للدخول."}</p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {isRegister && <label className="block"><span className="mb-2 block text-[11px] text-white/50">الاسم الكامل</span><span className="relative block"><UserRound className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/25" /><input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="field py-4 pr-11" placeholder="اكتب اسمك كما تريد ظهوره" /></span></label>}
            <label className="block"><span className="mb-2 block text-[11px] text-white/50">البريد الإلكتروني</span><span className="relative block"><AtSign className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/25" /><input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field py-4 pr-11 font-mono" placeholder="name@example.com" dir="ltr" /></span></label>
            <label className="block"><span className="mb-2 flex items-center justify-between text-[11px] text-white/50"><span>كلمة المرور</span>{isRegister && <span className="text-[9px] text-white/25">8 خانات على الأقل</span>}</span><span className="relative block"><LockKeyhole className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/25" /><input type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : 6} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="field py-4 px-11 font-mono" placeholder="••••••••" dir="ltr" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>
            <AnimatePresence>{error && <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><p className="rounded-xl border border-red-300/10 bg-red-300/[0.06] px-4 py-3 text-[11px] leading-6 text-red-200/75">{error}</p></motion.div>}</AnimatePresence>
            <button disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl bg-lime-300 py-4 text-xs font-semibold text-[#0a130f] transition-all hover:bg-lime-200 disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}{busy ? "جارٍ التحقق..." : isDeveloper ? "دخول آمن للوحة المطور" : isRegister ? "إنشاء الحساب ومتابعة التفعيل" : "تسجيل الدخول"}</button>
          </form>

          {!isDeveloper && <div className="mt-6 text-center text-[11px] text-white/35">{isRegister ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"} <Link href={isRegister ? "/login" : "/register"} className="mr-2 text-lime-300/75 hover:text-lime-200">{isRegister ? "سجّل الدخول" : "أنشئ حساباً"}</Link></div>}
          {isDeveloper && <div className="mt-6 text-center"><Link href="/login" className="text-[11px] text-white/35 hover:text-white">العودة إلى دخول المستخدمين</Link></div>}
          <div className="mt-10 flex items-start gap-3 border-t border-white/[0.07] pt-5 text-[9px] leading-6 text-white/25"><ShieldCheck className="mt-1 size-3.5 shrink-0 text-lime-300/40" /> لا تشارك كلمة المرور أو كود التفعيل مع أي شخص غير المطور المعتمد. الجلسة محفوظة في كوكي محمي لا تقرأه الواجهة.</div>
        </motion.div>
      </section>
    </main>
  );
}
