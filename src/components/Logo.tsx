import { Orbit } from "lucide-react";

export function Logo({ light = true, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3" aria-label="مِدار">
      <span className={`relative grid size-10 place-items-center rounded-xl border ${light ? "border-lime-300/25 bg-lime-300/10 text-lime-300" : "border-emerald-950/15 bg-emerald-950 text-lime-300"}`}>
        <Orbit className="size-5" strokeWidth={1.7} />
        <span className="absolute right-2 top-2 size-1 rounded-full bg-current" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className={`block text-[1.35rem] font-semibold tracking-tight ${light ? "text-white" : "text-emerald-950"}`}>مِدار</span>
          <span className={`mt-1 block text-[8px] font-medium uppercase tracking-[0.34em] ${light ? "text-white/40" : "text-emerald-950/45"}`}>MIDAR</span>
        </span>
      )}
    </span>
  );
}
