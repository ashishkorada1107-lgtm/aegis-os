import { memo } from "react";

export const Bento = ({ className = "", children, ...p }) => (
  <div className={`bento bento-spot p-5 ${className}`} {...p}>
    {children}
  </div>
);

export const Eyebrow = ({ children, className = "" }) => (
  <div className={`eyebrow ${className}`}>{children}</div>
);

const TONES = {
  cyan: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  violet: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  amber: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  red: "text-red-300 border-red-500/30 bg-red-500/10",
  slate: "text-slate-300 border-white/10 bg-white/5",
};
export const Tag = ({ tone = "slate", children, className = "", ...p }) => (
  <span
    className={`inline-flex items-center gap-1 h-5 px-2 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${TONES[tone]} ${className}`}
    {...p}
  >
    {children}
  </span>
);

export const PageHead = ({ eyebrow, title, sub, right }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 fade-up">
    <div>
      <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter">
        {title}
      </h1>
      {sub && <p className="text-sm text-slate-400 mt-2 max-w-2xl">{sub}</p>}
    </div>
    {right}
  </div>
);

export const Btn = ({ tone = "ghost", className = "", children, ...p }) => {
  const t = {
    primary: "bg-cyan-500 text-[#06080E] hover:bg-cyan-400 font-semibold",
    ghost: "border border-white/10 hover:border-cyan-500/40 text-slate-200",
    violet: "bg-violet-500 hover:bg-violet-400 text-white font-semibold",
    emerald: "bg-emerald-500 hover:bg-emerald-400 text-[#06080E] font-semibold",
    amber: "bg-amber-500 hover:bg-amber-400 text-[#06080E] font-semibold",
  }[tone];
  return (
    <button
      className={`press h-9 px-3.5 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-40 ${t} ${className}`}
      {...p}
    >
      {children}
    </button>
  );
};

export const Field = ({ className = "", ...p }) => (
  <input
    className={`h-9 px-3 rounded-lg bg-[#06080E] border border-white/10 focus:border-cyan-500/50 outline-none text-sm placeholder:text-slate-600 ${className}`}
    {...p}
  />
);

export const StepRing = memo(function StepRing({
  value,
  goal,
  size = 120,
  stroke = 10,
  color = "#10B981",
  children,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / goal);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            transition: "stroke-dashoffset 400ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
});

export const Bar = ({ value, color = "#06B6D4" }) => (
  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
    <div
      className="h-full rounded-full"
      style={{
        width: `${Math.min(100, value)}%`,
        background: color,
        transition: "width 200ms cubic-bezier(0.2,0.8,0.2,1)",
      }}
    />
  </div>
);

export const Wave = ({ active, bars = 12, className = "" }) => (
  <div
    data-testid="voice-waveform"
    className={`wave flex items-end gap-[3px] h-5 ${active ? "active" : ""} ${className}`}
  >
    {Array.from({ length: bars }, (_, i) => (
      <span
        key={i}
        style={{
          animationDelay: `${(i * 70) % 600}ms`,
          height: `${30 + ((i * 37) % 60)}%`,
        }}
      />
    ))}
  </div>
);

export const chartTip = {
  contentStyle: {
    background: "#0D111A",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "#94A3B8" },
};
