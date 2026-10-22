"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Candle, Instrument, Quote } from "@/lib/markets";
import { formatPrice } from "@/lib/format";

const WIDTH = 820;
const HEIGHT = 340;
const PAD = { top: 22, right: 18, bottom: 34, left: 66 };

export function MarketChart({ candles, instrument, quote, mode }: {
  candles: Candle[];
  instrument: Instrument;
  quote: Quote;
  mode: "area" | "candles";
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const rawId = useId();
  const gradientId = `chart-${rawId.replace(/:/g, "")}`;
  const geometry = useMemo(() => {
    if (!candles.length) return null;
    const lows = candles.map((candle) => candle.low);
    const highs = candles.map((candle) => candle.high);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    const padding = Math.max((max - min) * 0.12, max * 0.001);
    min -= padding;
    max += padding;
    const x = (index: number) => PAD.left + (index / Math.max(1, candles.length - 1)) * (WIDTH - PAD.left - PAD.right);
    const y = (price: number) => PAD.top + ((max - price) / Math.max(0.0000001, max - min)) * (HEIGHT - PAD.top - PAD.bottom);
    const points = candles.map((candle, index) => ({ x: x(index), y: y(candle.close), candle }));
    const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    const area = `${line} L${points.at(-1)!.x},${HEIGHT - PAD.bottom} L${points[0].x},${HEIGHT - PAD.bottom} Z`;
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = max - (index / 4) * (max - min);
      return { value, y: y(value) };
    });
    return { min, max, x, y, points, line, area, ticks };
  }, [candles]);

  if (!geometry) return <div className="grid h-[340px] place-items-center text-sm text-white/40">لا توجد بيانات للرسم</div>;
  const positive = candles.at(-1)!.close >= candles[0].open;
  const color = positive ? "#b9f46a" : "#ff8c83";
  const selected = activeIndex === null ? null : geometry.points[activeIndex];
  const candleWidth = Math.max(2, ((WIDTH - PAD.left - PAD.right) / candles.length) * 0.58);

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (localX - PAD.left) / (WIDTH - PAD.left - PAD.right);
    const index = Math.round(ratio * (candles.length - 1));
    setActiveIndex(Math.max(0, Math.min(candles.length - 1, index)));
  }

  return (
    <div className="relative h-[290px] w-full sm:h-[340px]" dir="ltr">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full overflow-visible touch-none"
        onPointerMove={handlePointer}
        onPointerLeave={() => setActiveIndex(null)}
        role="img"
        aria-label={`رسم سعري تفاعلي لأداة ${instrument.name}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,.075)" strokeDasharray="3 6" />
            <text x={PAD.left - 10} y={tick.y + 4} textAnchor="end" fill="rgba(255,255,255,.38)" fontSize="11" fontFamily="monospace">
              {formatPrice(tick.value, instrument.decimals)}
            </text>
          </g>
        ))}
        {[0, Math.floor(candles.length / 2), candles.length - 1].map((index) => (
          <text key={index} x={geometry.x(index)} y={HEIGHT - 8} textAnchor={index === 0 ? "start" : index === candles.length - 1 ? "end" : "middle"} fill="rgba(255,255,255,.32)" fontSize="10">
            {new Intl.DateTimeFormat("ar-EG", { month: "short", day: "numeric", hour: candles.length > 60 ? undefined : "2-digit", minute: candles.length > 60 ? undefined : "2-digit", timeZone: "Africa/Cairo" }).format(new Date(candles[index].time))}
          </text>
        ))}
        {mode === "area" ? (
          <>
            <motion.path d={geometry.area} fill={`url(#${gradientId})`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
            <motion.path
              d={geometry.line}
              fill="none"
              stroke={color}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={`url(#${gradientId}-glow)`}
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            />
          </>
        ) : (
          <g>
            {candles.map((candle, index) => {
              const rising = candle.close >= candle.open;
              const candleColor = rising ? "#b9f46a" : "#ff8c83";
              const x = geometry.x(index);
              const bodyTop = geometry.y(Math.max(candle.open, candle.close));
              const bodyBottom = geometry.y(Math.min(candle.open, candle.close));
              return (
                <g key={candle.time} opacity={activeIndex === null || activeIndex === index ? 1 : 0.62}>
                  <line x1={x} x2={x} y1={geometry.y(candle.high)} y2={geometry.y(candle.low)} stroke={candleColor} strokeWidth="1" />
                  <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={Math.max(1.5, bodyBottom - bodyTop)} rx="1" fill={candleColor} />
                </g>
              );
            })}
          </g>
        )}
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={geometry.y(quote.price)} y2={geometry.y(quote.price)} stroke={color} strokeOpacity="0.5" strokeDasharray="4 5" />
        <rect x={WIDTH - PAD.right - 69} y={geometry.y(quote.price) - 11} width="69" height="22" rx="4" fill={color} />
        <text x={WIDTH - PAD.right - 34.5} y={geometry.y(quote.price) + 4} textAnchor="middle" fill="#0a120f" fontSize="10" fontWeight="700">
          {formatPrice(quote.price, instrument.decimals)}
        </text>
        {selected && (
          <g pointerEvents="none">
            <line x1={selected.x} x2={selected.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="rgba(255,255,255,.35)" strokeDasharray="3 4" />
            <circle cx={selected.x} cy={selected.y} r="5" fill="#0b1512" stroke={color} strokeWidth="2" />
          </g>
        )}
      </svg>
      {selected && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-xl border border-white/10 bg-[#101c18]/95 p-3 text-left shadow-2xl backdrop-blur-xl"
          style={{ left: `${Math.max(2, Math.min(72, (selected.x / WIDTH) * 100 - 8))}%` }}
          dir="ltr"
        >
          <div className="mb-2 text-[10px] text-white/40">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }).format(new Date(selected.candle.time))}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-white/65">
            <span>O {formatPrice(selected.candle.open, instrument.decimals)}</span>
            <span>H {formatPrice(selected.candle.high, instrument.decimals)}</span>
            <span>L {formatPrice(selected.candle.low, instrument.decimals)}</span>
            <span style={{ color }}>C {formatPrice(selected.candle.close, instrument.decimals)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
