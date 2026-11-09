import { useState } from "react";
import {
  Github,
  RefreshCw,
  Plus,
  Check,
  ChevronDown,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar as RBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { useStore, patch } from "@/lib/store";
import { dayKey, daysBetween, uid } from "@/lib/time";
import { jevDecide } from "@/lib/jev";
import {
  Bento,
  Eyebrow,
  PageHead,
  Btn,
  Field,
  Tag,
  Bar,
  chartTip,
} from "@/components/ui-kit";

const LEVELS = ["#111827", "#2e1065", "#4c1d95", "#6d28d9", "#8b5cf6"];
const INTERVALS = [3, 7, 21];
const DIFF = { Easy: "emerald", Medium: "amber", Hard: "red" };

function Consistency() {
  const settings = useStore((s) => s.settings);
  const coding = useStore((s) => s.coding);
  const dsa = useStore((s) => s.dsa);
  const [gh, setGh] = useState(null);
  const [busy, setBusy] = useState(false);
  const heat = coding.heatmap;
  let streak = 0;
  for (let i = heat.length - 1; i >= 0 && heat[i] > 0; i--) streak++;
  const setH = (k) => (e) =>
    patch("settings", (s) => ({ ...s, [k]: e.target.value }));
  const sync = async () => {
    setBusy(true);
    try {
      const r = await fetch(
        `https://api.github.com/users/${settings.github}/events/public?per_page=100`,
      );
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const ev = await r.json();
      const pushes = ev.filter((e) => e.type === "PushEvent");
      setGh({
        pushes: pushes.length,
        repo: pushes[0]?.repo?.name || ev[0]?.repo?.name || "—",
        last: ev[0]?.created_at?.slice(0, 10),
      });
      toast.success("GitHub activity synced");
    } catch (e) {
      toast.error(`${e.message} — showing local streak`);
    } finally {
      setBusy(false);
    }
  };
  const log = () =>
    patch("coding", (c) => ({
      ...c,
      heatmap: [...c.heatmap.slice(0, -1), c.heatmap[c.heatmap.length - 1] + 1],
      leetSolvedWeek: c.leetSolvedWeek + 1,
    }));
  return (
    <Bento data-testid="consistency-widget">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Eyebrow className="text-violet-400">GitHub & CP Consistency</Eyebrow>
        <div className="ml-auto flex gap-2">
          <Btn data-testid="log-activity-btn" onClick={log}>
            <Plus className="h-3.5 w-3.5" /> Log solve
          </Btn>
          <Btn
            tone="violet"
            data-testid="github-sync-btn"
            onClick={sync}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}{" "}
            Sync
          </Btn>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mb-5">
        {[
          ["github", "GitHub"],
          ["leetcode", "LeetCode"],
          ["codeforces", "Codeforces"],
        ].map(([k, l]) => (
          <label
            key={k}
            className="text-[10px] text-slate-500 uppercase tracking-wider"
          >
            {l}
            <Field
              data-testid={`handle-${k}`}
              value={settings[k]}
              onChange={setH(k)}
              className="w-full mt-1 mono text-xs"
            />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <div className="mono text-3xl font-semibold text-violet-300">
            {streak}
          </div>
          <div className="text-[11px] text-slate-500">day streak</div>
        </div>
        <div>
          <div className="mono text-3xl font-semibold">
            {heat.reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-[11px] text-slate-500">contributions · 20w</div>
        </div>
        <div>
          <div className="mono text-3xl font-semibold">
            {coding.leetSolvedWeek}
            <span className="text-sm text-slate-500">
              /{settings.leetTarget}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">weekly target</div>
          <Bar
            value={(coding.leetSolvedWeek / settings.leetTarget) * 100}
            color="#8B5CF6"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div
          data-testid="activity-heatmap"
          className="grid grid-flow-col gap-[3px] w-max"
          style={{ gridTemplateRows: "repeat(7, 11px)" }}
        >
          {heat.map((v, i) => (
            <div
              key={i}
              title={`${v} contributions`}
              className="w-[11px] h-[11px] rounded-[2px]"
              style={{ background: LEVELS[Math.min(4, Math.ceil(v / 2))] }}
            />
          ))}
        </div>
      </div>
      <div className="text-[11px] text-slate-500 mt-3 flex items-center gap-2">
        <Github className="h-3.5 w-3.5" />
        {gh ? (
          <>
            @{settings.github}: {gh.pushes} recent public pushes · last{" "}
            {gh.repo} · {gh.last}
          </>
        ) : (
          <>DSA vault: {dsa.length} problems logged</>
        )}
      </div>
    </Bento>
  );
}

function AddProblem({ onDone }) {
  const [f, setF] = useState({
    title: "",
    platform: "LeetCode",
    difficulty: "Medium",
    tags: "",
    notes: "",
    code: "",
  });
  const [tagging, setTagging] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const autoTag = async () => {
    if (!f.title) return toast.error("Add a title first");
    setTagging(true);
    const r = await jevDecide("dsa_tags", { title: f.title, notes: f.notes });
    setTagging(false);
    if (r?.tags?.length) setF((x) => ({ ...x, tags: r.tags.join(", ") }));
    else toast("Jev needs internet + login — add tags manually");
  };
  const save = (e) => {
    e.preventDefault();
    if (!f.title) return;
    patch("dsa", (d) => [
      {
        id: uid(),
        ...f,
        tags: f.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        solvedAt: dayKey(),
        lastReview: dayKey(),
        stage: 0,
      },
      ...d,
    ]);
    toast.success("Logged — first revision in +3 days");
    onDone();
  };
  return (
    <form
      onSubmit={save}
      className="grid sm:grid-cols-2 gap-2 mb-4 p-3 rounded-lg border border-violet-500/25 bg-violet-500/[0.04] fade-up"
      data-testid="dsa-add-form"
    >
      <Field
        data-testid="dsa-title-input"
        placeholder="Problem title"
        value={f.title}
        onChange={set("title")}
        className="sm:col-span-2"
      />
      <select
        value={f.platform}
        onChange={set("platform")}
        className="h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm"
      >
        {["LeetCode", "Codeforces", "GFG", "CSES"].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <select
        data-testid="dsa-difficulty-select"
        value={f.difficulty}
        onChange={set("difficulty")}
        className="h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm"
      >
        {["Easy", "Medium", "Hard"].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <div className="sm:col-span-2 flex gap-2">
        <Field
          data-testid="dsa-tags-input"
          placeholder="Pattern tags (comma separated)"
          value={f.tags}
          onChange={set("tags")}
          className="flex-1"
        />
        <Btn
          type="button"
          tone="violet"
          data-testid="dsa-autotag-btn"
          onClick={autoTag}
          disabled={tagging}
        >
          {tagging ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}{" "}
          Auto-tag
        </Btn>
      </div>
      <Field
        placeholder="Key insight / notes"
        value={f.notes}
        onChange={set("notes")}
        className="sm:col-span-2"
      />
      <textarea
        placeholder="Code snippet"
        value={f.code}
        onChange={set("code")}
        className="sm:col-span-2 h-20 mono text-xs bg-[#05070b] border border-white/10 rounded-lg p-2 outline-none"
      />
      <Btn tone="violet" data-testid="dsa-save-btn" className="sm:col-span-2">
        Save to vault
      </Btn>
    </form>
  );
}

function Vault() {
  const dsa = useStore((s) => s.dsa);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const today = dayKey();
  const info = (p) => {
    if (p.stage >= 3) return { due: false, label: "MASTERED", left: null };
    const left = INTERVALS[p.stage] - daysBetween(p.lastReview, today);
    return { due: left <= 0, label: `+${INTERVALS[p.stage]}d`, left };
  };
  const revise = (id) => {
    patch("dsa", (d) =>
      d.map((p) =>
        p.id === id ? { ...p, stage: p.stage + 1, lastReview: today } : p,
      ),
    );
    toast.success("Revision logged");
  };
  const sorted = [...dsa].sort(
    (a, b) =>
      info(b).due - info(a).due || (info(a).left ?? 99) - (info(b).left ?? 99),
  );
  const dueCount = dsa.filter((p) => info(p).due).length;
  return (
    <Bento data-testid="dsa-vault">
      <div className="flex items-center gap-3 mb-4">
        <Eyebrow className="text-violet-400">
          Spaced-Repetition DSA Vault
        </Eyebrow>
        {dueCount > 0 && (
          <Tag tone="amber" data-testid="dsa-due-count">
            {dueCount} due
          </Tag>
        )}
        <Btn
          className="ml-auto"
          data-testid="dsa-add-toggle"
          onClick={() => setAdding((a) => !a)}
        >
          <Plus className="h-3.5 w-3.5" /> Log problem
        </Btn>
      </div>
      {adding && <AddProblem onDone={() => setAdding(false)} />}
      <div className="space-y-1.5">
        {sorted.map((p) => {
          const i = info(p);
          return (
            <div
              key={p.id}
              data-testid="dsa-problem"
              className={`rounded-lg border ${i.due ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-white/[0.06]"}`}
            >
              <div className="flex items-center gap-2 px-3 h-12">
                <button
                  onClick={() => setOpen(open === p.id ? null : p.id)}
                  className="text-slate-500"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open === p.id ? "rotate-180" : ""}`}
                  />
                </button>
                <span className="text-sm font-medium truncate flex-1">
                  {p.title}
                </span>
                <Tag tone={DIFF[p.difficulty]}>{p.difficulty}</Tag>
                <div className="hidden md:flex gap-1">
                  {p.tags.slice(0, 2).map((t) => (
                    <Tag key={t} tone="violet">
                      {t}
                    </Tag>
                  ))}
                </div>
                <span
                  className={`mono text-[10px] w-20 text-right ${i.due ? "text-amber-300" : "text-slate-500"}`}
                >
                  {i.due
                    ? `DUE ${i.label}`
                    : i.left !== null
                      ? `${i.label} · ${i.left}d`
                      : i.label}
                </span>
                <button
                  data-testid="dsa-revise-btn"
                  disabled={p.stage >= 3}
                  onClick={() => revise(p.id)}
                  className="press h-7 w-7 rounded-md border border-white/10 grid place-items-center text-slate-400 hover:text-emerald-300 disabled:opacity-30"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
              {open === p.id && (
                <div className="px-10 pb-3 fade-up">
                  <div className="text-xs text-slate-400 mb-2">
                    {p.platform} · solved {p.solvedAt} · {p.notes}
                  </div>
                  {p.code && (
                    <pre className="mono text-[11px] text-cyan-200 bg-[#05070b] border border-white/5 rounded-md p-2 overflow-x-auto">
                      {p.code}
                    </pre>
                  )}
                  <button
                    onClick={() =>
                      patch("dsa", (d) => d.filter((x) => x.id !== p.id))
                    }
                    className="text-[11px] text-slate-600 hover:text-red-400 mt-2 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Bento>
  );
}

const COLS = [
  ["ideas", "Ideas"],
  ["doing", "In Progress"],
  ["review", "Review"],
  ["done", "Shipped"],
];
function Kanban() {
  const cards = useStore((s) => s.kanban);
  const [over, setOver] = useState(null);
  const [draft, setDraft] = useState("");
  const move = (id, col) =>
    patch("kanban", (k) => k.map((c) => (c.id === id ? { ...c, col } : c)));
  return (
    <Bento data-testid="kanban-board">
      <div className="flex items-center gap-3 mb-4">
        <Eyebrow>Research & Hackathon Kanban</Eyebrow>
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) {
              patch("kanban", (k) => [
                ...k,
                {
                  id: uid(),
                  title: draft.trim(),
                  team: "Team Aegis",
                  col: "ideas",
                  tag: "New",
                },
              ]);
              setDraft("");
            }
          }}
        >
          <Field
            data-testid="kanban-add-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New card…"
            className="w-44"
          />
          <Btn data-testid="kanban-add-btn">
            <Plus className="h-3.5 w-3.5" />
          </Btn>
        </form>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COLS.map(([id, label]) => (
          <div
            key={id}
            data-testid={`kanban-col-${id}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              move(e.dataTransfer.getData("id"), id);
              setOver(null);
            }}
            className={`rounded-lg p-2 min-h-[180px] border ${over === id ? "border-cyan-500/50 bg-cyan-500/[0.04]" : "border-white/[0.06] bg-[#06080E]/60"}`}
          >
            <div className="flex justify-between px-1 mb-2">
              <span className="eyebrow">{label}</span>
              <span className="mono text-[10px] text-slate-600">
                {cards.filter((c) => c.col === id).length}
              </span>
            </div>
            <div className="space-y-2">
              {cards
                .filter((c) => c.col === id)
                .map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("id", c.id)}
                    data-testid="kanban-card"
                    className="press cursor-grab active:cursor-grabbing rounded-md bg-[#0D111A] border border-white/10 p-2.5 hover:border-violet-500/40"
                  >
                    <div className="text-xs font-medium leading-snug">
                      {c.title}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-500">
                        {c.team}
                      </span>
                      <select
                        value={c.col}
                        onChange={(e) => move(c.id, e.target.value)}
                        className="bg-transparent text-[10px] text-slate-500 outline-none"
                        data-testid="kanban-move-select"
                      >
                        {COLS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Bento>
  );
}

function Experiments() {
  const xs = useStore((s) => s.experiments);
  const [f, setF] = useState({
    model: "",
    dataset: "Spatial Demand v2 (Bengaluru grid)",
    mae: "",
    rmse: "",
    acc: "",
    params: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = (e) => {
    e.preventDefault();
    if (!f.model || f.mae === "" || f.rmse === "")
      return toast.error("Model, MAE and RMSE are required");
    patch("experiments", (x) => [
      ...x,
      { id: uid(), ...f, mae: +f.mae, rmse: +f.rmse, acc: +f.acc || 0 },
    ]);
    setF({ ...f, model: "", mae: "", rmse: "", acc: "", params: "" });
  };
  const best = [...xs].sort((a, b) => a.rmse - b.rmse)[0];
  const data = xs.map((x) => ({
    name: x.model.split(" ")[0],
    MAE: x.mae,
    RMSE: x.rmse,
  }));
  return (
    <Bento data-testid="ml-experiment-logger">
      <div className="flex items-center gap-3 mb-4">
        <Eyebrow className="text-violet-400">ML Experiment Logger</Eyebrow>
        {best && (
          <Tag tone="emerald">
            Best RMSE · {best.model.split(" ")[0]} {best.rmse}
          </Tag>
        )}
      </div>
      <div className="grid xl:grid-cols-[1.3fr_1fr] gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="ml-experiment-table">
            <thead className="text-slate-500">
              <tr>
                {[
                  "Model",
                  "Dataset",
                  "MAE",
                  "RMSE",
                  "Acc",
                  "Hyperparams",
                  "",
                ].map((h) => (
                  <th key={h} className="text-left font-medium py-2 pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((x) => (
                <tr key={x.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-medium">{x.model}</td>
                  <td className="pr-3 text-slate-400 max-w-[140px] truncate">
                    {x.dataset}
                  </td>
                  <td className="pr-3 mono">{x.mae}</td>
                  <td
                    className={`pr-3 mono ${x.id === best?.id ? "text-emerald-300" : ""}`}
                  >
                    {x.rmse}
                  </td>
                  <td className="pr-3 mono">{x.acc}</td>
                  <td className="pr-3 mono text-[10px] text-slate-500 max-w-[160px] truncate">
                    {x.params}
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        patch("experiments", (e) =>
                          e.filter((y) => y.id !== x.id),
                        )
                      }
                      className="text-slate-600 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            onSubmit={add}
            className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3"
          >
            <Field
              data-testid="ml-model-input"
              placeholder="Model"
              value={f.model}
              onChange={set("model")}
              className="col-span-3 sm:col-span-2"
            />
            <Field
              data-testid="ml-mae-input"
              placeholder="MAE"
              type="number"
              step="any"
              value={f.mae}
              onChange={set("mae")}
            />
            <Field
              data-testid="ml-rmse-input"
              placeholder="RMSE"
              type="number"
              step="any"
              value={f.rmse}
              onChange={set("rmse")}
            />
            <Field
              placeholder="Acc"
              type="number"
              step="any"
              value={f.acc}
              onChange={set("acc")}
            />
            <Btn tone="violet" data-testid="ml-add-btn">
              <Plus className="h-3.5 w-3.5" /> Log
            </Btn>
            <Field
              placeholder="Hyperparameters"
              value={f.params}
              onChange={set("params")}
              className="col-span-3 sm:col-span-6"
            />
          </form>
        </div>
        <div className="h-64" data-testid="ml-comparison-chart">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                {...chartTip}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <RBar
                dataKey="MAE"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <RBar
                dataKey="RMSE"
                fill="#06B6D4"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Bento>
  );
}

export default function Coding() {
  return (
    <div>
      <PageHead
        eyebrow="Module E"
        title="Code, DSA & ML Research"
        sub="Consistency streaks, spaced-repetition revision at +3 / +7 / +21 days, a team Kanban and a comparative ML experiment log."
      />
      <div className="space-y-4">
        <div className="grid xl:grid-cols-2 gap-4">
          <Consistency />
          <Vault />
        </div>
        <Kanban />
        <Experiments />
      </div>
    </div>
  );
}
