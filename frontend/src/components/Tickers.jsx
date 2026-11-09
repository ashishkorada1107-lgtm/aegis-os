import { memo, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { nextClass, currentClass, fmtCountdown } from "@/lib/time";

const useTick = (ms = 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

export const NextClassPill = memo(function NextClassPill() {
  const tt = useStore((s) => s.timetable);
  const now = useTick();
  const cur = currentClass(tt, now);
  const nx = nextClass(tt, now);
  const soon = nx && nx.at - now < 15 * 60000;
  return (
    <div
      data-testid="next-class-pill"
      className={`hidden md:flex items-center gap-2 h-8 px-3 rounded-full border text-xs ${soon ? "border-amber-500/50 text-amber-300" : "border-white/10 text-slate-300"}`}
    >
      <span
        className={`dot ${cur ? "bg-emerald-400" : soon ? "bg-amber-400" : "bg-cyan-400"}`}
      />
      {cur ? (
        <span>LIVE · {cur.code}</span>
      ) : nx ? (
        <span>
          {nx.cls.code} in{" "}
          <span className="mono">{fmtCountdown(nx.at - now)}</span>
        </span>
      ) : (
        <span>No classes</span>
      )}
    </div>
  );
});

export const NextClassCountdown = memo(function NextClassCountdown() {
  const tt = useStore((s) => s.timetable);
  const now = useTick();
  const nx = nextClass(tt, now);
  if (!nx) return <div className="mono text-3xl">—</div>;
  return (
    <div>
      <div
        data-testid="kpi-class-countdown"
        className="mono text-3xl font-semibold tracking-tight"
      >
        {fmtCountdown(nx.at - now)}
      </div>
      <div className="text-xs text-slate-400 mt-1 truncate">
        {nx.cls.code} · {nx.cls.name} · {nx.cls.room} · {nx.cls.start}
      </div>
    </div>
  );
});

export const Clock = memo(function Clock() {
  const now = useTick();
  return (
    <span className="mono">
      {now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
});

export { useTick };
