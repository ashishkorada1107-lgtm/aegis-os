import { memo, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Eye } from "lucide-react";
import { patchToday } from "@/lib/store";
import { notify } from "@/lib/notify";
import { pad } from "@/lib/time";
import { Bento, Eyebrow } from "./ui-kit";

const MODES = {
  focus: ["FOCUS", 25],
  deep: ["DEEP WORK", 50],
  break: ["BREAK", 5],
};
const EYE_EVERY = 20 * 60;

function EyeAlert({ onClose }) {
  const [left, setLeft] = useState(20);
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 grid place-items-center p-4 fade-up"
      data-testid="eye-strain-alert"
    >
      <div className="bento p-6 max-w-sm w-full border-cyan-500/40">
        <Eyebrow className="text-cyan-400 mb-2">20-20-20 Protocol</Eyebrow>
        <div className="text-xl font-bold mb-2">Eyes off the screen.</div>
        <p className="text-sm text-slate-400 mb-4">
          Look at something 20 feet away for 20 seconds. Drop your shoulders,
          straighten your spine, unclench your jaw.
        </p>
        <div className="mono text-5xl text-cyan-300 mb-5">{pad(left)}s</div>
        <button
          data-testid="eye-alert-dismiss"
          onClick={onClose}
          className="press w-full h-10 rounded-lg bg-cyan-500 text-[#06080E] font-semibold text-sm"
        >
          {left ? "Skip" : "Done — back to work"}
        </button>
      </div>
    </div>
  );
}

export default memo(function Pomodoro() {
  const [mode, setMode] = useState("focus");
  const [left, setLeft] = useState(MODES.focus[1] * 60);
  const [running, setRunning] = useState(false);
  const [eye, setEye] = useState(false);
  const endAt = useRef(0);
  const focused = useRef(0);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft((prev) => {
        if (mode !== "break" && prev > l) {
          focused.current += prev - l;
          if (focused.current >= EYE_EVERY) {
            focused.current = 0;
            setEye(true);
            notify(
              "20-20-20 eye break",
              "Look 20 ft away for 20 seconds + posture reset.",
              { urgent: true },
            );
          }
        }
        return l;
      });
      if (l === 0) {
        setRunning(false);
        if (mode !== "break")
          patchToday((d) => ({
            deepWork: +((d.deepWork || 0) + MODES[mode][1] / 60).toFixed(2),
          }));
        notify(
          `${MODES[mode][0]} complete`,
          mode === "break"
            ? "Back to focus."
            : "Session logged to Deep Work hours. Take a break.",
          { urgent: true },
        );
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  const pick = (m) => {
    setRunning(false);
    setMode(m);
    setLeft(MODES[m][1] * 60);
  };
  const total = MODES[mode][1] * 60;
  const pct = 1 - left / total;

  return (
    <Bento className="h-full" data-testid="pomodoro-timer">
      {eye && <EyeAlert onClose={() => setEye(false)} />}
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Deep Work Engine</Eyebrow>
        <span
          className={`flex items-center gap-1.5 text-[10px] mono ${running ? "text-emerald-400" : "text-slate-600"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400" : "bg-slate-600"}`}
          />{" "}
          {running ? "ARMED" : "IDLE"}
        </span>
      </div>
      <div className="lcd p-5 text-center mb-4">
        <div className="eyebrow text-cyan-500/80 mb-1">{MODES[mode][0]}</div>
        <div
          data-testid="pomodoro-display"
          className="mono text-6xl font-bold tracking-tight text-cyan-200"
          style={{ textShadow: "0 0 18px rgba(6,182,212,0.45)" }}
        >
          {pad(Math.floor(left / 60))}:{pad(left % 60)}
        </div>
        <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {Object.keys(MODES).map((m) => (
          <button
            key={m}
            data-testid={`pomodoro-mode-${m}`}
            onClick={() => pick(m)}
            className={`hw-btn h-9 text-[10px] font-semibold tracking-wider ${mode === m ? "text-cyan-300 border-cyan-500/40" : "text-slate-400"}`}
          >
            {MODES[m][0]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <button
          data-testid="pomodoro-start-btn"
          onClick={() => setRunning((r) => !r)}
          className="hw-btn h-11 flex items-center justify-center gap-2 text-sm font-semibold text-cyan-300"
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Start
            </>
          )}
        </button>
        <button
          data-testid="pomodoro-reset-btn"
          onClick={() => pick(mode)}
          className="hw-btn h-11 w-11 grid place-items-center text-slate-400"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          data-testid="test-eye-alert-btn"
          title="Test 20-20-20 alert"
          onClick={() => setEye(true)}
          className="hw-btn h-11 w-11 grid place-items-center text-slate-400"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </Bento>
  );
});
