"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Info, LoaderCircle, LockKeyhole, X } from "lucide-react";
import type { Instrument, Quote } from "@/lib/markets";
import { estimatedFee, formatMoney, formatPrice, formatQuantity } from "@/lib/format";
import type { AccountView, OrderKind, OrderSide, PositionView, TimeInForce } from "@/lib/trading-types";

export interface OrderInput {
  symbol: string;
  side: OrderSide;
  kind: OrderKind;
  quantity: number;
  limitPrice?: number;
  timeInForce: TimeInForce;
}

export function OrderTicket({ instrument, quote, account, position, onSubmit }: {
  instrument: Instrument;
  quote: Quote;
  account: AccountView;
  position?: PositionView;
  onSubmit: (input: OrderInput) => Promise<boolean>;
}) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [kind, setKind] = useState<OrderKind>("market");
  const [timeInForce, setTimeInForce] = useState<TimeInForce>("GTC");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState(quote.price.toFixed(instrument.decimals));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("midar-order-preferences") ?? "{}") as { kind?: OrderKind; timeInForce?: TimeInForce };
      if (saved.kind === "market" || saved.kind === "limit") setKind(saved.kind);
      if (saved.timeInForce === "GTC" || saved.timeInForce === "DAY") setTimeInForce(saved.timeInForce);
    } catch { /* Ignore invalid local preferences. */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("midar-order-preferences", JSON.stringify({ kind, timeInForce }));
  }, [kind, timeInForce]);

  useEffect(() => {
    setQuantity("");
    setLimitPrice(quote.price.toFixed(instrument.decimals));
    setReviewOpen(false);
  }, [instrument.symbol]); // Reset quantity when changing instruments.

  const numericQuantity = Number(quantity) || 0;
  const numericLimit = Number(limitPrice) || 0;
  const estimatedPrice = kind === "limit" ? numericLimit : side === "buy" ? quote.ask : quote.bid;
  const notional = numericQuantity * estimatedPrice;
  const fee = notional > 0 ? estimatedFee(notional, instrument) : 0;
  const total = side === "buy" ? notional + fee : notional - fee;
  const availableQuantity = position?.availableQuantity ?? 0;
  const validation = useMemo(() => {
    if (numericQuantity <= 0) return "أدخل الكمية المطلوبة";
    if (kind === "limit" && numericLimit <= 0) return "أدخل سعر الحد";
    if (notional < 1) return "الحد الأدنى لقيمة الأمر 1 دولار";
    if (side === "buy" && total > account.availableCash) return "القيمة تتجاوز القوة الشرائية المتاحة";
    if (side === "sell" && numericQuantity > availableQuantity) return "الكمية تتجاوز المتاح للبيع";
    return null;
  }, [numericQuantity, numericLimit, kind, notional, side, total, account.availableCash, availableQuantity]);

  function applyPercentage(percentage: number) {
    if (side === "buy") {
      const unitPrice = Math.max(0.000001, estimatedPrice || quote.ask);
      const maxQuantity = Math.max(0, (account.availableCash * percentage) / (unitPrice * (1 + 0.0015)));
      setQuantity(maxQuantity > 0 ? maxQuantity.toFixed(instrument.category === "crypto" ? 6 : 4).replace(/\.0+$/, "") : "");
    } else {
      const value = availableQuantity * percentage;
      setQuantity(value > 0 ? value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : "");
    }
  }

  async function confirmOrder() {
    setBusy(true);
    const success = await onSubmit({
      symbol: instrument.symbol,
      side,
      kind,
      quantity: numericQuantity,
      limitPrice: kind === "limit" ? numericLimit : undefined,
      timeInForce,
    });
    setBusy(false);
    if (success) {
      setReviewOpen(false);
      setQuantity("");
    }
  }

  return (
    <aside className="rounded-[22px] border border-white/[0.08] bg-[#0d1815] p-4 shadow-[0_20px_60px_rgba(0,0,0,.12)] sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div><h3 className="text-sm font-medium text-white">تذكرة الأمر</h3><p className="mt-1 text-[10px] text-white/35">تنفيذ داخلي في دفتر مِدار</p></div>
        <span className="rounded-md border border-lime-300/15 bg-lime-300/[0.06] px-2 py-1 text-[9px] text-lime-200/70">LEDGER</span>
      </div>
      <div className="grid grid-cols-2 rounded-xl bg-black/20 p-1">
        <button onClick={() => setSide("buy")} className={`rounded-lg py-2.5 text-xs font-medium transition-all ${side === "buy" ? "bg-lime-300 text-[#0a130f] shadow-lg" : "text-white/40 hover:text-white"}`}>شراء</button>
        <button onClick={() => setSide("sell")} className={`rounded-lg py-2.5 text-xs font-medium transition-all ${side === "sell" ? "bg-[#ff8c83] text-[#1b0d0b] shadow-lg" : "text-white/40 hover:text-white"}`}>بيع</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["market", "limit"] as OrderKind[]).map((orderKind) => (
          <button key={orderKind} onClick={() => setKind(orderKind)} className={`rounded-lg border py-2 text-[11px] transition-colors ${kind === orderKind ? "border-white/20 bg-white/[0.07] text-white" : "border-white/[0.06] text-white/35 hover:text-white/65"}`}>{orderKind === "market" ? "أمر سوق" : "أمر حدّ"}</button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <AnimatePresence initial={false}>
          {kind === "limit" && (
            <motion.div initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} className="overflow-hidden">
              <label className="mb-2 flex items-center justify-between text-[11px] text-white/45"><span>سعر الحد</span><span>USD</span></label>
              <input dir="ltr" inputMode="decimal" type="number" min="0" step={instrument.decimals === 4 ? "0.0001" : "0.01"} value={limitPrice} onChange={(event) => setLimitPrice(event.target.value)} className="field font-mono" placeholder="0.00" />
            </motion.div>
          )}
        </AnimatePresence>
        <div>
          <label className="mb-2 flex items-center justify-between text-[11px] text-white/45"><span>الكمية</span><span>{instrument.displaySymbol}</span></label>
          <input dir="ltr" inputMode="decimal" type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="field font-mono text-base" placeholder="0.00" />
          <div className="mt-2 grid grid-cols-4 gap-1.5" dir="ltr">
            {[0.25, 0.5, 0.75, 1].map((percentage) => <button key={percentage} onClick={() => applyPercentage(percentage)} className="rounded-md border border-white/[0.06] py-1.5 font-mono text-[9px] text-white/35 transition-colors hover:border-lime-300/25 hover:text-lime-300">{percentage * 100}%</button>)}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-[11px] text-white/45">صلاحية الأمر</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTimeInForce("GTC")} className={`rounded-lg border px-2 py-2 text-[10px] ${timeInForce === "GTC" ? "border-white/15 bg-white/[0.06] text-white/80" : "border-white/[0.05] text-white/30"}`}>حتى الإلغاء</button>
            <button onClick={() => setTimeInForce("DAY")} className={`rounded-lg border px-2 py-2 text-[10px] ${timeInForce === "DAY" ? "border-white/15 bg-white/[0.06] text-white/80" : "border-white/[0.05] text-white/30"}`}>صلاحية يوم</button>
          </div>
        </div>
      </div>

      <div className="my-5 h-px bg-white/[0.07]" />
      <dl className="space-y-2.5 text-[11px]">
        <div className="flex justify-between gap-3"><dt className="text-white/35">{side === "buy" ? "قوة شرائية متاحة" : "كمية متاحة للبيع"}</dt><dd className="font-mono text-white/70" dir="ltr">{side === "buy" ? formatMoney(account.availableCash) : formatQuantity(availableQuantity)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-white/35">السعر التقديري</dt><dd className="font-mono text-white/70" dir="ltr">{estimatedPrice > 0 ? formatPrice(estimatedPrice, instrument.decimals) : "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-white/35">العمولة التقديرية</dt><dd className="font-mono text-white/70" dir="ltr">{formatMoney(fee)}</dd></div>
        <div className="flex justify-between gap-3 pt-1 text-xs"><dt className="text-white/55">{side === "buy" ? "إجمالي الخصم" : "صافي الإضافة"}</dt><dd className="font-mono text-white" dir="ltr">{formatMoney(total)}</dd></div>
      </dl>
      {account.reservedCash > 0 && side === "buy" && <p className="mt-3 text-[9px] leading-5 text-white/30">محجوز لأوامر الحد المفتوحة: <span dir="ltr">{formatMoney(account.reservedCash)}</span></p>}
      {validation && numericQuantity > 0 && <p className="mt-3 rounded-lg bg-red-400/[0.07] px-3 py-2 text-[10px] leading-5 text-red-200/75">{validation}</p>}
      <button disabled={Boolean(validation)} onClick={() => setReviewOpen(true)} className={`mt-5 flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30 ${side === "buy" ? "bg-lime-300 text-[#0a130f] hover:bg-lime-200" : "bg-[#ff8c83] text-[#1b0d0b] hover:bg-[#ffa29b]"}`}>
        مراجعة أمر {side === "buy" ? "الشراء" : "البيع"} <ArrowLeft className="size-4" />
      </button>
      <p className="mt-3 flex items-start gap-2 text-[9px] leading-5 text-white/28"><Info className="mt-0.5 size-3 shrink-0" /> السعر النهائي في أوامر السوق يشمل السبريد والانزلاق المحسوب حسب الكمية وتقلب الأداة.</p>

      <AnimatePresence>
        {reviewOpen && (
          <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-[#030806]/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setReviewOpen(false); }}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="review-title" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.97 }} transition={{ type: "spring", stiffness: 340, damping: 28 }} className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#101b17] p-6 shadow-2xl">
              <div className="flex items-start justify-between"><div><span className="text-[10px] text-lime-300/60">الخطوة الأخيرة</span><h3 id="review-title" className="mt-2 text-xl font-medium text-white">راجع الأمر قبل الإرسال</h3></div><button disabled={busy} onClick={() => setReviewOpen(false)} className="icon-button" aria-label="إغلاق"><X className="size-4" /></button></div>
              <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center justify-between"><div><div className="text-lg text-white">{instrument.name}</div><div className="mt-1 font-mono text-[10px] text-white/35">{instrument.displaySymbol} · {instrument.exchange}</div></div><span className={`rounded-lg px-3 py-1.5 text-xs ${side === "buy" ? "bg-lime-300/10 text-lime-300" : "bg-red-300/10 text-red-300"}`}>{side === "buy" ? "شراء" : "بيع"}</span></div>
                <dl className="mt-5 space-y-3 border-t border-white/[0.06] pt-4 text-xs">
                  <div className="flex justify-between"><dt className="text-white/40">نوع الأمر</dt><dd className="text-white/75">{kind === "market" ? "سوق" : `حدّ عند ${formatPrice(numericLimit, instrument.decimals)}`}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/40">الكمية</dt><dd className="font-mono text-white/75" dir="ltr">{formatQuantity(numericQuantity)}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/40">القيمة + الرسوم</dt><dd className="font-mono text-white" dir="ltr">{formatMoney(total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/40">الصلاحية</dt><dd className="text-white/75">{timeInForce === "GTC" ? "حتى الإلغاء" : "يوم واحد"}</dd></div>
                </dl>
              </div>
              <div className="mt-4 flex gap-2 rounded-xl bg-amber-200/[0.05] p-3 text-[10px] leading-5 text-amber-100/55"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> هذا أمر داخلي في دفتر مِدار، ولن يُرسل إلى بورصة أو وسيط خارجي.</div>
              <button disabled={busy} onClick={confirmOrder} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-semibold ${side === "buy" ? "bg-lime-300 text-[#0a130f]" : "bg-[#ff8c83] text-[#1b0d0b]"}`}>
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{busy ? "جارٍ تنفيذ الأمر..." : "تأكيد وإرسال الأمر"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
