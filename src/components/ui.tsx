import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";
import { COUNTRIES } from "../lib/sb";

/* ---------- التوستات ---------- */
const ToastCtx = createContext<(t: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; t: string }[]>([]);
  const idRef = useRef(0);
  const push = useCallback((t: string) => {
    const id = ++idRef.current;
    setItems((p) => [...p.slice(-2), { id, t }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center w-full px-4 pointer-events-none">
        {items.map((x) => (
          <div key={x.id} className="animate-pop bg-grape-950/95 text-white text-sm px-4 py-2.5 rounded-2xl shadow-xl max-w-md text-center border border-white/10">
            {x.t}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- المودال ---------- */
export function Modal({ title, onClose, children, wide }: { title?: ReactNode; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] bg-grape-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={cn(
        "animate-rise w-full rounded-3xl bg-white dark:bg-[#10312c] dark:text-grape-50 shadow-2xl border border-grape-100 dark:border-white/10 p-5 flex flex-col gap-3 max-h-[88vh] overflow-y-auto nice-scroll",
        wide ? "max-w-2xl" : "max-w-md"
      )}>
        {title && (
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-extrabold text-lg m-0">{title}</h3>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-grape-100 dark:hover:bg-white/10 text-grape-700 dark:text-grape-200" aria-label="إغلاق">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------- عناصر أساسية ---------- */
export function Btn({ className, variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "sec" | "danger" | "ghost" }) {
  return (
    <button
      {...p}
      className={cn(
        "font-semibold rounded-xl px-4 py-2.5 text-sm transition active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        variant === "primary" && "bg-gradient-to-l from-grape-500 to-candy-500 text-white shadow-md shadow-grape-500/25 hover:brightness-110",
        variant === "sec" && "bg-grape-100 text-grape-700 hover:bg-grape-200 dark:bg-white/10 dark:text-grape-100 dark:hover:bg-white/15",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        variant === "ghost" && "bg-transparent text-grape-600 dark:text-grape-300 hover:bg-grape-100 dark:hover:bg-white/10",
        className
      )}
    />
  );
}

export function Field({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cn(
        "w-full rounded-xl border border-grape-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-grape-950 dark:text-grape-50 placeholder:text-grape-400 dark:placeholder:text-grape-300/50",
        className
      )}
    />
  );
}

export function CountrySelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-xl border border-grape-200 dark:border-white/15 bg-white dark:bg-[#144039] px-2 py-2.5 text-sm text-grape-950 dark:text-grape-50 cursor-pointer",
        className
      )}
    >
      {COUNTRIES.map((c) => (
        <option key={c.d} value={c.d}>{c.flag} {c.n} (+{c.d})</option>
      ))}
    </select>
  );
}

export function Avatar({ name, size = 44, online }: { name: string; size?: number; online?: boolean }) {
  const ch = (name || "?").trim().charAt(0) || "?";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-2xl bg-gradient-to-br from-grape-500 to-candy-500 text-white flex items-center justify-center font-display font-extrabold shadow-md shadow-grape-500/20"
        style={{ fontSize: size * 0.42 }}
      >
        {ch}
      </div>
      {online && <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0d2724]" />}
    </div>
  );
}