"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpLeft, BookOpen, Calculator, ChevronDown, Gauge, Layers3, MoveDownLeft, Scale, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { formatMoney, formatPrice, formatQuantity } from "@/lib/format";
import type { DashboardState } from "@/lib/trading-types";

const lessons = [
  {
    number: "01", icon: Layers3, title: "أمر السوق يشتري التنفيذ، لا السعر",
    text: "يُنفّذ أمر السوق فوراً عند أفضل سعر متاح داخل النموذج. لذلك يظهر سعر الشراء أعلى قليلاً من السعر المتوسط، وسعر البيع أدنى منه بمقدار السبريد، ثم يضاف أثر الانزلاق والعمولة.",
    detail: "استخدمه عندما تكون أولويتك الدخول أو الخروج، وراجع القيمة النهائية في سجل الأمر.",
  },
  {
    number: "02", icon: Scale, title: "أمر الحدّ يضبط السعر، ولا يعد بالتنفيذ",
    text: "حدّ الشراء لا يتحقق إلا عندما يصل سعر الطلب إلى حدّك أو أقل، وحدّ البيع عندما يصل سعر العرض إلى حدّك أو أعلى. تحجز مِدار القوة الشرائية أو الكمية حتى لا تتجاوز مواردك بأوامر متعددة.",
    detail: "يمكنك إلغاء الأمر المفتوح، واختيار صلاحية يوم أو الإبقاء عليه حتى الإلغاء.",
  },
  {
    number: "03", icon: Gauge, title: "حجم المركز قرار قبل أن يكون رقماً",
    text: "ابدأ بالمبلغ الذي تقبل خسارته، لا بالكمية التي ترغب في شرائها. المسافة بين الدخول والوقف تحدد مخاطرة الوحدة، وبقسمتها على ميزانية المخاطرة تحصل على حجم أولي منضبط.",
    detail: "الحاسبة لا تراعي الفجوات السعرية أو السيولة؛ الوقف ليس ضماناً لسعر الخروج.",
  },
];

const faqs = [
  { q: "هل الأسعار والصفقات في مِدار حقيقية؟", a: "الأسعار في هذه النسخة استرشادية ومولّدة بمحرك داخلي، والصفقات تُسجّل فعلياً في دفتر حسابك وقاعدة البيانات فقط. لا يتم إرسال أي أمر إلى بورصة أو وسيط، ولا نعرض الأسعار على أنها بثّ سوقي حي." },
  { q: "كيف يُحسب ربحي أو خسارتي؟", a: "الربح غير المحقق هو القيمة السوقية الحالية للمركز ناقص كمية المركز مضروبة في متوسط التكلفة. عند البيع يسجّل المحرك الربح المحقق من فرق سعر التنفيذ ومتوسط التكلفة بعد خصم عمولة البيع. أما إجمالي أداء الحساب فيقارن القيمة الحالية بصافي الإيداعات والتسويات المعتمدة." },
  { q: "هل تسجيل تحويل المحفظة يضيف رصيداً فوراً؟", a: "لا. التحويل نفسه يتم من تطبيق محفظتك إلى الرقم الذي اخترته. النموذج يسجل المبلغ ورقم العملية للمراجعة فقط، ولا يؤكد استلام الأموال ولا يغير رصيد التداول تلقائياً. يمكنك إلغاء طلب المراجعة ما دام قيد الانتظار." },
  { q: "لماذا تختلف القوة الشرائية عن النقد الكلي؟", a: "عندما يكون لديك أمر حدّ شراء مفتوح، يحجز المحرك قيمته التقديرية وعمولته حتى لا تستخدم المال نفسه في أوامر متداخلة. القوة الشرائية هي النقد بعد هذا الحجز، بينما قيمة المحفظة تشمل النقد الكلي والقيمة السوقية للمراكز." },
  { q: "هل يمكنني حفظ سجلي؟", a: "نعم. يمكنك تصدير الأوامر وكشف الحساب وطلبات المحفظة بصيغة CSV. تُحفظ الأوامر والمراكز وقائمة المراقبة في PostgreSQL لكل مستخدم على حدة، وتُحفظ تفضيلات الرسم والأداة على جهازك. التسويات المالية لا تتم إلا من لوحة المطور مع سبب وسجل تدقيق." },
];

export function LearnSection({ state }: { state: DashboardState }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [equity, setEquity] = useState(state.account.equity.toFixed(2));
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const equityNumber = Number(equity) || 0;
  const riskNumber = Number(riskPct) || 0;
  const entryNumber = Number(entry) || 0;
  const stopNumber = Number(stop) || 0;
  const riskBudget = equityNumber * Math.max(0, riskNumber) / 100;
  const unitRisk = Math.abs(entryNumber - stopNumber);
  const invalidStop = side === "buy" ? stopNumber >= entryNumber : stopNumber <= entryNumber;
  const validInputs = equityNumber > 0 && riskNumber > 0 && riskNumber <= 100 && entryNumber > 0 && !invalidStop;
  const quantity = validInputs && unitRisk > 0 && riskBudget > 0 ? riskBudget / unitRisk : 0;
  const notional = quantity * entryNumber;
  const portfolioPct = equityNumber > 0 ? (notional / equityNumber) * 100 : 0;
  const inputError = equityNumber <= 0 || entryNumber <= 0
    ? "أدخل رأس مال وسعر دخول أكبر من صفر."
    : riskNumber <= 0 || riskNumber > 100
      ? "نسبة المخاطرة يجب أن تكون أكبر من صفر ولا تتجاوز 100%."
      : invalidStop
        ? (side === "buy" ? "لصفقة شراء، يجب أن يكون الوقف أقل من سعر الدخول." : "لصفقة بيع، يجب أن يكون الوقف أعلى من سعر الدخول.")
        : portfolioPct > 100
          ? "قيمة المركز تتجاوز رأس المال؛ راجع المدخلات أو المسافة إلى الوقف."
          : null;

  return (
    <>
      <section id="learn" className="scroll-mt-20 bg-[#08110f] px-4 py-20 text-white sm:px-6 lg:py-28">
        <div className="mx-auto max-w-[1380px]">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="max-w-3xl"><div className="section-kicker">معرفة قبل المخاطرة / 03</div><h2 className="mt-4 text-[clamp(2.2rem,4.5vw,4.5rem)] font-medium leading-[1.13] tracking-[-0.045em]">القرار الأفضل يبدأ<br /><span className="text-white/30">بفهم ما يمكن أن يحدث.</span></h2></motion.div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {lessons.map((lesson, index) => <motion.article key={lesson.number} initial={{ opacity: 0, y: 45, rotate: index === 0 ? -1 : index === 2 ? 1 : 0 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ delay: index * 0.1, duration: 0.65 }} className="group flex min-h-[330px] flex-col rounded-[24px] border border-white/[0.08] bg-[#0d1815] p-6 transition-colors hover:border-lime-300/15 sm:p-7"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-lime-300/70"><lesson.icon className="size-5" strokeWidth={1.4} /></span><span className="font-mono text-[10px] text-white/20">{lesson.number} / FIELD NOTE</span></div><h3 className="mt-8 text-xl font-medium leading-8">{lesson.title}</h3><p className="mt-4 text-xs font-light leading-7 text-white/42">{lesson.text}</p><p className="mt-auto border-t border-white/[0.06] pt-4 text-[10px] leading-6 text-lime-200/40">{lesson.detail}</p></motion.article>)}
          </div>

          <div className="mt-20 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} className="lg:sticky lg:top-28"><div className="section-kicker">أداة عملية</div><h3 className="mt-4 text-3xl font-medium leading-tight sm:text-4xl">احسب الحجم قبل<br />أن تحسب العائد.</h3><p className="mt-5 max-w-md text-sm font-light leading-8 text-white/42">حدّد رأس المال، النسبة التي تقبل المخاطرة بها، وسعر إبطال الفكرة. ستحسب الأداة الحجم النظري المناسب من هذه المدخلات مباشرة.</p><div className="mt-7 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-[10px] leading-6 text-white/35"><ShieldCheck className="mt-1 size-4 shrink-0 text-lime-300/50" /> هذه حاسبة تعليمية وليست توصية استثمارية. لا تشمل الضرائب أو الفجوات أو تغير سعر التنفيذ.</div></motion.div>
            <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0d1815]">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-5 sm:px-7"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-lime-300/10 text-lime-300"><Calculator className="size-4" /></span><div><h4 className="text-sm font-medium">حاسبة حجم المركز</h4><p className="mt-1 text-[9px] text-white/28">Risk-based position sizing</p></div></div><div className="flex rounded-lg bg-black/20 p-1"><button onClick={() => { setSide("buy"); if (entryNumber && stopNumber > entryNumber) setStop((entryNumber * 0.95).toFixed(2)); }} className={`rounded-md px-3 py-1.5 text-[10px] ${side === "buy" ? "bg-lime-300 text-emerald-950" : "text-white/35"}`}>شراء</button><button onClick={() => { setSide("sell"); if (entryNumber && stopNumber < entryNumber) setStop((entryNumber * 1.05).toFixed(2)); }} className={`rounded-md px-3 py-1.5 text-[10px] ${side === "sell" ? "bg-red-300 text-red-950" : "text-white/35"}`}>بيع</button></div></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
                {[{ label: "رأس المال ($)", value: equity, set: setEquity }, { label: "المخاطرة لكل فكرة (%)", value: riskPct, set: setRiskPct }, { label: "سعر الدخول ($)", value: entry, set: setEntry }, { label: side === "buy" ? "وقف الخسارة أسفل الدخول ($)" : "وقف الخسارة أعلى الدخول ($)", value: stop, set: setStop }].map((field) => <label key={field.label}><span className="mb-2 block text-[10px] text-white/38">{field.label}</span><input type="number" min="0" step="any" value={field.value} onChange={(event) => field.set(event.target.value)} className="field font-mono" dir="ltr" /></label>)}
              </div>
              <div className="grid grid-cols-2 border-y border-white/[0.07] bg-black/10 lg:grid-cols-4">
                {[{ label: "ميزانية المخاطرة", value: formatMoney(riskBudget) }, { label: "مخاطرة الوحدة", value: formatMoney(unitRisk) }, { label: "الحجم النظري", value: formatQuantity(quantity) }, { label: "قيمة المركز", value: formatMoney(notional) }].map((result) => <div key={result.label} className="border-l border-white/[0.06] p-4 last:border-0 sm:p-5"><div className="text-[9px] text-white/30">{result.label}</div><div className="mt-2 truncate font-mono text-sm text-lime-200" dir="ltr" title={result.value}>{result.value}</div></div>)}
              </div>
              <div className="p-5 sm:px-7"><div className="flex items-center justify-between text-[10px] text-white/40"><span>نسبة قيمة المركز من رأس المال</span><span className="font-mono text-white/70" dir="ltr">{portfolioPct.toFixed(1)}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><motion.div animate={{ width: `${Math.min(100, Math.max(0, portfolioPct))}%` }} className={`h-full rounded-full ${portfolioPct > 100 ? "bg-red-300" : "bg-lime-300"}`} /></div><p className={`mt-4 text-[10px] leading-6 ${inputError ? "text-red-300/70" : "text-white/30"}`}>{inputError ?? `إذا تحرك السعر مباشرة إلى الوقف، تكون الخسارة النظرية ${formatMoney(riskBudget)} قبل الرسوم والانزلاق.`}</p></div>
            </motion.div>
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
            <div><div className="section-kicker">أسئلة شائعة</div><h3 className="mt-4 text-3xl font-medium">وضوح قبل أي نقرة.</h3><p className="mt-4 text-xs leading-7 text-white/35">إجابات مباشرة عن التنفيذ والبيانات والحساب والمحافظ.</p></div>
            <div className="border-t border-white/[0.09]">{faqs.map((faq, index) => <div key={faq.q} className="border-b border-white/[0.09]"><button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-5 py-5 text-right text-sm text-white/75 transition-colors hover:text-white" aria-expanded={openFaq === index}><span>{faq.q}</span><motion.span animate={{ rotate: openFaq === index ? 180 : 0 }} className="shrink-0 text-white/30"><ChevronDown className="size-4" /></motion.span></button><AnimatePresence initial={false}>{openFaq === index && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden"><p className="max-w-3xl pb-6 pl-8 text-xs font-light leading-7 text-white/40">{faq.a}</p></motion.div>}</AnimatePresence></div>)}</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-[#060d0b] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto max-w-[1380px]"><div className="grid gap-10 md:grid-cols-[1fr_.7fr_.7fr]"><div><Logo /><p className="mt-5 max-w-md text-xs font-light leading-7 text-white/35">منصة عربية لمحاكاة التداول العالمي وبناء عادات مراجعة أفضل. التعلم أولاً، ثم القرار.</p></div><div><div className="text-[10px] text-white/25">انتقل إلى</div><div className="mt-4 grid gap-3 text-xs text-white/50"><a href="#terminal" className="hover:text-lime-300">غرفة التداول</a><a href="#markets" className="hover:text-lime-300">الأسواق العالمية</a><a href="#wallet" className="hover:text-lime-300">طلبات تحويل المحفظة</a></div></div><div><div className="text-[10px] text-white/25">مبدأ مِدار</div><div className="mt-4 flex items-center gap-3 text-xs text-white/50"><BookOpen className="size-4 text-lime-300/50" /> افهم الأداة قبل مخاطرتها</div><a href="#top" className="mt-5 inline-flex items-center gap-2 text-xs text-lime-300/70">العودة إلى الأعلى <MoveDownLeft className="size-3.5 rotate-[135deg]" /></a></div></div><div className="mt-10 border-t border-white/[0.06] pt-6 text-[9px] leading-6 text-white/25"><p>إفصاح: هذه النسخة بيئة تداول تعليمية بأسعار محاكاة، وليست وسيطاً مالياً أو بثّاً سوقياً أو نصيحة استثمارية. طلبات المحفظة سجلات مراجعة يدوية فقط؛ لا يثبت تسجيلها استلام الأموال ولا يضيف رصيداً تلقائياً. التداول الحقيقي قد يؤدي إلى خسارة رأس المال.</p><div className="mt-4 flex flex-col justify-between gap-2 sm:flex-row"><span>© 2026 مِدار — MIDAR</span><span dir="ltr">01503724381 · 01213783090</span></div></div></div>
      </footer>
    </>
  );
}
