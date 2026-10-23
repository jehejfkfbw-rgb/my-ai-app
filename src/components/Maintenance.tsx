import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";

export default function Maintenance({ until, msg, onDev }: { until: number; msg: string; onDev: (code: string) => Promise<boolean> }) {
  const [now, setNow] = useState(Date.now());
  const taps = useRef(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.floor((until - now) / 1000));
  const clock = [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60].map((x) => String(x).padStart(2, "0")).join(":");

  return (
    <div className="fixed inset-0 z-40 bg-grape-950 text-white flex flex-col items-center justify-center gap-4 text-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,153,138,.4),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,107,74,.25),transparent_50%)]" />
      <div className="relative flex flex-col items-center gap-4">
        <button
          className="cursor-pointer bg-transparent border-0 p-0"
          onClick={async () => {
            if (++taps.current < 5) return;
            taps.current = 0;
            const c = prompt("كود المطوّر");
            if (c && /^\d{6}$/.test(c.trim())) await onDev(c.trim());
          }}
        >
          <Logo size={96} />
        </button>
        <h2 className="font-display font-black text-3xl m-0">التطبيق متوقف مؤقتاً</h2>
        <p className="max-w-md text-grape-200 m-0 leading-relaxed">{msg || "بنعمل تحديثات على التطبيق. هنرجع قريب."}</p>
        <div dir="ltr" className="font-display font-black text-5xl tabular-nums tracking-wider text-candy-400">{clock}</div>
        <div className="flex items-end gap-1 h-10 mt-2" dir="ltr">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`w-2 rounded-full bg-gradient-to-t from-grape-500 to-candy-400 animate-eq${(i % 5) + 1}`} style={{ height: `${30 + ((i * 29) % 60)}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}