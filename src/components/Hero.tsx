"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDownLeft, ArrowLeft, ChartNoAxesCombined, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getInstrument, INSTRUMENTS } from "@/lib/markets";
import { formatMoney, formatPercent, formatPrice } from "@/lib/format";
import type { DashboardState } from "@/lib/trading-types";
import type { SafeUser } from "@/lib/auth-types";

const navItems = [
  { href: "#terminal", label: "غرفة التداول" },
  { href: "#markets", label: "الأسواق" },
  { href: "#wallet", label: "تحويل المحفظة" },
  { href: "#learn", label: "دليل المخاطر" },
];

export function Hero({ state, user }: { state: DashboardState; user: SafeUser }) {
  const heroRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const globeScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 1.34]);
  const globeRotate = useTransform(scrollYProgress, [0, 1], [-5, reduceMotion ? -5 : 16]);
  const globeY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 130]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -75]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, reduceMotion ? 1 : 0.15]);
  const clipPath = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(0% 0% 0% 0% round 0px)", reduceMotion ? "inset(0% 0% 0% 0% round 0px)" : "inset(10% 4% 0% 4% round 42px)"],
  );
  const featured = ["NVDA", "BTCUSD", "XAUUSD"].map((symbol) => ({
    instrument: getInstrument(symbol)!,
    quote: state.quotes.find((quote) => quote.symbol === symbol)!,
  }));
  const chartInstrument = getInstrument(state.chart.symbol) ?? featured[0].instrument;
  const chartQuote = state.quotes.find((quote) => quote.symbol === chartInstrument.symbol) ?? featured[0].quote;
  const chartPoints = state.chart.candles.slice(-32);
  const min = Math.min(...chartPoints.map((point) => point.close));
  const max = Math.max(...chartPoints.map((point) => point.close));
  const line = chartPoints.map((point, index) => {
    const x = (index / Math.max(1, chartPoints.length - 1)) * 300;
    const y = 90 - ((point.close - min) / Math.max(0.00001, max - min)) * 75;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { y: "110%" },
    animate: { y: "0%" },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between rounded-2xl border border-white/[0.08] bg-[#08110f]/75 px-4 shadow-[0_12px_50px_rgba(0,0,0,.18)] backdrop-blur-xl sm:px-5">
          <a href="#top" aria-label="العودة إلى البداية"><Logo /></a>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="التنقل الرئيسي">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-[13px] text-white/55 transition-colors duration-300 hover:text-lime-300">{item.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 text-[11px] text-white/45 md:flex"><span className="size-1.5 rounded-full bg-lime-300 shadow-[0_0_12px_#b9f46a]" />{user.name} · حساب نشط</span>
            <button onClick={logout} className="mr-2 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-[10px] text-white/45 transition-colors hover:bg-white/5 hover:text-white"><LogOut className="size-3.5" /><span className="hidden sm:inline">خروج</span></button>
            <button onClick={() => setMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-xl border border-white/10 text-white lg:hidden" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={menuOpen}>
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="mx-auto mt-2 grid max-w-[1480px] gap-1 rounded-2xl border border-white/10 bg-[#0b1512]/95 p-3 shadow-2xl backdrop-blur-xl lg:hidden"
            >
              {navItems.map((item) => <a onClick={() => setMenuOpen(false)} key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white">{item.label}</a>)}
              <button onClick={logout} className="flex items-center gap-2 rounded-xl border-t border-white/[0.07] px-4 py-3 text-right text-sm text-red-200/55"><LogOut className="size-4" />خروج من {user.name}</button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <section ref={heroRef} id="top" className="relative min-h-[100svh] overflow-hidden bg-[#07100e] pb-24 pt-28 text-white lg:pb-16 lg:pt-24">
        <motion.div style={{ clipPath }} className="absolute inset-0 origin-top overflow-hidden">
          <div className="hero-grid absolute inset-0 opacity-60" />
          <div className="absolute -right-[12%] top-[8%] size-[60vw] rounded-full bg-lime-400/[0.055] blur-[110px]" />
          <div className="absolute -left-[10%] bottom-[-20%] size-[45vw] rounded-full bg-cyan-400/[0.045] blur-[100px]" />
          <div className="noise absolute inset-0 opacity-[0.18]" />
        </motion.div>

        <div className="relative mx-auto grid min-h-[calc(100svh-8rem)] max-w-[1480px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-4 lg:px-12">
          <motion.div style={{ y: copyY, opacity: copyOpacity }} className="relative z-10 max-w-3xl pt-8 lg:pt-0">
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="mb-7 flex items-center gap-3 text-xs text-lime-200/75">
              <span className="h-px w-10 bg-lime-300/60" />
              منصّتك العربية إلى الأسواق العالمية
            </motion.div>
            <h1 className="text-[clamp(3.2rem,7.2vw,7.4rem)] font-medium leading-[0.98] tracking-[-0.055em]">
              <span className="block overflow-hidden pb-2"><motion.span className="block" {...enter(0.12)}>العالم كلّه.</motion.span></span>
              <span className="block overflow-hidden pb-3 text-white/35"><motion.span className="block" {...enter(0.23)}>في مِدارٍ واحد.</motion.span></span>
            </h1>
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }} className="mt-6 max-w-xl text-[15px] font-light leading-8 text-white/55 sm:text-base">
              أدر الأسهم والصناديق والعملات والسلع من حسابك الشخصي. سجّل أوامرك في دفتر مِدار، راقب مخاطرك، وافهم كل حركة في محفظتك.
            </motion.p>
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.78, duration: 0.7 }} className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#terminal" className="group inline-flex items-center gap-4 rounded-2xl bg-lime-300 px-6 py-4 text-sm font-semibold text-[#09120f] shadow-[0_12px_40px_rgba(185,244,106,.12)] transition-all hover:bg-lime-200 hover:shadow-[0_16px_50px_rgba(185,244,106,.22)]">
                ادخل غرفة التداول
                <ArrowDownLeft className="size-4 transition-transform group-hover:-translate-x-1 group-hover:translate-y-1" />
              </a>
              <a href="#markets" className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-4 text-sm text-white/75 backdrop-blur-md transition-colors hover:bg-white/[0.07] hover:text-white">
                استكشف {INSTRUMENTS.length} أداة <ArrowLeft className="size-4" />
              </a>
            </motion.div>
            <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/[0.08] pt-5 text-[11px] text-white/38">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3.5 text-lime-300/70" /> حساب شخصي بتفعيل إلزامي</span>
              <span className="inline-flex items-center gap-2"><ChartNoAxesCombined className="size-3.5 text-lime-300/70" /> أوامر سوق وحدّ في دفتر داخلي</span>
              <span>الأسعار استرشادية وليست بثّاً حيّاً</span>
            </motion.div>
          </motion.div>

          <motion.div style={{ scale: globeScale, rotate: globeRotate, y: globeY }} className="relative mx-auto hidden aspect-square w-full max-w-[660px] lg:block" aria-hidden="true">
            <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.78 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-[6%] rounded-full border border-white/[0.07] bg-[radial-gradient(circle_at_40%_35%,rgba(185,244,106,.08),transparent_58%)] shadow-[inset_0_0_100px_rgba(185,244,106,.025)]">
              <svg viewBox="0 0 600 600" className="h-full w-full overflow-visible">
                <g fill="none" stroke="rgba(196,235,205,.13)" strokeWidth="1">
                  <circle cx="300" cy="300" r="228" />
                  <ellipse cx="300" cy="300" rx="228" ry="88" />
                  <ellipse cx="300" cy="300" rx="228" ry="154" />
                  <ellipse cx="300" cy="300" rx="88" ry="228" />
                  <ellipse cx="300" cy="300" rx="154" ry="228" />
                  <path d="M72 300h456M95 213h410M95 387h410M300 72v456" strokeDasharray="2 7" />
                </g>
                <motion.g animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "300px 300px" }}>
                  <circle cx="300" cy="72" r="5" fill="#b9f46a" /><circle cx="300" cy="72" r="13" fill="none" stroke="#b9f46a" strokeOpacity=".25" />
                  <circle cx="490" cy="410" r="4" fill="#7ed6d0" /><circle cx="132" cy="435" r="4" fill="#f3d36d" />
                </motion.g>
              </svg>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.8 }} className="absolute right-[-1%] top-[12%] w-56 -rotate-0 rounded-2xl border border-white/10 bg-[#101c18]/80 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-[10px] text-white/40"><span>{chartInstrument.englishName}</span><span>{chartInstrument.exchange}</span></div>
              <div className="mt-2 flex items-end justify-between" dir="ltr"><strong className="font-mono text-2xl font-medium">{formatPrice(chartQuote.price, chartInstrument.decimals)}</strong><span className={`text-xs ${chartQuote.change >= 0 ? "text-lime-300" : "text-red-300"}`}>{formatPercent(chartQuote.changePct)}</span></div>
              <svg viewBox="0 0 300 100" className="mt-2 h-16 w-full"><path d={line} fill="none" stroke="#b9f46a" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.05, duration: 0.8 }} className="absolute bottom-[15%] left-[-1%] w-60 rounded-2xl border border-white/10 bg-[#101c18]/85 p-5 shadow-2xl backdrop-blur-xl">
              <div className="text-[10px] text-white/40">القيمة الحالية للمحفظة</div>
              <div className="mt-2 font-mono text-2xl" dir="ltr">{formatMoney(state.account.equity)}</div>
              <div className={`mt-2 text-xs ${state.account.totalPnl >= 0 ? "text-lime-300" : "text-red-300"}`} dir="ltr">{formatMoney(state.account.totalPnl)} · {formatPercent(state.account.totalPnlPct)}</div>
            </motion.div>
            <motion.div animate={reduceMotion ? undefined : { y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[5%] right-[10%] rounded-xl border border-white/10 bg-[#101c18]/80 px-4 py-3 font-mono text-xs text-white/60 backdrop-blur-xl" dir="ltr">
              BTC/USD <span className="mr-3 text-white">{formatPrice(featured[1].quote.price, 0)}</span>
            </motion.div>
            <motion.div animate={reduceMotion ? undefined : { y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[4%] top-[12%] rounded-xl border border-white/10 bg-[#101c18]/80 px-4 py-3 font-mono text-xs text-white/60 backdrop-blur-xl" dir="ltr">
              XAU/USD <span className="mr-3 text-amber-200">{formatPrice(featured[2].quote.price, 2)}</span>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute inset-x-0 bottom-0 overflow-hidden border-y border-white/[0.06] bg-white/[0.018] py-3" dir="ltr">
          <div className="ticker-track flex w-max items-center gap-9">
            {[...state.quotes.slice(0, 10), ...state.quotes.slice(0, 10)].map((quote, index) => {
              const instrument = getInstrument(quote.symbol)!;
              return <div className="flex items-center gap-3 whitespace-nowrap font-mono text-[11px]" key={`${quote.symbol}-${index}`}><span className="text-white/75">{instrument.displaySymbol}</span><span className="text-white/40">{formatPrice(quote.price, instrument.decimals)}</span><span className={quote.change >= 0 ? "text-lime-300" : "text-red-300"}>{formatPercent(quote.changePct)}</span></div>;
            })}
          </div>
        </div>
      </section>
    </>
  );
}
