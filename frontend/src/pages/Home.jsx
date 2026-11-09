import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  ListTodo,
  Clock,
  Footprints,
  Plus,
  Check,
  Sparkles,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, patch, todayHealth } from "@/lib/store";
import {
  dayKey,
  freeSlots,
  fromMin,
  toMin,
  energyScore,
  recommend,
  greeting,
  uid,
} from "@/lib/time";
import { dueDsa, weakModules } from "@/lib/zero";
import { jevDecide, guessPriority } from "@/lib/jev";
import { colorFor } from "@/lib/seed";
import { Bento, Eyebrow, Tag, StepRing, Btn, Field } from "@/components/ui-kit";
import { NextClassCountdown } from "@/components/Tickers";
import Pomodoro from "@/components/Pomodoro";

const PRI = { high: "amber", med: "cyan", low: "slate" };
const ACC = {
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  emerald: "#10B981",
  amber: "#F59E0B",
};

function Kpis() {
  const tasks = useStore((s) => s.tasks);
  const today = useStore(todayHealth);
  const goal = useStore((s) => s.settings.stepGoal);
  const heat = useStore((s) => s.coding.heatmap);
  const high = tasks.filter((t) => !t.done && t.priority === "high");
  let streak = 0;
  for (let i = heat.length - 1; i >= 0 && heat[i] > 0; i--) streak++;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Bento data-testid="kpi-high-priority">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>High-Priority</Eyebrow>
          <ListTodo className="h-4 w-4 text-amber-400" />
        </div>
        <div className="mono text-4xl font-semibold">{high.length}</div>
        <div className="text-xs text-slate-400 mt-1 truncate">
          {high[0]?.title || "Queue clear"}
        </div>
      </Bento>
      <Bento data-testid="kpi-next-class">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Next Class</Eyebrow>
          <Clock className="h-4 w-4 text-cyan-400" />
        </div>
        <NextClassCountdown />
      </Bento>
      <Bento data-testid="kpi-steps" className="flex items-center gap-4">
        <StepRing value={today?.steps || 0} goal={goal} size={86} stroke={8}>
          <Footprints className="h-4 w-4 text-emerald-400" />
        </StepRing>
        <div>
          <Eyebrow className="mb-1">Google Fit</Eyebrow>
          <div className="mono text-2xl font-semibold">
            {(today?.steps || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mono">
            / {goal.toLocaleString()} steps
          </div>
        </div>
      </Bento>
      <Bento data-testid="kpi-streak">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Coding Streak</Eyebrow>
          <Flame className="h-4 w-4 text-violet-400" />
        </div>
        <div className="mono text-4xl font-semibold">
          {streak}
          <span className="text-base text-slate-500 ml-1">days</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Commits + solves, consecutive
        </div>
      </Bento>
    </div>
  );
}

function FreeSlots() {
  const tt = useStore((s) => s.timetable);
  const today = useStore(todayHealth);
  const dsa = useStore((s) => s.dsa);
  const courses = useStore((s) => s.courses);
  const tasks = useStore((s) => s.tasks);
  const day = new Date().getDay();
  const energy = energyScore(today);
  const timeline = useMemo(() => {
    const st = { dsa, courses };
    const weak = weakModules(st);
    const due = dueDsa(st);
    const high = tasks.filter((t) => !t.done && t.priority === "high");
    const gaps = freeSlots(tt, day).map((g, i) => ({
      kind: "gap",
      ...g,
      rec: recommend(g, energy, {
        dueDsa: due[0]?.title,
        weakModule: `${weak[i % Math.max(1, weak.length)]?.course} · ${weak[i % Math.max(1, weak.length)]?.title}`,
        weakCourse: weak[0]?.course,
        highTask: high[i % Math.max(1, high.length)]?.title,
      }),
    }));
    const cls = tt
      .filter((c) => c.day === day)
      .map((c) => ({
        kind: "class",
        start: toMin(c.start),
        end: toMin(c.end),
        c,
      }));
    return [...gaps, ...cls].sort((a, b) => a.start - b.start);
  }, [tt, day, energy, dsa, courses, tasks]);
  const lock = (g) => {
    patch("tasks", (t) => [
      {
        id: uid(),
        title: `${fromMin(g.start)}–${fromMin(g.end)} · ${g.rec.kind}: ${g.rec.title}`,
        priority: g.rec.kind === "DEEP WORK" ? "high" : "med",
        done: false,
        due: dayKey(),
      },
      ...t,
    ]);
    toast.success("Slot locked into tasks");
  };
  return (
    <Bento className="h-full" data-testid="free-slot-optimizer">
      <div className="flex items-center justify-between mb-5">
        <div>
          <Eyebrow className="text-cyan-400 mb-1">
            Zero's Free-Slot Optimizer
          </Eyebrow>
          <div className="text-sm text-slate-400">
            Energy score <span className="mono text-white">{energy}/10</span> ·
            sleep {today?.sleep}h · sharpness {today?.sharpness}/10
          </div>
        </div>
        <Tag tone={energy >= 7 ? "emerald" : energy >= 5 ? "cyan" : "amber"}>
          {energy >= 7 ? "High energy" : energy >= 5 ? "Moderate" : "Low sleep"}
        </Tag>
      </div>
      <div className="relative space-y-2.5 pl-5 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-white/10">
        {timeline.map((x, i) =>
          x.kind === "class" ? (
            <div
              key={i}
              className="relative flex items-center gap-3 text-xs text-slate-400 py-1"
            >
              <span
                className="absolute -left-5 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#0D111A]"
                style={{ background: colorFor(x.c.code) }}
              />
              <span className="mono w-24 text-slate-500">
                {x.c.start}–{x.c.end}
              </span>
              <span className="text-slate-300 truncate">
                {x.c.code} · {x.c.name}
              </span>
              <span className="ml-auto mono text-slate-600 hidden sm:inline">
                {x.c.room}
              </span>
            </div>
          ) : (
            <div
              key={i}
              data-testid="free-slot-card"
              className="relative rounded-lg border p-3.5 fade-up"
              style={{
                borderColor: `${ACC[x.rec.accent]}40`,
                background: `linear-gradient(90deg, ${ACC[x.rec.accent]}12, transparent)`,
              }}
            >
              <span
                className="absolute -left-5 top-4 h-2.5 w-2.5 rounded-full"
                style={{
                  background: ACC[x.rec.accent],
                  boxShadow: `0 0 10px ${ACC[x.rec.accent]}`,
                }}
              />
              <div className="flex items-center gap-2 mb-1">
                <span className="mono text-xs text-white">
                  {fromMin(x.start)}–{fromMin(x.end)}
                </span>
                <span className="mono text-[10px] text-slate-500">
                  {(x.end - x.start) / 60}h gap
                </span>
                <span
                  className="text-[10px] font-bold tracking-wider ml-auto"
                  style={{ color: ACC[x.rec.accent] }}
                >
                  {x.rec.kind}
                </span>
              </div>
              <div className="text-sm font-medium">{x.rec.title}</div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="text-[11px] text-slate-500">{x.rec.why}</div>
                <button
                  data-testid="lock-slot-btn"
                  onClick={() => lock(x)}
                  className="press shrink-0 text-[11px] text-cyan-300 hover:text-cyan-200"
                >
                  Lock in →
                </button>
              </div>
            </div>
          ),
        )}
        {timeline.length === 0 && (
          <div className="text-sm text-slate-500">
            No classes and no gaps found.
          </div>
        )}
      </div>
    </Bento>
  );
}

function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const [title, setTitle] = useState("");
  const add = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const id = uid();
    patch("tasks", (ts) => [
      { id, title: t, priority: guessPriority(t), done: false, due: dayKey() },
      ...ts,
    ]);
    setTitle("");
    const r = await jevDecide("task_priority", { title: t });
    if (r)
      patch("tasks", (ts) =>
        ts.map((x) =>
          x.id === id ? { ...x, priority: r.priority, aiPriority: true } : x,
        ),
      );
  };
  const toggle = (id) =>
    patch("tasks", (ts) =>
      ts.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    );
  const del = (id) => patch("tasks", (ts) => ts.filter((x) => x.id !== id));
  const sorted = [...tasks].sort(
    (a, b) =>
      a.done - b.done ||
      ["high", "med", "low"].indexOf(a.priority) -
        ["high", "med", "low"].indexOf(b.priority),
  );
  return (
    <Bento data-testid="task-list">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Task Stack</Eyebrow>
        <span className="text-[10px] mono text-slate-600">
          Auto-priority by Jev
        </span>
      </div>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <Field
          data-testid="task-add-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task — priority is set automatically"
          className="flex-1"
        />
        <Btn tone="primary" data-testid="task-add-btn">
          <Plus className="h-4 w-4" />
        </Btn>
      </form>
      <div className="space-y-1 max-h-[340px] overflow-y-auto">
        {sorted.map((t) => (
          <div
            key={t.id}
            data-testid="task-item"
            className="group flex items-center gap-3 h-10 px-2 rounded-lg hover:bg-white/[0.03]"
          >
            <button
              data-testid="task-toggle"
              onClick={() => toggle(t.id)}
              className={`press h-4 w-4 rounded border grid place-items-center ${t.done ? "bg-cyan-500 border-cyan-500" : "border-white/20"}`}
            >
              {t.done && <Check className="h-3 w-3 text-[#06080E]" />}
            </button>
            <span
              className={`flex-1 text-sm truncate ${t.done ? "line-through text-slate-600" : ""}`}
            >
              {t.title}
            </span>
            <Tag tone={PRI[t.priority]} data-testid="task-priority">
              {t.priority}
              {t.aiPriority ? " ·ai" : ""}
            </Tag>
            <button
              onClick={() => del(t.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Bento>
  );
}

function ExamPin() {
  const mode = useStore((s) => s.settings.mode);
  const exams = useStore((s) => s.exams);
  if (mode === "normal") return null;
  const up = exams
    .filter((e) => e.date >= dayKey())
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Bento
      data-testid="exam-pinned-panel"
      className={mode === "exam" ? "border-amber-500/40" : "border-red-500/40"}
    >
      <div className="flex flex-wrap items-center gap-4">
        <Tag tone={mode === "exam" ? "amber" : "red"}>
          {mode === "exam"
            ? "Exam Mode · pinned"
            : "Weekend Emergency · pinned"}
        </Tag>
        {up.slice(0, 3).map((e) => (
          <span key={e.id} className="text-sm">
            <span className="mono text-amber-300">{e.date.slice(5)}</span>{" "}
            {e.title}
          </span>
        ))}
        <div className="ml-auto flex gap-2">
          <Link to="/academics">
            <Btn tone="amber">Syllabus</Btn>
          </Link>
          <Link to="/academics?tab=quiz">
            <Btn>
              Rapid Quiz <ArrowRight className="h-3 w-3" />
            </Btn>
          </Link>
        </div>
      </div>
    </Bento>
  );
}

export default function Home() {
  const storeName = useStore((s) => s.profile?.name);
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("aegis_user")) || {};
    } catch {
      return {};
    }
  })();
  const name = user.name || storeName || "Operator";
  const exams = useStore((s) => s.exams);
  const next = exams
    .filter((e) => e.date >= dayKey())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return (
    <div className="space-y-4">
      <div
        className="bento bento-spot p-6 lg:p-8 fade-up"
        data-testid="hero-banner"
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            data-testid="zero-status-badge"
            className="inline-flex items-center gap-2 h-6 px-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold tracking-[0.18em] text-cyan-300"
          >
            <span className="dot bg-cyan-400" /> ZERO AI: ONLINE
          </span>
          <span className="inline-flex items-center gap-2 h-6 px-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold tracking-[0.18em] text-emerald-300">
            <span className="dot bg-emerald-400" /> OFFLINE-READY
          </span>
          <span className="mono text-xs text-slate-500">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter">
          {greeting()}, {name}.
        </h1>
        <p className="text-sm md:text-base text-slate-400 mt-3 max-w-2xl flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
          Zero's briefing:{" "}
          {next ? (
            <>
              “{next.title}” is on{" "}
              <span className="mono text-amber-300">{next.date}</span>.{" "}
            </>
          ) : null}
          Your free slots below are matched to today's energy.
        </p>
      </div>
      <ExamPin />
      <Kpis />
      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-4">
        <FreeSlots />
        <div className="space-y-4">
          <Pomodoro />
          <Tasks />
        </div>
      </div>
    </div>
  );
}
