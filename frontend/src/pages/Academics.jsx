import { memo, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Minus,
  Plus,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { useStore, patch, getState } from "@/lib/store";
import { dayKey, uid, pad } from "@/lib/time";
import { colorFor } from "@/lib/seed";
import { generateQuiz } from "@/lib/zero";
import {
  Bento,
  Eyebrow,
  PageHead,
  Btn,
  Bar,
  Tag,
  chartTip,
} from "@/components/ui-kit";

function Md({ text }) {
  const parts = text.split(/```(?:\w+)?\n?/);
  return (
    <div className="md">
      {parts.map((p, i) =>
        i % 2 ? (
          <pre key={i}>{p}</pre>
        ) : (
          p.split("\n").map((l, j) => {
            if (!l.trim()) return null;
            if (l.startsWith("## "))
              return <h2 key={`${i}${j}`}>{l.slice(3)}</h2>;
            if (l.startsWith("- "))
              return <li key={`${i}${j}`}>{l.slice(2)}</li>;
            return <p key={`${i}${j}`}>{l}</p>;
          })
        ),
      )}
    </div>
  );
}

function Syllabus() {
  const courses = useStore((s) => s.courses);
  const [sel, setSel] = useState(courses[0].id);
  const [editing, setEditing] = useState(false);
  const c = courses.find((x) => x.id === sel) || courses[0];
  const col = colorFor(c.code);
  const avg = Math.round(
    c.modules.reduce((a, m) => a + m.progress, 0) / c.modules.length,
  );
  const bump = (n, d) =>
    patch("courses", (cs) =>
      cs.map((x) =>
        x.id === c.id
          ? {
              ...x,
              modules: x.modules.map((m) =>
                m.n === n
                  ? {
                      ...m,
                      progress: Math.max(0, Math.min(100, m.progress + d)),
                    }
                  : m,
              ),
            }
          : x,
      ),
    );
  const setNotes = (v) =>
    patch("courses", (cs) =>
      cs.map((x) => (x.id === c.id ? { ...x, notes: v } : x)),
    );
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {courses.map((x) => {
          const a = Math.round(
            x.modules.reduce((s, m) => s + m.progress, 0) / x.modules.length,
          );
          return (
            <button
              key={x.id}
              data-testid={`course-tab-${x.id}`}
              onClick={() => setSel(x.id)}
              className={`press shrink-0 rounded-lg border px-3 py-2 text-left ${x.id === sel ? "border-white/25 bg-white/[0.04]" : "border-white/10"}`}
            >
              <div
                className="mono text-[11px] font-bold"
                style={{ color: colorFor(x.code) }}
              >
                {x.code}
              </div>
              <div className="text-xs text-slate-300">
                {x.name.split(" ").slice(0, 3).join(" ")}
              </div>
              <div className="mono text-[10px] text-slate-500">{a}%</div>
            </button>
          );
        })}
      </div>
      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
        <Bento data-testid="syllabus-tracker">
          <div className="flex items-center justify-between mb-5">
            <div>
              <Eyebrow className="mb-1">Course & Syllabus</Eyebrow>
              <div className="font-semibold">{c.name}</div>
            </div>
            <div className="mono text-3xl font-semibold" style={{ color: col }}>
              {avg}%
            </div>
          </div>
          <div className="space-y-4">
            {c.modules.map((m) => (
              <div key={m.n} data-testid="syllabus-module">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="mono text-[10px] text-slate-500 w-8">
                    M{m.n}
                  </span>
                  <span className="text-sm flex-1 truncate">{m.title}</span>
                  <button
                    data-testid="module-dec"
                    onClick={() => bump(m.n, -10)}
                    className="press h-6 w-6 rounded border border-white/10 grid place-items-center text-slate-400"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="mono text-xs w-9 text-right">
                    {m.progress}%
                  </span>
                  <button
                    data-testid="module-inc"
                    onClick={() => bump(m.n, 10)}
                    className="press h-6 w-6 rounded border border-white/10 grid place-items-center text-slate-400"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="pl-11">
                  <Bar value={m.progress} color={col} />
                  <div className="text-[10px] text-slate-600 mt-1 truncate">
                    {m.topics.join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Bento>
        <Bento data-testid="lab-notes">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Lab Reference Notes</Eyebrow>
            <Btn
              data-testid="lab-notes-edit-btn"
              onClick={() => setEditing((e) => !e)}
            >
              {editing ? "Preview" : "Edit"}
            </Btn>
          </div>
          {editing ? (
            <textarea
              data-testid="lab-notes-textarea"
              value={c.notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-[420px] mono text-xs bg-[#05070b] border border-white/10 rounded-lg p-3 outline-none focus:border-cyan-500/40"
            />
          ) : (
            <div className="max-h-[460px] overflow-y-auto">
              <Md text={c.notes} />
            </div>
          )}
        </Bento>
      </div>
    </div>
  );
}

const QuizTimer = memo(function QuizTimer({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        onExpire();
      }
    }, 500);
    return () => clearInterval(id);
  }, [seconds, onExpire]);
  return (
    <span
      data-testid="quiz-timer"
      className={`mono text-sm flex items-center gap-1.5 ${left < 60 ? "text-red-400" : "text-cyan-300"}`}
    >
      <Timer className="h-3.5 w-3.5" />
      {pad(Math.floor(left / 60))}:{pad(left % 60)}
    </span>
  );
});

function Quiz() {
  const courses = useStore((s) => s.courses);
  const history = useStore((s) => s.quizHistory);
  const [subject, setSubject] = useState("CS301");
  const [topics, setTopics] = useState("");
  const [qs, setQs] = useState(null);
  const [src, setSrc] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const start = async () => {
    setBusy(true);
    const name = courses.find((c) => c.id === subject)?.name || subject;
    const r = await generateQuiz(subject, topics || name, getState());
    setQs(r.questions);
    setSrc(r.source);
    setIdx(0);
    setAnswers([]);
    setDone(false);
    setBusy(false);
  };
  const finish = (ans = answers) => {
    if (done) return;
    const score = ans.filter((a, i) => a === qs[i].answer).length;
    patch("quizHistory", (h) => [
      ...h,
      { id: uid(), date: dayKey(), subject, score, total: qs.length },
    ]);
    setDone(true);
    toast.success(`Quiz complete: ${score}/${qs.length}`);
  };
  const choose = (o) => {
    if (answers[idx] === undefined)
      setAnswers((a) => {
        const n = [...a];
        n[idx] = o;
        return n;
      });
  };
  const chart = history
    .slice(-10)
    .map((h, i) => ({
      n: `${h.subject} ${h.date.slice(5)}`,
      pct: Math.round((h.score / h.total) * 100),
      i,
    }));
  const q = qs?.[idx];
  const score = qs ? answers.filter((a, i) => a === qs[i].answer).length : 0;
  return (
    <div className="grid xl:grid-cols-[1.3fr_1fr] gap-4">
      <Bento data-testid="quiz-panel" className="min-h-[460px]">
        {!qs || done ? (
          <div>
            <Eyebrow className="text-cyan-400 mb-1">
              AI 10-MCQ Rapid Quizzer
            </Eyebrow>
            {done && (
              <div
                data-testid="quiz-result"
                className="my-4 lcd p-5 text-center"
              >
                <div className="eyebrow mb-1">Final score</div>
                <div className="mono text-5xl font-bold text-cyan-200">
                  {score}/{qs.length}
                </div>
              </div>
            )}
            <div className="text-sm text-slate-400 mb-4">
              Pick a subject module or paste syllabus topics. 10 questions · 10
              minutes · instant grading.
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {courses.map((c) => (
                <button
                  key={c.id}
                  data-testid={`quiz-subject-${c.id}`}
                  onClick={() => setSubject(c.id)}
                  className={`press h-8 px-3 rounded-lg border text-xs mono ${subject === c.id ? "border-cyan-500/50 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-slate-400"}`}
                >
                  {c.code}
                </button>
              ))}
            </div>
            <textarea
              data-testid="quiz-topics-input"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="Optional: paste topics, e.g. Banker's algorithm, paging, TLB, semaphores"
              className="w-full h-24 text-sm bg-[#06080E] border border-white/10 rounded-lg p-3 outline-none focus:border-cyan-500/40 mb-3"
            />
            <Btn
              tone="primary"
              data-testid="quiz-start-btn"
              onClick={start}
              disabled={busy}
              className="w-full h-11"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Zero is writing
                  your quiz…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Launch 10-MCQ Assessment
                </>
              )}
            </Btn>
          </div>
        ) : (
          <div className="fade-up" key={idx}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag tone="cyan">
                  Q{idx + 1}/{qs.length}
                </Tag>
                <Tag>{src === "ai" ? "AI generated" : "offline bank"}</Tag>
              </div>
              <QuizTimer seconds={600} onExpire={() => finish()} />
            </div>
            <div className="h-1 bg-white/5 rounded-full mb-5">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${((idx + 1) / qs.length) * 100}%` }}
              />
            </div>
            <div
              data-testid="quiz-question"
              className="text-lg font-semibold mb-5"
            >
              {q.q}
            </div>
            <div className="space-y-2">
              {q.options.map((o, i) => {
                const a = answers[idx];
                const state =
                  a === undefined
                    ? ""
                    : i === q.answer
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : i === a
                        ? "border-red-500/60 bg-red-500/10 text-red-200"
                        : "opacity-50";
                return (
                  <button
                    key={i}
                    data-testid={`quiz-option-${i}`}
                    onClick={() => choose(i)}
                    className={`press w-full text-left rounded-lg border border-white/10 px-4 py-3 text-sm flex items-center gap-3 hover:border-cyan-500/40 ${state}`}
                  >
                    <span className="mono text-xs text-slate-500">
                      {"ABCD"[i]}
                    </span>
                    <span className="flex-1">{o}</span>
                    {a !== undefined && i === q.answer && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    {a === i && i !== q.answer && (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </button>
                );
              })}
            </div>
            {answers[idx] !== undefined && (
              <div
                data-testid="quiz-explanation"
                className="mt-4 text-xs text-slate-400 border-l-2 border-cyan-500/50 pl-3"
              >
                {q.explain}
              </div>
            )}
            <div className="flex justify-end mt-5">
              {idx < qs.length - 1 ? (
                <Btn
                  tone="primary"
                  data-testid="quiz-next-btn"
                  disabled={answers[idx] === undefined}
                  onClick={() => setIdx(idx + 1)}
                >
                  Next →
                </Btn>
              ) : (
                <Btn
                  tone="emerald"
                  data-testid="quiz-finish-btn"
                  disabled={answers[idx] === undefined}
                  onClick={() => finish()}
                >
                  Finish & grade
                </Btn>
              )}
            </div>
          </div>
        )}
      </Bento>
      <Bento data-testid="quiz-history-chart">
        <Eyebrow className="mb-4">Score History</Eyebrow>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="n"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip {...chartTip} />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="#06B6D4"
                strokeWidth={2}
                dot={{ r: 3, fill: "#06B6D4" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1.5">
          {history
            .slice(-5)
            .reverse()
            .map((h) => (
              <div key={h.id} className="flex justify-between text-xs">
                <span className="mono" style={{ color: colorFor(h.subject) }}>
                  {h.subject}
                </span>
                <span className="text-slate-500 mono">{h.date}</span>
                <span className="mono">
                  {h.score}/{h.total}
                </span>
              </div>
            ))}
        </div>
      </Bento>
    </div>
  );
}

export default function Academics() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "syllabus";
  const exams = useStore((s) => s.exams);
  return (
    <div>
      <PageHead
        eyebrow="Module D"
        title="Academics & Labs"
        sub="Track Module 1–6 progress, keep lab references handy, and drill with timed 10-MCQ rapid quizzes."
        right={
          <div className="flex gap-1 p-1 rounded-lg border border-white/10">
            {["syllabus", "quiz"].map((t) => (
              <button
                key={t}
                data-testid={`academics-tab-${t}`}
                onClick={() => setParams({ tab: t })}
                className={`press h-8 px-4 rounded-md text-xs font-medium capitalize ${tab === t ? "bg-white/10 text-white" : "text-slate-400"}`}
              >
                {t === "quiz" ? "Rapid Quiz" : "Syllabus & Labs"}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {exams
          .filter((e) => e.date >= dayKey())
          .map((e) => (
            <Tag key={e.id} tone="amber" data-testid="exam-badge">
              {e.date.slice(5)} · {e.title}
            </Tag>
          ))}
      </div>
      {tab === "quiz" ? <Quiz /> : <Syllabus />}
    </div>
  );
}
