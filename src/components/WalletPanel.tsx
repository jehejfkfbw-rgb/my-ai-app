"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, Check, Clipboard, Copy, Download, FileCheck2, Landmark, LoaderCircle, LockKeyhole, ShieldAlert, Smartphone, XCircle } from "lucide-react";
import { csvCell, formatDate, formatEgp, formatMoney } from "@/lib/format";
import type { DepositView } from "@/lib/trading-types";
import { WALLETS } from "@/lib/wallets";

export interface DepositInput {
  amountEgp: number;
  walletNumber: string;
  senderNumber: string;
  transferReference: string;
}

function maskPhone(phone: string) {
  return `${phone.slice(0, 3)} •••• ${phone.slice(-2)}`;
}

export function WalletPanel({ deposits, onSubmit, onCancel }: {
  deposits: DepositView[];
  onSubmit: (input: DepositInput) => Promise<boolean>;
  onCancel: (id: number) => Promise<void>;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "center center"] });
  const firstX = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 90, 0]);
  const secondX = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : -90, 0]);
  const firstRotate = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 4, 0]);
  const secondRotate = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : -4, 0]);
  const [selectedWallet, setSelectedWallet] = useState<string>(WALLETS[0].number);
  const [copied, setCopied] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  async function copyNumber(number: string) {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(number);
      window.setTimeout(() => setCopied((current) => current === number ? null : current), 1800);
    } catch {
      setCopied(null);
    }
  }

  async function submit() {
    setBusy(true);
    const success = await onSubmit({ amountEgp: Number(amount), walletNumber: selectedWallet, senderNumber, transferReference: reference });
    setBusy(false);
    if (success) {
      setAmount("");
      setSenderNumber("");
      setReference("");
    }
  }

  function exportRequests() {
    const rows = [
      ["رقم الطلب", "المبلغ بالجنيه", "محفظة الاستلام", "الرقم المرسل", "رقم العملية", "الحالة", "التاريخ"],
      ...deposits.map((item) => [item.id, item.amountEgp, item.walletNumber, item.senderNumber, item.transferReference, item.status, item.createdAt]),
    ];
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "midar-wallet-requests.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const cardStyles = [
    { x: firstX, rotate: firstRotate },
    { x: secondX, rotate: secondRotate },
  ];

  return (
    <section ref={sectionRef} id="wallet" className="relative scroll-mt-20 overflow-hidden bg-[#e9ede4] px-4 py-20 text-[#102019] sm:px-6 lg:py-28">
      <div className="wallet-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="absolute -left-32 top-20 size-96 rounded-full bg-lime-300/25 blur-[110px]" />
      <div className="relative mx-auto max-w-[1380px]">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="grid gap-6 lg:grid-cols-[1fr_.8fr] lg:items-end">
          <div><div className="section-kicker !border-emerald-900/20 !text-emerald-900/50">تحويل المحافظ / 02</div><h2 className="mt-4 max-w-3xl text-[clamp(2.2rem,4.5vw,4.6rem)] font-medium leading-[1.12] tracking-[-0.045em]">حوّل من محفظتك.<br /><span className="text-emerald-900/35">وسجّل العملية بوضوح.</span></h2></div>
          <p className="max-w-lg text-sm font-light leading-8 text-emerald-950/55">اختر الرقم الذي حوّلت إليه، ثم أرسل رقم العملية للمراجعة. الطلب يُحفظ فوراً في سجلك، لكن إثبات الاستلام والمراجعة يتمان خارج هذه المنصة.</p>
        </motion.div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-4">
            {WALLETS.map((wallet, index) => {
              const active = selectedWallet === wallet.number;
              return (
                <motion.button
                  key={wallet.number}
                  style={cardStyles[index]}
                  onClick={() => setSelectedWallet(wallet.number)}
                  className={`relative w-full overflow-hidden rounded-[24px] border p-5 text-right transition-colors sm:p-6 ${active ? "border-emerald-900 bg-emerald-950 text-white shadow-[0_25px_70px_rgba(16,32,25,.15)]" : "border-emerald-950/10 bg-white/45 text-emerald-950 hover:bg-white/70"}`}
                >
                  {active && <motion.span layoutId="wallet-active" className="absolute inset-x-0 top-0 h-[3px] bg-lime-300" />}
                  <div className="flex items-start justify-between gap-4"><span className={`grid size-11 place-items-center rounded-xl border ${active ? "border-white/10 bg-white/[0.06] text-lime-300" : "border-emerald-950/10 bg-emerald-950/[0.04]"}`}><Smartphone className="size-5" strokeWidth={1.5} /></span><span className={`font-mono text-[10px] ${active ? "text-white/30" : "text-emerald-950/30"}`}>{wallet.short} / WALLET</span></div>
                  <div className="mt-6 text-xs opacity-50">{wallet.label}</div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="font-mono text-[clamp(1.4rem,3vw,2rem)] tracking-[0.06em]" dir="ltr">{wallet.number}</span><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); void copyNumber(wallet.number); }} onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); void copyNumber(wallet.number); } }} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] ${active ? "border-white/10 text-white/60 hover:bg-white/5" : "border-emerald-950/10 text-emerald-950/55"}`}><AnimatePresence mode="wait" initial={false}>{copied === wallet.number ? <motion.span key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }}><Check className="size-3.5 text-lime-500" /></motion.span> : <motion.span key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }}><Copy className="size-3.5" /></motion.span>}</AnimatePresence>{copied === wallet.number ? "تم النسخ" : "نسخ الرقم"}</span></div>
                  <div className={`mt-4 border-t pt-3 text-[10px] ${active ? "border-white/[0.07] text-white/35" : "border-emerald-950/[0.07] text-emerald-950/40"}`}>{wallet.note}</div>
                </motion.button>
              );
            })}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-3 gap-2 pt-2">
              {[{ icon: Copy, text: "انسخ الرقم" }, { icon: Landmark, text: "حوّل من تطبيقك" }, { icon: FileCheck2, text: "سجّل المرجع" }].map((step, index) => <div key={step.text} className="rounded-xl border border-emerald-950/[0.08] bg-white/30 p-3 text-center"><step.icon className="mx-auto size-4 text-emerald-900/45" /><div className="mt-2 text-[9px] text-emerald-950/50"><span className="ml-1 font-mono">0{index + 1}</span>{step.text}</div></div>)}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.75 }} className="rounded-[26px] border border-emerald-950/10 bg-[#f7f8f3] p-5 shadow-[0_25px_80px_rgba(16,32,25,.07)] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><span className="text-[10px] text-emerald-900/40">طلب مراجعة تحويل</span><h3 className="mt-2 text-xl font-medium">بيانات العملية</h3></div><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-lime-300"><Clipboard className="size-4" /></span></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-2 block text-[11px] text-emerald-950/50">المبلغ المحوّل (جنيه مصري)</span><input type="number" inputMode="decimal" min="50" max="1000000" value={amount} onChange={(event) => setAmount(event.target.value)} className="field-light" placeholder="مثال: 1000" dir="ltr" /></label>
              <label><span className="mb-2 block text-[11px] text-emerald-950/50">رقم المحفظة المُرسِلة</span><input type="tel" inputMode="numeric" maxLength={11} value={senderNumber} onChange={(event) => setSenderNumber(event.target.value.replace(/\D/g, ""))} className="field-light font-mono" placeholder="01XXXXXXXXX" dir="ltr" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-[11px] text-emerald-950/50">رقم عملية التحويل / المرجع</span><input type="text" maxLength={80} value={reference} onChange={(event) => setReference(event.target.value)} className="field-light font-mono" placeholder="أدخل المرجع الظاهر في إيصال المحفظة" dir="ltr" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-[11px] text-emerald-950/50">المحفظة التي حوّلت إليها</span><select value={selectedWallet} onChange={(event) => setSelectedWallet(event.target.value)} className="field-light font-mono" dir="ltr">{WALLETS.map((wallet) => <option key={wallet.number} value={wallet.number}>{wallet.number}</option>)}</select></label>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-800/10 bg-amber-100/45 p-3 text-[10px] leading-6 text-amber-950/65"><ShieldAlert className="mt-1 size-4 shrink-0" /><p>لا تشارك رمز التحقق OTP أو كلمة مرور محفظتك مع أي شخص. تحقق من رقم المستلم داخل تطبيق محفظتك قبل تأكيد أي تحويل.</p></div>
            <button disabled={busy || !amount || !senderNumber || reference.trim().length < 6} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-950 py-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-35">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}{busy ? "جارٍ حفظ الطلب..." : "حفظ الطلب للمراجعة"}</button>
            <p className="mt-3 flex items-start gap-2 text-[9px] leading-5 text-emerald-950/40"><LockKeyhole className="mt-0.5 size-3 shrink-0" /> هذا الزر لا ينفذ تحويلاً مالياً ولا يؤكد استلامه. يسجل بيانات الإيصال فقط، ولا يضيف أي رصيد تلقائياً.</p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mt-6 overflow-hidden rounded-[24px] border border-emerald-950/10 bg-white/35">
          <div className="flex items-center justify-between border-b border-emerald-950/[0.08] p-5"><div><h3 className="text-sm font-medium">سجل طلبات المراجعة</h3><p className="mt-1 text-[10px] text-emerald-950/40">الطلبات المحفوظة في حسابك — {deposits.length}</p></div>{deposits.length > 0 && <button onClick={exportRequests} className="inline-flex items-center gap-2 rounded-lg border border-emerald-950/10 px-3 py-2 text-[10px] text-emerald-950/55 hover:bg-white/40"><Download className="size-3.5" /> تصدير</button>}</div>
          {deposits.length > 0 ? <div className="overflow-x-auto"><table className="light-table min-w-[850px]"><thead><tr><th>الطلب</th><th>المبلغ</th><th>إلى محفظة</th><th>من رقم</th><th>مرجع التحويل</th><th>الحالة</th><th /></tr></thead><tbody><AnimatePresence initial={false}>{deposits.map((item) => <motion.tr layout key={item.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><td><span className="font-mono" dir="ltr">DEP-{item.id}</span><span className="mt-1 block text-[9px] opacity-40">{formatDate(item.createdAt)}</span></td><td className="font-medium" dir="ltr">{formatEgp(item.amountEgp)}{item.creditedUsd > 0 && <span className="mt-1 block text-[9px] text-emerald-700/60">+{formatMoney(item.creditedUsd)}</span>}</td><td className="font-mono" dir="ltr">{item.walletNumber}</td><td className="font-mono" dir="ltr">{maskPhone(item.senderNumber)}</td><td className="max-w-40 truncate font-mono" dir="ltr" title={item.transferReference}>{item.transferReference}</td><td><span className={`deposit-status-${item.status}`}>{item.status === "pending" ? "قيد المراجعة" : item.status === "cancelled" ? "ملغي" : item.status === "approved" ? "معتمد" : "مرفوض"}</span>{item.note && <span className="mt-2 block max-w-48 text-[8px] leading-4 text-emerald-950/40" title={item.note}>{item.note}</span>}</td><td>{item.status === "pending" ? <button onClick={() => onCancel(item.id)} className="inline-flex items-center gap-1.5 text-[10px] text-red-800/50 hover:text-red-800"><XCircle className="size-3.5" /> إلغاء الطلب</button> : null}</td></motion.tr>)}</AnimatePresence></tbody></table></div> : <div className="grid min-h-40 place-items-center p-8 text-center"><div><FileCheck2 className="mx-auto size-6 text-emerald-950/20" /><p className="mt-3 text-xs text-emerald-950/45">لا توجد طلبات مسجلة بعد.</p><p className="mt-1 text-[10px] text-emerald-950/30">بعد حفظ أول طلب سيظهر هنا مع حالته ومرجعه.</p></div></div>}
        </motion.div>
      </div>
    </section>
  );
}
