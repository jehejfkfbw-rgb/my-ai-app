"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpLeft,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Download,
  LineChart,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { MarketChart } from "@/components/MarketChart";
import { OrderTicket, type OrderInput } from "@/components/OrderTicket";
import {
  CATEGORY_FILTERS,
  INSTRUMENTS,
  getInstrument,
  type ChartRange,
  type MarketCategory,
} from "@/lib/markets";
import {
  csvCell,
  formatCompact,
  formatDate,
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuantity,
} from "@/lib/format";
import type { DashboardState, OrderStatus } from "@/lib/trading-types";

const ranges: Array<{ id: ChartRange; label: string }> = [
  { id: "1D", label: "يوم" },
  { id: "1W", label: "أسبوع" },
  { id: "1M", label: "شهر" },
  { id: "1Y", label: "سنة" },
];

const orderStatusLabels: Record<OrderStatus, string> = {
  open: "مفتوح",
  filled: "منفّذ",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

function saveCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TradingTerminal({
  state,
  selectedSymbol,
  range,
  syncing,
  onSelect,
  onRange,
  onToggleWatch,
  onSubmitOrder,
  onCancelOrder,
}: {
  state: DashboardState;
  selectedSymbol: string;
  range: ChartRange;
  syncing: boolean;
  onSelect: (symbol: string) => void;
  onRange: (range: ChartRange) => void;
  onToggleWatch: (symbol: string) => Promise<void>;
  onSubmitOrder: (input: OrderInput) => Promise<boolean>;
  onCancelOrder: (id: number) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | MarketCategory>("all");
  const [chartMode, setChartMode] = useState<"area" | "candles">("area");
  const [tab, setTab] = useState<"positions" | "orders" | "ledger">("positions");
  const [orderFilter, setOrderFilter] = useState<"all" | OrderStatus>("all");
    const selectedInstrument = getInstrument(selectedSymbol) ?? INSTRUMENTS[0];
  const quote = state.quotes.find((item) => item.symbol === selectedInstrument.symbol) ?? state.quotes[0];
  const position = state.positions.find((item) => item.symbol === selectedInstrument.symbol);
  const watched = state.watchlist.includes(selectedInstrument.symbol);

  useEffect(() => {
    const saved = localStorage.getItem("midar-chart-mode");
    if (saved === "area" || saved === "candles") setChartMode(saved);
  }, []);
  useEffect(() => localStorage.setItem("midar-chart-mode", chartMode), [chartMode]);

  const filteredInstruments = useMemo(() => INSTRUMENTS.filter((instrument) => {
    const matchesCategory = category === "all" || instrument.category === category;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${instrument.name} ${instrument.englishName} ${instrument.symbol} ${instrument.displaySymbol}`.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  }), [category, search]);
  const filteredOrders = state.orders.filter((order) => orderFilter === "all" || order.status === orderFilter);
  const chartReady = state.chart.symbol === selectedInstrument.symbol && state.chart.range === range;

  function exportOrders() {
    saveCsv("midar-orders.csv", [
      ["رقم الأمر", "الأداة", "الاتجاه", "النوع", "الكمية", "سعر الحد", "سعر التنفيذ", "القيمة", "العمولة", "الحالة", "التاريخ"],
      ...filteredOrders.map((order) => [order.id, order.symbol, order.side, order.kind, order.quantity, order.limitPrice, order.fillPrice, order.notional, order.fee, order.status, order.createdAt]),
    ]);
  }

  function exportLedger() {
    saveCsv("midar-statement.csv", [
      ["المرجع", "النوع", "الأداة", "المبلغ", "الرصيد بعد العملية", "البيان", "التاريخ"],
      ...state.ledger.map((entry) => [entry.reference, entry.type, entry.symbol, entry.amount, entry.balanceAfter, entry.description, entry.createdAt]),
    ]);
  }

    const metrics = [
    { label: "قيمة المحفظة", value: formatMoney(state.account.equity), detail: `${state.positions.length} مراكز مفتوحة`, icon: WalletCards, tone: "text-white" },
    { label: "القوة الشرائية", value: formatMoney(state.account.availableCash), detail: state.account.reservedCash > 0 ? `${formatMoney(state.account.reservedCash)} محجوز` : `${formatMoney(state.account.cash)} نقداً`, icon: CircleDollarSign, tone: "text-white" },
    { label: "إجمالي الربح / الخسارة", value: formatMoney(state.account.totalPnl), detail: `${formatPercent(state.account.totalPnlPct)} · محقق ${formatMoney(state.account.realizedPnl)}`, icon: ArrowUpLeft, tone: state.account.totalPnl >= 0 ? "text-lime-300" : "text-red-300" },
    { label: "تغيّر المراكز اليوم", value: formatMoney(state.account.dayPnl), detail: "مقابل الإغلاق السابق المحاكى", icon: Activity, tone: state.account.dayPnl >= 0 ? "text-lime-300" : "text-red-300" },
  ];

  return (
    <section id="terminal" className="relative scroll-mt-24 bg-[#08110f] px-3 py-20 text-white sm:px-6 lg:py-28">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-lime-300/[0.035] blur-[120px]" />
      <div className="relative mx-auto max-w-[1540px]">
        <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.75 }} className="mb-8 flex flex-col justify-between gap-5 px-2 md:flex-row md:items-end">
          <div>
            <div className="section-kicker">مساحة العمل / 01</div>
            <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">غرفة التداول</h2>
            <p className="mt-3 max-w-xl text-sm font-light leading-7 text-white/42">كل رقم هنا مرتبط بحسابك الشخصي المفعّل. نفّذ، راقب، راجع، ثم صدّر سجّلك.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="ml-2 inline-flex items-center gap-2 text-[10px] text-white/35"><span className={`size-1.5 rounded-full ${syncing ? "bg-amber-300" : "bg-lime-300"}`} />{syncing ? "جارٍ التحديث" : "دفتر مِدار متصل"}</span>
            
            <span className="rounded-lg border border-white/[0.07] px-3 py-2 font-mono text-[9px] text-white/30" dir="ltr">{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Cairo" }).format(new Date(state.serverTime))}</span>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div key={metric.label} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08, duration: 0.6 }} className="rounded-[20px] border border-white/[0.075] bg-[#0c1714] p-5">
              <div className="flex items-center justify-between text-[11px] text-white/38"><span>{metric.label}</span><metric.icon className="size-4 text-white/25" strokeWidth={1.5} /></div>
              <div className={`mt-4 font-mono text-[clamp(1.35rem,2.1vw,1.85rem)] tracking-tight ${metric.tone}`} dir="ltr">{metric.value}</div>
              <div className={`mt-2 text-[10px] ${metric.tone === "text-white" ? "text-white/28" : metric.tone === "text-lime-300" ? "text-lime-300/60" : "text-red-300/60"}`} dir="ltr">{metric.detail}</div>
            </motion.div>
          ))}
        </div>

        <div id="markets" className="mt-4 grid scroll-mt-28 items-start gap-4 xl:grid-cols-[270px_minmax(0,1fr)_310px]">
          <motion.aside initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.65 }} className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0d1815]">
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex items-center justify-between"><h3 className="text-sm font-medium">مستكشف الأسواق</h3><span className="font-mono text-[10px] text-white/30">{filteredInstruments.length}/{INSTRUMENTS.length}</span></div>
              <label className="relative mt-4 block"><Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-white/25" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field py-2.5 pr-9 text-[11px]" placeholder="ابحث بالاسم أو الرمز" /></label>
              <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORY_FILTERS.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`shrink-0 rounded-md px-2.5 py-1.5 text-[9px] transition-colors ${category === item.id ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>{item.label}</button>)}
              </div>
            </div>
            <div className="max-h-[688px] overflow-y-auto p-2 scrollbar-dark">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredInstruments.map((instrument) => {
                  const itemQuote = state.quotes.find((item) => item.symbol === instrument.symbol)!;
                  const selected = instrument.symbol === selectedInstrument.symbol;
                  const isWatched = state.watchlist.includes(instrument.symbol);
                  return (
                    <motion.div layout key={instrument.symbol} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }} className={`group relative mb-1 rounded-xl border transition-colors ${selected ? "border-lime-300/15 bg-lime-300/[0.055]" : "border-transparent hover:bg-white/[0.035]"}`}>
                      <button onClick={() => onSelect(instrument.symbol)} className="w-full px-3 py-3 text-right">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.035] font-mono text-[9px] font-semibold" style={{ color: instrument.accent }}>{instrument.symbol.slice(0, 3)}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[11px] text-white/80">{instrument.name}</span><span className="mt-1 block font-mono text-[9px] text-white/28" dir="ltr">{instrument.displaySymbol} · {instrument.exchange}</span></span>
                          <span className="text-left"><span className="block font-mono text-[11px] text-white/75" dir="ltr">{formatPrice(itemQuote.price, instrument.decimals)}</span><span className={`mt-1 block font-mono text-[9px] ${itemQuote.change >= 0 ? "text-lime-300/75" : "text-red-300/80"}`} dir="ltr">{formatPercent(itemQuote.changePct)}</span></span>
                        </div>
                      </button>
                      <button onClick={() => onToggleWatch(instrument.symbol)} className={`absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-[#14211d] opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 ${isWatched ? "text-amber-200" : "text-white/30"}`} aria-label={isWatched ? "إزالة من المراقبة" : "إضافة إلى المراقبة"}><Star className="size-3" fill={isWatched ? "currentColor" : "none"} /></button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filteredInstruments.length === 0 && <div className="grid min-h-44 place-items-center p-6 text-center text-xs leading-6 text-white/30">لا توجد أداة تطابق البحث.<br />جرّب رمزاً مثل AAPL أو BTC.</div>}
            </div>
          </motion.aside>

          <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.7 }} className="min-w-0 overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0d1815]">
            <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2"><span className="text-[10px] text-white/30">{selectedInstrument.categoryLabel}</span><span className="size-0.5 rounded-full bg-white/20" /><span className="text-[10px] text-white/30">{selectedInstrument.region}</span></div>
                <div className="mt-2 flex items-center gap-3"><h3 className="text-xl font-medium">{selectedInstrument.name}</h3><button onClick={() => onToggleWatch(selectedInstrument.symbol)} className={`grid size-8 place-items-center rounded-lg border border-white/[0.07] transition-colors hover:bg-white/5 ${watched ? "text-amber-200" : "text-white/30"}`} aria-label="تبديل المراقبة"><Star className="size-3.5" fill={watched ? "currentColor" : "none"} /></button></div>
                <div className="mt-1 font-mono text-[10px] text-white/28" dir="ltr">{selectedInstrument.displaySymbol} · {selectedInstrument.exchange}</div>
              </div>
              <div className="sm:text-left">
                <div className="font-mono text-3xl tracking-tight text-white" dir="ltr">{formatPrice(quote.price, selectedInstrument.decimals)}</div>
                <div className={`mt-1 font-mono text-xs ${quote.change >= 0 ? "text-lime-300" : "text-red-300"}`} dir="ltr">{quote.change >= 0 ? "+" : ""}{formatPrice(quote.change, selectedInstrument.decimals)} ({formatPercent(quote.changePct)})</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
              <div className="flex gap-1 rounded-lg bg-black/20 p-1">{ranges.map((item) => <button key={item.id} onClick={() => onRange(item.id)} className={`rounded-md px-3 py-1.5 text-[10px] transition-colors ${range === item.id ? "bg-white/[0.09] text-white" : "text-white/30 hover:text-white/65"}`}>{item.label}</button>)}</div>
              <div className="flex items-center gap-2"><span className="ml-2 text-[9px] text-white/25">بيانات محاكاة</span><button onClick={() => setChartMode("area")} className={`icon-button size-8 ${chartMode === "area" ? "bg-white/10 text-lime-300" : ""}`} title="رسم مساحي"><LineChart className="size-3.5" /></button><button onClick={() => setChartMode("candles")} className={`icon-button size-8 ${chartMode === "candles" ? "bg-white/10 text-lime-300" : ""}`} title="شموع يابانية"><BarChart3 className="size-3.5" /></button></div>
            </div>
            <div className="px-2 pt-2 sm:px-4">
              <AnimatePresence mode="wait">
                {chartReady ? <motion.div key={`${selectedSymbol}-${range}`} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}><MarketChart candles={state.chart.candles} instrument={selectedInstrument} quote={quote} mode={chartMode} /></motion.div> : <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-[290px] place-items-center sm:h-[340px]"><LoaderCircle className="size-5 animate-spin text-lime-300/60" /></motion.div>}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-3 border-y border-white/[0.06] sm:grid-cols-6">
              {[
                ["الافتتاح", formatPrice(quote.open, selectedInstrument.decimals)],
                ["الأعلى", formatPrice(quote.high, selectedInstrument.decimals)],
                ["الأدنى", formatPrice(quote.low, selectedInstrument.decimals)],
                ["شراء", formatPrice(quote.bid, selectedInstrument.decimals)],
                ["بيع", formatPrice(quote.ask, selectedInstrument.decimals)],
                ["الحجم", formatCompact(quote.volume)],
              ].map(([label, value]) => <div key={label} className="border-l border-white/[0.05] p-3 last:border-0"><div className="text-[9px] text-white/28">{label}</div><div className="mt-1.5 font-mono text-[10px] text-white/65" dir="ltr">{value}</div></div>)}
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div><div className="mb-2 text-[10px] text-lime-300/55">عن الأداة</div><p className="text-[11px] font-light leading-6 text-white/45">{selectedInstrument.description}</p></div>
              <div><div className="mb-2 text-[10px] text-amber-200/55">ما الذي يحرّك المخاطر؟</div><p className="text-[11px] font-light leading-6 text-white/45">{selectedInstrument.riskNote}</p></div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.65 }}>
            <OrderTicket instrument={selectedInstrument} quote={quote} account={state.account} position={position} onSubmit={onSubmitOrder} />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0d1815]">
          <div className="flex flex-col justify-between gap-3 border-b border-white/[0.06] p-3 sm:flex-row sm:items-center sm:px-5">
            <div className="flex gap-1">
              {([{ id: "positions", label: `المراكز (${state.positions.length})` }, { id: "orders", label: `الأوامر (${state.orders.length})` }, { id: "ledger", label: "كشف الحساب" }] as const).map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`relative rounded-lg px-4 py-2.5 text-[11px] transition-colors ${tab === item.id ? "text-white" : "text-white/30 hover:text-white/60"}`}>{item.label}{tab === item.id && <motion.span layoutId="terminal-tab" className="absolute inset-x-3 bottom-0 h-px bg-lime-300" />}</button>)}
            </div>
            {tab === "orders" && <div className="flex items-center gap-2"><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value as "all" | OrderStatus)} className="rounded-lg border border-white/[0.07] bg-[#101c18] px-3 py-2 text-[10px] text-white/55 outline-none"><option value="all">كل الحالات</option><option value="open">مفتوحة</option><option value="filled">منفذة</option><option value="cancelled">ملغاة</option><option value="rejected">مرفوضة</option></select><button onClick={exportOrders} className="secondary-button py-2 text-[10px]"><Download className="size-3.5" /> تصدير CSV</button></div>}
            {tab === "ledger" && <button onClick={exportLedger} className="secondary-button py-2 text-[10px]"><Download className="size-3.5" /> تصدير الكشف</button>}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {tab === "positions" && (
                <div>
                  {state.positions.length > 0 && <div className="flex h-1.5 w-full overflow-hidden bg-white/[0.03]" dir="ltr">{state.positions.map((item) => <span key={item.symbol} style={{ width: `${item.weight}%`, backgroundColor: getInstrument(item.symbol)?.accent }} title={`${item.symbol} ${item.weight.toFixed(1)}%`} />)}<span style={{ width: `${Math.max(0, (state.account.cash / state.account.equity) * 100)}%`, backgroundColor: "#33433c" }} title="نقد" /></div>}
                  <div className="overflow-x-auto"><table className="data-table min-w-[900px]"><thead><tr><th>الأداة</th><th>الكمية / المتاح</th><th>متوسط التكلفة</th><th>السعر الحالي</th><th>القيمة السوقية</th><th>الوزن</th><th>الربح غير المحقق</th><th /></tr></thead><tbody>
                    {state.positions.map((item) => { const instrument = getInstrument(item.symbol)!; return <tr key={item.symbol} onClick={() => onSelect(item.symbol)} className="cursor-pointer"><td><div className="flex items-center gap-3"><span className="size-1.5 rounded-full" style={{ backgroundColor: instrument.accent }} /><div><div className="text-white/80">{instrument.name}</div><div className="mt-1 font-mono text-[9px] text-white/30" dir="ltr">{instrument.displaySymbol}</div></div></div></td><td className="font-mono" dir="ltr">{formatQuantity(item.quantity)} <span className="text-white/25">/ {formatQuantity(item.availableQuantity)}</span></td><td className="font-mono" dir="ltr">{formatPrice(item.avgPrice, instrument.decimals)}</td><td className="font-mono" dir="ltr">{formatPrice(item.currentPrice, instrument.decimals)}</td><td className="font-mono" dir="ltr">{formatMoney(item.marketValue)}</td><td className="font-mono" dir="ltr">{item.weight.toFixed(1)}%</td><td className={`font-mono ${item.unrealizedPnl >= 0 ? "text-lime-300" : "text-red-300"}`} dir="ltr">{formatMoney(item.unrealizedPnl)}<span className="mr-2 text-[9px] opacity-60">{formatPercent(item.unrealizedPnlPct)}</span></td><td><ChevronLeft className="size-4 text-white/20" /></td></tr>; })}
                  </tbody></table></div>
                  {state.positions.length === 0 && <EmptyState icon={WalletCards} title="لا توجد مراكز مفتوحة" text="اختر أداة من المستكشف ثم أرسل أمر شراء لبناء أول مركز." />}
                </div>
              )}
              {tab === "orders" && (
                <div className="overflow-x-auto"><table className="data-table min-w-[980px]"><thead><tr><th>الأمر / التاريخ</th><th>الأداة</th><th>الاتجاه</th><th>النوع</th><th>الكمية</th><th>السعر</th><th>القيمة / الرسوم</th><th>الحالة</th><th /></tr></thead><tbody>
                  {filteredOrders.map((order) => { const instrument = getInstrument(order.symbol)!; return <tr key={order.id}><td><div className="font-mono text-white/60" dir="ltr">MD-{order.id}</div><div className="mt-1 text-[9px] text-white/25">{formatDate(order.createdAt)}</div></td><td><div>{instrument.name}</div><div className="mt-1 font-mono text-[9px] text-white/25" dir="ltr">{instrument.displaySymbol}</div></td><td><span className={order.side === "buy" ? "text-lime-300" : "text-red-300"}>{order.side === "buy" ? "شراء" : "بيع"}</span></td><td>{order.kind === "market" ? "سوق" : "حدّ"}<div className="mt-1 text-[9px] text-white/25">{order.timeInForce}</div></td><td className="font-mono" dir="ltr">{formatQuantity(order.quantity)}</td><td className="font-mono" dir="ltr">{order.status === "open" ? formatPrice(order.limitPrice ?? 0, instrument.decimals) : order.fillPrice ? formatPrice(order.fillPrice, instrument.decimals) : "—"}</td><td className="font-mono" dir="ltr">{formatMoney(order.notional)}<span className="block text-[9px] text-white/25">fee {formatMoney(order.fee)}</span></td><td><span className={`status-${order.status}`}>{orderStatusLabels[order.status]}</span>{order.note && <div className="mt-1 max-w-44 truncate text-[8px] text-white/25" title={order.note}>{order.note}</div>}</td><td>{order.status === "open" ? <button onClick={() => onCancelOrder(order.id)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[9px] text-white/45 transition-colors hover:border-red-300/20 hover:text-red-300">إلغاء</button> : order.status === "filled" ? <CheckCircle2 className="size-4 text-lime-300/35" /> : <XCircle className="size-4 text-white/15" />}</td></tr>; })}
                </tbody></table>{filteredOrders.length === 0 && <EmptyState icon={Clock3} title="لا توجد أوامر بهذه الحالة" text="غيّر عامل التصفية أو أرسل أمراً جديداً من تذكرة التداول." />}</div>
              )}
              {tab === "ledger" && (
                <div className="overflow-x-auto"><table className="data-table min-w-[860px]"><thead><tr><th>المرجع</th><th>البيان</th><th>التاريخ</th><th>المبلغ</th><th>النقد بعد العملية</th></tr></thead><tbody>{state.ledger.map((entry) => <tr key={entry.id}><td className="font-mono text-white/45" dir="ltr">{entry.reference ?? `#${entry.id}`}</td><td className="max-w-md"><div className="text-white/65">{entry.description}</div><div className="mt-1 text-[9px] text-white/25">{entry.type === "deposit" ? "إيداع معتمد" : entry.type === "adjustment" ? "تسوية إدارية" : "حركة تداول"}</div></td><td>{formatDate(entry.createdAt)}</td><td className={`font-mono ${entry.amount >= 0 ? "text-lime-300" : "text-red-300"}`} dir="ltr">{formatMoney(entry.amount)}</td><td className="font-mono" dir="ltr">{formatMoney(entry.balanceAfter)}</td></tr>)}</tbody></table></div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <div className="mt-4 flex flex-col justify-between gap-2 px-2 text-[9px] leading-5 text-white/25 sm:flex-row"><span>آخر مزامنة مع محرك المحاكاة: {formatDate(new Date(state.serverTime).toISOString())}</span><span>العمولات والانزلاق تقديرية داخل النموذج · لا أوامر خارجية</span></div>
      </div>

      
    </section>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof WalletCards; title: string; text: string }) {
  return <div className="grid min-h-52 place-items-center p-8 text-center"><div><Icon className="mx-auto size-7 text-white/15" strokeWidth={1.3} /><h4 className="mt-4 text-sm text-white/60">{title}</h4><p className="mt-2 text-[11px] text-white/28">{text}</p></div></div>;
}
