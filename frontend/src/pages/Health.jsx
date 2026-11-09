import { useState } from "react";
import {
  Footprints,
  RefreshCw,
  Link2,
  FileJson,
  Droplet,
  Coffee,
  Dumbbell,
  Plus,
  Loader2,
  AlertTriangle,
  Moon,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar as RBar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useStore,
  patch,
  patchToday,
  todayHealth,
  getState,
} from "@/lib/store";
import { dayKey, uid } from "@/lib/time";
import { readGoogleFit } from "@/lib/fit";
import { http } from "@/lib/api";
import {
  Bento,
  Eyebrow,
  PageHead,
  Btn,
  Field,
  Tag,
  StepRing,
  chartTip,
} from "@/components/ui-kit";

function mergeFit(days) {
  patch("health", (h) => {
    const map = new Map(h.days.map((d) => [d.date, d]));
    for (const d of days) {
      const prev = map.get(d.day) || {
        date: d.day,
        sleep: 7,
        sharpness: 7,
        deepWork: 0,
        water: 0,
      };
      map.set(d.day, {
        ...prev,
        steps: d.steps,
        distance: +(d.distance_m / 1000).toFixed(1),
        calories: Math.round(d.calories_kcal),
      });
    }
    return {
      ...h,
      days: [...map.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30),
    };
  });
  if (navigator.onLine && localStorage.getItem("aegis_token"))
    http.post("/fit/daily", { days }).catch(() => {});
}

function Steps() {
  const t = useStore(todayHealth);
  const goal = useStore((s) => s.settings.stepGoal);
  const [busy, setBusy] = useState(false);
  const [json, setJson] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState("");
  const late = new Date().getHours() >= 18 && t.steps < 2000;
  const connect = async () => {
    setBusy(true);
    try {
      const days = await readGoogleFit(getState().settings.fitClientId);
      mergeFit(days);
      toast.success(`Google Fit synced · ${days.length} days`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const simulate = () => {
    const add = 600 + Math.floor(Math.random() * 1800);
    patchToday((d) => ({
      steps: d.steps + add,
      distance: +(d.distance + add * 0.00075).toFixed(1),
      calories: Math.round(d.calories + add * 0.04),
    }));
    toast.success(`Simulated sync: +${add} steps`);
  };
  const importJson = () => {
    try {
      const raw = JSON.parse(json);
      const arr = (Array.isArray(raw) ? raw : raw.days || [raw]).map((d) => ({
        day: d.day || d.date,
        steps: +d.steps || 0,
        distance_m: +(d.distance_m ?? (d.distance_km || 0) * 1000),
        calories_kcal: +(d.calories_kcal ?? d.calories ?? 0),
      }));
      if (!arr.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day)))
        throw new Error("Each entry needs day/date as YYYY-MM-DD");
      mergeFit(arr);
      setOpen(false);
      toast.success(`Imported ${arr.length} days`);
    } catch (e) {
      toast.error(`Invalid JSON: ${e.message}`);
    }
  };
  const saveEdit = (e) => {
    e.preventDefault();
    const n = parseInt(edit, 10);
    if (Number.isNaN(n) || n < 0) return;
    patchToday(() => ({
      steps: n,
      distance: +(n * 0.00075).toFixed(1),
      calories: Math.round(n * 0.04),
    }));
    setEdit("");
  };
  return (
    <Bento data-testid="steps-panel">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow className="text-emerald-400">Google Fit · Daily Steps</Eyebrow>
        <span className="flex items-center gap-1.5 text-[10px] mono text-emerald-400">
          <span className="dot bg-emerald-400" /> LIVE
        </span>
      </div>
      {late && (
        <div
          data-testid="steps-evening-alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
        >
          <AlertTriangle className="h-4 w-4" /> It's past 6 PM and you're under
          2,000 steps. Take a 15-minute walk.
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <StepRing value={t.steps} goal={goal} size={190} stroke={14}>
          <div>
            <Footprints className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <div data-testid="steps-count" className="mono text-3xl font-bold">
              {t.steps.toLocaleString()}
            </div>
            <div className="mono text-[11px] text-slate-500">
              / {goal.toLocaleString()}
            </div>
          </div>
        </StepRing>
        <div className="flex-1 w-full space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="lcd p-3">
              <div className="eyebrow mb-1">Distance</div>
              <div className="mono text-xl">
                {t.distance} <span className="text-xs text-slate-500">km</span>
              </div>
            </div>
            <div className="lcd p-3">
              <div className="eyebrow mb-1">Active cal</div>
              <div className="mono text-xl">
                {t.calories}{" "}
                <span className="text-xs text-slate-500">kcal</span>
              </div>
            </div>
          </div>
          <form onSubmit={saveEdit} className="flex gap-2">
            <Field
              data-testid="steps-manual-input"
              type="number"
              placeholder="Quick-edit steps"
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
              className="flex-1 mono"
            />
            <Btn data-testid="steps-manual-save">Set</Btn>
          </form>
          <div className="grid grid-cols-3 gap-2">
            <Btn
              tone="emerald"
              data-testid="google-fit-connect-btn"
              onClick={connect}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}{" "}
              Google Fit
            </Btn>
            <Btn data-testid="steps-json-btn" onClick={() => setOpen(true)}>
              <FileJson className="h-3.5 w-3.5" /> JSON
            </Btn>
            <Btn data-testid="steps-simulate-btn" onClick={simulate}>
              <RefreshCw className="h-3.5 w-3.5" /> Simulate
            </Btn>
          </div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0D111A] border-white/10">
          <DialogHeader>
            <DialogTitle>Sync Steps JSON</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400">
            Paste a Health Connect / Fit export:{" "}
            <span className="mono">
              [
              {`{"day":"${dayKey()}","steps":8200,"distance_m":6100,"calories_kcal":320}`}
              ]
            </span>
          </p>
          <textarea
            data-testid="steps-json-textarea"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className="h-40 mono text-xs bg-[#05070b] border border-white/10 rounded-lg p-3 outline-none"
          />
          <Btn
            tone="emerald"
            data-testid="steps-json-import"
            onClick={importJson}
          >
            Import
          </Btn>
        </DialogContent>
      </Dialog>
    </Bento>
  );
}

function Sleep() {
  const days = useStore((s) => s.health.days);
  const [f, setF] = useState({ sleep: "", sharpness: "", deepWork: "" });
  const data = days
    .slice(-7)
    .map((d) => ({
      day: new Date(d.date + "T00:00").toLocaleDateString([], {
        weekday: "short",
      }),
      Sleep: d.sleep,
      "Deep Work": d.deepWork,
      Sharpness: d.sharpness,
    }));
  const save = (e) => {
    e.preventDefault();
    const p = {};
    if (f.sleep !== "") p.sleep = Math.min(14, Math.max(0, +f.sleep));
    if (f.sharpness !== "")
      p.sharpness = Math.min(10, Math.max(1, +f.sharpness));
    if (f.deepWork !== "") p.deepWork = Math.max(0, +f.deepWork);
    patchToday(() => p);
    setF({ sleep: "", sharpness: "", deepWork: "" });
    toast.success("Today's bio-log saved");
  };
  return (
    <Bento data-testid="sleep-correlation">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Sleep vs Deep Work · 7 days</Eyebrow>
        <Moon className="h-4 w-4 text-violet-400" />
      </div>
      <div className="h-64" data-testid="sleep-chart">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="l"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={26}
              domain={[0, 10]}
            />
            <YAxis
              yAxisId="r"
              orientation="right"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={26}
              domain={[0, 8]}
            />
            <Tooltip
              {...chartTip}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <RBar
              yAxisId="l"
              dataKey="Sleep"
              fill="#8B5CF6"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              yAxisId="r"
              dataKey="Deep Work"
              stroke="#06B6D4"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="l"
              dataKey="Sharpness"
              stroke="#10B981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <form onSubmit={save} className="grid grid-cols-4 gap-2 mt-3">
        <Field
          data-testid="sleep-hours-input"
          type="number"
          step="0.1"
          placeholder="Sleep h"
          value={f.sleep}
          onChange={(e) => setF({ ...f, sleep: e.target.value })}
          className="mono"
        />
        <Field
          data-testid="sharpness-input"
          type="number"
          min="1"
          max="10"
          placeholder="Sharp 1-10"
          value={f.sharpness}
          onChange={(e) => setF({ ...f, sharpness: e.target.value })}
          className="mono"
        />
        <Field
          data-testid="deepwork-input"
          type="number"
          step="0.5"
          placeholder="Deep h"
          value={f.deepWork}
          onChange={(e) => setF({ ...f, deepWork: e.target.value })}
          className="mono"
        />
        <Btn tone="violet" data-testid="sleep-log-btn">
          Log
        </Btn>
      </form>
    </Bento>
  );
}

function Hydration() {
  const t = useStore(todayHealth);
  const goal = useStore((s) => s.settings.waterGoal);
  const caffeine = useStore((s) => s.health.caffeine);
  const workouts = useStore((s) => s.health.workouts);
  const [w, setW] = useState({ type: "", mins: "" });
  const todayCaf = caffeine.filter((c) => c.date === dayKey());
  const mg = todayCaf.reduce((a, c) => a + c.mg, 0);
  const lateCaf =
    todayCaf.some((c) => parseInt(c.time, 10) >= 16) ||
    (new Date().getHours() >= 16 && false);
  const pct = Math.min(1, (t.water || 0) / goal);
  const addCaf = (label, mgv) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    patch("health", (h) => ({
      ...h,
      caffeine: [
        ...h.caffeine,
        { id: uid(), date: dayKey(), time, mg: mgv, label },
      ],
    }));
    if (now.getHours() >= 16)
      toast.warning("Late caffeine — may cut deep sleep tonight");
  };
  return (
    <Bento data-testid="hydration-monitor">
      <Eyebrow className="mb-4">Hydration & Caffeine</Eyebrow>
      <div className="flex gap-5">
        <div
          className="relative w-16 h-44 rounded-2xl border border-white/15 overflow-hidden bg-[#05070b]"
          data-testid="water-bottle"
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-cyan-600 to-cyan-400"
            style={{
              height: `${pct * 100}%`,
              transition: "height 200ms cubic-bezier(0.2,0.8,0.2,1)",
              boxShadow: "0 0 20px rgba(6,182,212,0.5)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center mono text-[11px] font-bold">
            {Math.round(pct * 100)}%
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div
              data-testid="water-amount"
              className="mono text-3xl font-semibold"
            >
              {t.water || 0}
              <span className="text-sm text-slate-500"> / {goal} ml</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn
              tone="primary"
              data-testid="water-add-btn"
              onClick={() =>
                patchToday((d) => ({ water: (d.water || 0) + 250 }))
              }
            >
              <Droplet className="h-3.5 w-3.5" /> +250ml Water
            </Btn>
            <Btn
              data-testid="water-undo-btn"
              onClick={() =>
                patchToday((d) => ({
                  water: Math.max(0, (d.water || 0) - 250),
                }))
              }
            >
              −250
            </Btn>
          </div>
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="h-3.5 w-3.5 text-amber-400" />
              <span className="mono text-sm">{mg} mg</span>
              <span className="text-[11px] text-slate-500">caffeine today</span>
              {lateCaf && (
                <Tag tone="red" data-testid="late-caffeine-warning">
                  Late-night caffeine
                </Tag>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Btn
                data-testid="caffeine-coffee-btn"
                onClick={() => addCaf("Coffee", 95)}
              >
                + Coffee 95mg
              </Btn>
              <Btn
                data-testid="caffeine-tea-btn"
                onClick={() => addCaf("Tea", 47)}
              >
                + Tea 47mg
              </Btn>
            </div>
            <div className="mt-2 space-y-0.5">
              {todayCaf.map((c) => (
                <div key={c.id} className="text-[11px] mono text-slate-500">
                  {c.time} · {c.label} · {c.mg}mg
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="h-3.5 w-3.5 text-emerald-400" />
          <span className="eyebrow">Workout Log</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!w.type) return;
            patch("health", (h) => ({
              ...h,
              workouts: [
                { id: uid(), date: dayKey(), type: w.type, mins: +w.mins || 0 },
                ...h.workouts,
              ],
            }));
            setW({ type: "", mins: "" });
          }}
          className="flex gap-2 mb-2"
        >
          <Field
            data-testid="workout-type-input"
            placeholder="Workout"
            value={w.type}
            onChange={(e) => setW({ ...w, type: e.target.value })}
            className="flex-1"
          />
          <Field
            data-testid="workout-mins-input"
            placeholder="min"
            type="number"
            value={w.mins}
            onChange={(e) => setW({ ...w, mins: e.target.value })}
            className="w-20 mono"
          />
          <Btn tone="emerald" data-testid="workout-add-btn">
            <Plus className="h-3.5 w-3.5" />
          </Btn>
        </form>
        {workouts.slice(0, 4).map((x) => (
          <div key={x.id} className="flex justify-between text-xs py-1">
            <span>{x.type}</span>
            <span className="mono text-slate-500">
              {x.date.slice(5)} · {x.mins}m
            </span>
          </div>
        ))}
      </div>
    </Bento>
  );
}

export default function Health() {
  return (
    <div>
      <PageHead
        eyebrow="Module F"
        title="Bio-Performance"
        sub="Steps, sleep, hydration and caffeine — the inputs Zero uses to score your energy and place deep work."
      />
      <div className="grid xl:grid-cols-2 gap-4">
        <Steps />
        <Sleep />
        <Hydration />
      </div>
    </div>
  );
}
