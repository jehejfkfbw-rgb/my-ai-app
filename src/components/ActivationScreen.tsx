"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, LoaderCircle, LogOut, MailCheck, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { SafeUser } from "@/lib/auth-types";

export function ActivationScreen({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function updateDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      const pasted = clean.slice(0, 4).split("");
      const next = ["", "", "", ""].map((_, position) => pasted[position] ?? "");
      setDigits(next);
      inputs.current[Math.min(3, pasted.length)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 3) inputs.current[index + 1]?.focus();
  }

  async function activate(event?: React.FormEvent) {
    event?.preventDefault();
    const code = digits.join("");
    if (code.length !== 4) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر التفعيل");
      router.replace("/platform");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الاتصال");
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#07100e] px-4 py-10 text-white">
      <div className="hero-grid absolute inset-0 opacity-50" /><div className="absolute left-1/2 top-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" /><div className="absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-lime-300/[0.08]" />
      <motion.section initial={{ opacity: 0, y: 25, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative z-10 w-full max-w-lg rounded-[28px] border border-white/[0.09] bg-[#0d1815]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-xl sm:p-9">
        <div className="flex items-center justify-between"><Logo /><button onClick={logout} className="inline-flex items-center gap-2 text-[10px] text-white/35 hover:text-white"><LogOut className="size-3.5" /> خروج</button></div>
        <div className="mt-10 grid size-14 place-items-center rounded-2xl border border-lime-300/15 bg-lime-300/[0.07] text-lime-300"><MailCheck className="size-6" strokeWidth={1.5} /></div>
        <span className="mt-6 block text-[10px] text-lime-300/55">خطوة واحدة متبقية</span>
        <h1 className="mt-3 text-3xl font-medium">فعّل حسابك يا {user.name.split(" ")[0]}</h1>
        <p className="mt-4 text-xs font-light leading-7 text-white/42">أدخل الكود المكوّن من أربعة أرقام الذي أرسله لك المطور. الحساب مسجل بالبريد <span className="font-mono text-white/65" dir="ltr">{user.email}</span> ولن يمكنك الدخول إلى التداول قبل التفعيل.</p>
        <form onSubmit={activate} className="mt-8">
          <div className="flex justify-center gap-3" dir="ltr">{digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} value={digit} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus(); }} onPaste={(event) => { event.preventDefault(); updateDigit(index, event.clipboardData.getData("text")); }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={index === 0 ? 4 : 1} aria-label={`الرقم ${index + 1}`} className="h-16 w-14 rounded-xl border border-white/10 bg-black/20 text-center font-mono text-2xl text-lime-200 outline-none transition-all focus:border-lime-300/45 focus:bg-lime-300/[0.04] sm:w-16" />)}</div>
          <AnimatePresence>{error && <motion.p role="alert" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-red-300/[0.06] p-3 text-center text-[10px] leading-6 text-red-200/75">{error}</motion.p>}</AnimatePresence>
          <button disabled={busy || digits.join("").length !== 4} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-lime-300 py-4 text-xs font-semibold text-[#0a130f] disabled:opacity-35">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{busy ? "جارٍ التحقق من الكود..." : "تفعيل الحساب والدخول"}</button>
        </form>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[10px] leading-6 text-white/35"><ShieldCheck className="mt-1 size-4 shrink-0 text-lime-300/45" /> لم يصلك الكود؟ تظهر طلبات التفعيل الجديدة للمطور في لوحته. اطلب منه إنشاء كود وإرساله إليك؛ لا يوجد إرسال بريدي تلقائي في هذه النسخة.</div>
      </motion.section>
    </main>
  );
}
