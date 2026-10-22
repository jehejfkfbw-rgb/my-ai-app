"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";
import { Hero } from "@/components/Hero";
import { TradingTerminal } from "@/components/TradingTerminal";
import { WalletPanel, type DepositInput } from "@/components/WalletPanel";
import { LearnSection } from "@/components/LearnSection";
import type { OrderInput } from "@/components/OrderTicket";
import { getCandles, getInstrument, isChartRange, type ChartRange } from "@/lib/markets";
import type { DashboardState } from "@/lib/trading-types";
import type { SafeUser } from "@/lib/auth-types";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

export function MidarExperience({ initialState, currentUser }: { initialState: DashboardState; currentUser: SafeUser }) {
  const [state, setState] = useState(initialState);
  const [selectedSymbol, setSelectedSymbol] = useState(initialState.chart.symbol);
  const [range, setRange] = useState<ChartRange>(initialState.chart.range);
  const [syncing, setSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const requestSequence = useRef(0);
  const toastSequence = useRef(0);

  const notify = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++toastSequence.current;
    setToasts((current) => [...current.slice(-2), { id, message, type }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4800);
  }, []);

  const refresh = useCallback(async (symbol = selectedSymbol, chartRange = range) => {
    const sequence = ++requestSequence.current;
    setSyncing(true);
    try {
      const response = await fetch(`/api/state?symbol=${encodeURIComponent(symbol)}&range=${chartRange}`, { cache: "no-store" });
      const data = await response.json() as DashboardState & { error?: string };
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/login";
        return false;
      }
      if (!response.ok) throw new Error(data.error ?? "تعذر تحديث البيانات");
      if (sequence === requestSequence.current) {
        setState(data);
        setConnectionError(false);
      }
      return true;
    } catch {
      if (sequence === requestSequence.current) setConnectionError(true);
      return false;
    } finally {
      if (sequence === requestSequence.current) setSyncing(false);
    }
  }, [selectedSymbol, range]);

  useEffect(() => {
    const savedSymbol = localStorage.getItem("midar-selected-symbol");
    const savedRange = localStorage.getItem("midar-chart-range");
    const nextSymbol = savedSymbol && getInstrument(savedSymbol) ? savedSymbol : selectedSymbol;
    const nextRange = isChartRange(savedRange) ? savedRange : range;
    if (nextSymbol !== selectedSymbol || nextRange !== range) {
      setSelectedSymbol(nextSymbol);
      setRange(nextRange);
      setState((current) => ({ ...current, chart: { symbol: nextSymbol, range: nextRange, candles: getCandles(nextSymbol, nextRange) } }));
    }
    // Read device preferences only once after mounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 6000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  function selectInstrument(symbol: string) {
    if (!getInstrument(symbol)) return;
    setSelectedSymbol(symbol);
    localStorage.setItem("midar-selected-symbol", symbol);
    setState((current) => ({ ...current, chart: { symbol, range, candles: getCandles(symbol, range) } }));
    void refresh(symbol, range);
  }

  function selectRange(nextRange: ChartRange) {
    setRange(nextRange);
    localStorage.setItem("midar-chart-range", nextRange);
    setState((current) => ({ ...current, chart: { symbol: selectedSymbol, range: nextRange, candles: getCandles(selectedSymbol, nextRange) } }));
    void refresh(selectedSymbol, nextRange);
  }

  async function submitOrder(input: OrderInput): Promise<boolean> {
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as { error?: string; order?: { id: number; status: string } };
      if (!response.ok) throw new Error(data.error ?? "تعذر إرسال الأمر");
      notify(data.order?.status === "filled" ? `تم تنفيذ الأمر MD-${data.order.id} وتحديث المحفظة.` : `تم فتح الأمر MD-${data.order?.id} وحجز متطلباته.`, "success");
      await refresh();
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "تعذر إرسال الأمر", "error");
      return false;
    }
  }

  async function cancelOrder(id: number) {
    try {
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر إلغاء الأمر");
      notify(`تم إلغاء الأمر MD-${id} وإتاحة ما كان محجوزاً له.`, "success");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "تعذر إلغاء الأمر", "error");
    }
  }

  async function toggleWatch(symbol: string) {
    const wasWatched = state.watchlist.includes(symbol);
    setState((current) => ({ ...current, watchlist: wasWatched ? current.watchlist.filter((item) => item !== symbol) : [...current.watchlist, symbol] }));
    try {
      const response = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) });
      const data = await response.json() as { error?: string; watched?: boolean };
      if (!response.ok) throw new Error(data.error ?? "تعذر تحديث المراقبة");
      setState((current) => ({ ...current, watchlist: data.watched ? Array.from(new Set([...current.watchlist, symbol])) : current.watchlist.filter((item) => item !== symbol) }));
      notify(data.watched ? "أُضيفت الأداة إلى قائمة المراقبة." : "أُزيلت الأداة من قائمة المراقبة.", "info");
    } catch (error) {
      setState((current) => ({ ...current, watchlist: wasWatched ? Array.from(new Set([...current.watchlist, symbol])) : current.watchlist.filter((item) => item !== symbol) }));
      notify(error instanceof Error ? error.message : "تعذر تحديث المراقبة", "error");
    }
  }

  async function submitDeposit(input: DepositInput): Promise<boolean> {
    try {
      const response = await fetch("/api/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as { error?: string; request?: { id: number } };
      if (!response.ok) throw new Error(data.error ?? "تعذر حفظ طلب المراجعة");
      notify(`تم حفظ طلب المراجعة DEP-${data.request?.id}. لم يُضف أي رصيد تلقائياً.`, "success");
      await refresh();
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "تعذر حفظ الطلب", "error");
      return false;
    }
  }

  async function cancelDeposit(id: number) {
    try {
      const response = await fetch(`/api/deposits?id=${id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر إلغاء الطلب");
      notify("تم إلغاء طلب المراجعة. أي تحويل خارجي تم بالفعل لا يُلغى من المنصة.", "info");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "تعذر إلغاء الطلب", "error");
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#08110f]">
      <Hero state={state} user={currentUser} />
      <TradingTerminal state={state} selectedSymbol={selectedSymbol} range={range} syncing={syncing} onSelect={selectInstrument} onRange={selectRange} onToggleWatch={toggleWatch} onSubmitOrder={submitOrder} onCancelOrder={cancelOrder} />
      <WalletPanel deposits={state.deposits} onSubmit={submitDeposit} onCancel={cancelDeposit} />
      <LearnSection state={state} />

      <div className="pointer-events-none fixed bottom-5 left-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:left-6" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => <motion.div layout key={toast.id} initial={{ opacity: 0, x: -30, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -15, scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl ${toast.type === "success" ? "border-lime-300/20 bg-[#102019]/95" : toast.type === "error" ? "border-red-300/20 bg-[#211311]/95" : "border-white/10 bg-[#111d19]/95"}`} role="status"><span className={`mt-0.5 ${toast.type === "success" ? "text-lime-300" : toast.type === "error" ? "text-red-300" : "text-cyan-200"}`}>{toast.type === "success" ? <CheckCircle2 className="size-4" /> : toast.type === "error" ? <AlertCircle className="size-4" /> : <Info className="size-4" />}</span><p className="flex-1 text-[11px] leading-6 text-white/70">{toast.message}</p><button onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="text-white/25 hover:text-white" aria-label="إغلاق الإشعار"><X className="size-3.5" /></button></motion.div>)}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {connectionError && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 right-4 z-[90] flex items-center gap-3 rounded-xl border border-amber-300/15 bg-[#211d10]/95 px-4 py-3 text-[10px] text-amber-100/65 shadow-xl backdrop-blur-xl sm:bottom-5 sm:right-6"><AlertCircle className="size-4" /><span>تعذرت المزامنة؛ تظهر آخر بيانات محفوظة.</span><button onClick={() => void refresh()} className="mr-2 inline-flex items-center gap-1.5 text-amber-200 hover:text-white"><RefreshCw className="size-3.5" /> إعادة المحاولة</button></motion.div>}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
