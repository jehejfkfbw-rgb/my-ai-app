// شعار VibeChat — فقاعة محادثة بموجات صوت متحركة
export default function Logo({ size = 84, animated = true }: { size?: number; animated?: boolean }) {
  const bars = [
    { x: 34, y: 44, h: 16, a: "animate-eq1" },
    { x: 45, y: 38, h: 28, a: "animate-eq2" },
    { x: 56, y: 32, h: 40, a: "animate-eq3", pink: true },
    { x: 67, y: 40, h: 24, a: "animate-eq4" },
    { x: 78, y: 46, h: 12, a: "animate-eq5" },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="drop-shadow-lg select-none" aria-label="VibeChat">
      <defs>
        <linearGradient id="vlg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16998a" />
          <stop offset="1" stopColor="#ff6b4a" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="url(#vlg)" />
      <rect x="21" y="24" width="78" height="56" rx="26" fill="#fff" />
      <path d="M38 76 L28 100 L58 80 Z" fill="#fff" />
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x} y={b.y} width="8" height={b.h} rx="4"
          fill={b.pink ? "#ff6b4a" : "#16998a"}
          className={animated ? b.a : ""}
          style={{ transformOrigin: `${b.x + 4}px ${b.y + b.h / 2}px` }}
        />
      ))}
    </svg>
  );
}