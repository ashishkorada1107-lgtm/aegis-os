import { API, http } from "./api";
import { QUIZ_BANK } from "./quizBank";
import {
  dayKey,
  freeSlots,
  fromMin,
  energyScore,
  recommend,
  shiftKey,
  daysBetween,
} from "./time";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
export const MARK = "<<<ACTIONS>>>";

export const engineOf = (s) => {
  const e = s.settings.aiEngine || "emergent";
  if (!navigator.onLine) return "offline";
  if (e === "emergent" && !localStorage.getItem("aegis_token"))
    return s.settings.geminiKey ? "gemini_key" : "offline";
  if (e === "gemini_key" && !s.settings.geminiKey) return "offline";
  return e;
};

export const modelOf = (s) => {
  const p = s.settings.aiProvider || "openai";
  return { provider: p, model: (s.settings.aiModels || {})[p] };
};

const INTERVALS = [3, 7, 21];
export const dueDsa = (s) =>
  s.dsa.filter(
    (p) =>
      p.stage < 3 && daysBetween(p.lastReview, dayKey()) >= INTERVALS[p.stage],
  );

export function weakModules(s) {
  return s.courses
    .flatMap((c) =>
      c.modules.map((m) => ({
        course: c.code,
        name: c.name,
        n: m.n,
        title: m.title,
        progress: m.progress,
      })),
    )
    .filter((m) => m.progress < 100)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 4);
}

export function buildContext(s) {
  const today = new Date().getDay();
  const h = s.health.days.find((d) => d.date === dayKey()) || {};
  return {
    today: dayKey(),
    weekday: today,
    mode: s.settings.mode,
    open_tasks: s.tasks
      .filter((t) => !t.done)
      .slice(0, 12)
      .map(({ title, priority, due }) => ({ title, priority, due })),
    today_classes: s.timetable
      .filter((c) => c.day === today)
      .map(({ code, name, start, end, room }) => ({
        code,
        name,
        start,
        end,
        room,
      })),
    free_gaps_today: freeSlots(s.timetable, today).map(
      (g) => `${fromMin(g.start)}-${fromMin(g.end)}`,
    ),
    upcoming_exams: s.exams
      .filter((e) => e.date >= dayKey())
      .map(({ course, title, date }) => ({ course, title, date })),
    weakest_modules: weakModules(s).map(
      (m) => `${m.course} M${m.n} ${m.title} (${m.progress}%)`,
    ),
    dsa_due: dueDsa(s).map((p) => p.title),
    bio: {
      sleep_h: h.sleep,
      sharpness: h.sharpness,
      steps: h.steps,
      water_ml: h.water,
      energy: energyScore(h),
    },
  };
}

function mockReply(text, s) {
  const t = text.toLowerCase();
  const ctx = buildContext(s);
  const gaps = freeSlots(s.timetable, new Date().getDay());
  const energy = ctx.bio.energy;
  const weak = weakModules(s);
  const due = dueDsa(s);
  const high = s.tasks.filter((x) => !x.done && x.priority === "high");
  if (/plan|schedule|study|exam|prep|gap|free|slot/.test(t)) {
    const items = gaps.slice(0, 4).map((g, i) => {
      const r = recommend(g, energy, {
        dueDsa: due[0]?.title,
        weakModule: weak[i % weak.length]?.title,
        weakCourse: weak[0]?.course,
        highTask: high[0]?.title,
      });
      return {
        title: `${fromMin(g.start)}–${fromMin(g.end)} · ${r.kind}: ${r.title}`,
        priority: r.kind === "DEEP WORK" ? "high" : "med",
        due: dayKey(),
      };
    });
    return {
      text: `Energy score ${energy}/10. I found ${gaps.length} free window${gaps.length === 1 ? "" : "s"} today (${ctx.free_gaps_today.join(", ") || "none"}).\n\n${items.map((i) => `• ${i.title}`).join("\n")}\n\nYour weakest module is ${weak[0]?.course} M${weak[0]?.n} — ${weak[0]?.title} (${weak[0]?.progress}%).`,
      actions: items.length
        ? [
            {
              type: "add_tasks",
              label: `Insert ${items.length} study blocks`,
              items,
            },
          ]
        : [],
    };
  }
  if (/task|subtask|break|todo|assignment/.test(t)) {
    const base = high[0]?.title || "Top priority task";
    const items = [
      "Read the brief + list deliverables (15m)",
      "Draft the core solution (45m)",
      "Test edge cases (20m)",
      "Polish + submit (10m)",
    ].map((x, i) => ({
      title: `${base.split("—")[0].trim()} → ${x}`,
      priority: i < 2 ? "high" : "med",
      due: shiftKey(i < 2 ? 0 : 1),
    }));
    return {
      text: `Breaking down “${base}” into 4 executable subtasks. Execute to drop them into your task stack.`,
      actions: [{ type: "add_tasks", label: "Insert 4 subtasks", items }],
    };
  }
  if (/sleep|step|health|energy|water|tired/.test(t)) {
    return {
      text: `Bio-status: ${ctx.bio.sleep_h}h sleep, sharpness ${ctx.bio.sharpness}/10, ${ctx.bio.steps?.toLocaleString()} steps, ${ctx.bio.water_ml}ml water. Energy ${energy}/10.\n\n${energy >= 7 ? "You're primed — schedule the hardest DSA block in your longest gap." : "Low reserves — take a 20-minute power nap and move theory to tomorrow morning."}`,
      actions: [
        {
          type: "add_tasks",
          label: "Add recovery routine",
          items: [
            { title: "10-min walk + 500ml water", priority: "med" },
            { title: "Lights out by 23:30", priority: "high" },
          ],
        },
      ],
    };
  }
  if (/class|lecture|lab|timetable/.test(t)) {
    return {
      text: `You have ${ctx.today_classes.length} classes today. I can add an extra DSA practice lab on Saturday 14:00–16:00 in Lab-1.`,
      actions: [
        {
          type: "add_classes",
          label: "Add Saturday DSA practice",
          items: [
            {
              code: "CS303",
              name: "DSA Practice Lab",
              day: 6,
              start: "14:00",
              end: "16:00",
              room: "Lab-1",
              type: "lab",
            },
          ],
        },
      ],
    };
  }
  if (/quiz|mcq|test/.test(t)) {
    const e = ctx.upcoming_exams[0];
    return {
      text: `Next assessment: ${e ? `${e.title} on ${e.date}` : "none scheduled"}. Open Academics → Rapid Quiz for a 10-MCQ timed run on ${weak[0]?.course}.`,
      actions: [{ type: "set_mode", label: "Enable Exam Mode", mode: "exam" }],
    };
  }
  return {
    text: `Morning briefing:\n• ${high.length} high-priority tasks open — top: ${high[0]?.title || "none"}\n• ${ctx.today_classes.length} classes today, ${ctx.free_gaps_today.length} free gaps\n• ${due.length} DSA problems due for revision\n• Next exam: ${ctx.upcoming_exams[0]?.title || "none"}\n\nAsk me to “plan my day” for 1-click study blocks.`,
    actions: [],
  };
}

export function splitActions(raw) {
  const i = raw.indexOf(MARK);
  if (i < 0) return { text: raw.trim(), actions: [] };
  let actions = [];
  try {
    const j = raw
      .slice(i + MARK.length)
      .trim()
      .replace(/^```(json)?|```$/g, "");
    actions = JSON.parse(j.slice(j.indexOf("["), j.lastIndexOf("]") + 1));
  } catch {}
  return {
    text: raw.slice(0, i).trim(),
    actions: Array.isArray(actions) ? actions : [],
  };
}

async function geminiDirect(key, system, contents, json = false) {
  const r = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: json ? { responseMimeType: "application/json" } : {},
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function streamEmergent(messages, s, onDelta, onIntent) {
  const res = await fetch(`${API}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("aegis_token")}`,
    },
    body: JSON.stringify({ ...modelOf(s), messages, context: buildContext(s) }),
  });
  if (!res.ok || !res.body) throw new Error(`Zero ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "",
    full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const p of parts) {
      if (!p.startsWith("data: ")) continue;
      const ev = JSON.parse(p.slice(6));
      if (ev.intent) onIntent(ev.intent);
      if (ev.error) throw new Error(ev.error);
      if (ev.t) {
        full += ev.t;
        onDelta(full);
      }
    }
  }
  return full;
}

export async function askZero(
  messages,
  s,
  { onDelta = () => {}, onIntent = () => {} } = {},
) {
  const engine = engineOf(s);
  const last = messages[messages.length - 1].text;
  try {
    if (engine === "emergent")
      return {
        ...splitActions(await streamEmergent(messages, s, onDelta, onIntent)),
        engine: modelOf(s).provider,
      };
    if (engine === "gemini_key") {
      const sys = `You are Zero, AI Chief-of-Staff for a CSE student. Context: ${JSON.stringify(buildContext(s))}. After your reply optionally output a line ${MARK} then a JSON array of actions ({"type":"add_tasks","label":"...","items":[{"title","priority","due"}]} or add_classes/add_exams/set_mode).`;
      const contents = messages
        .slice(-8)
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }));
      const raw = await geminiDirect(s.settings.geminiKey, sys, contents);
      return { ...splitActions(raw), engine: "gemini-2.5-flash" };
    }
  } catch (e) {
    return {
      ...mockReply(last, s),
      engine: "offline",
      note: `Live AI unavailable (${e.message}) — instant offline reply.`,
    };
  }
  return { ...mockReply(last, s), engine: "offline" };
}

export async function generateQuiz(subject, topics, s) {
  const engine = engineOf(s);
  try {
    if (engine === "emergent") {
      const { data } = await http.post(
        "/ai/quiz",
        { ...modelOf(s), subject, topics },
        { timeout: 90000 },
      );
      return { questions: data.questions, source: "ai" };
    }
    if (engine === "gemini_key") {
      const raw = await geminiDirect(
        s.settings.geminiKey,
        "Write CSE MCQs. JSON only.",
        [
          {
            role: "user",
            parts: [
              {
                text: `10 MCQs on ${subject}. Topics: ${topics}. Return {"questions":[{"q","options":[4],"answer":0,"explain"}]}`,
              },
            ],
          },
        ],
        true,
      );
      return {
        questions: JSON.parse(raw).questions.slice(0, 10),
        source: "ai",
      };
    }
  } catch {}
  const bank = QUIZ_BANK[subject] || Object.values(QUIZ_BANK).flat();
  return {
    questions: [...bank].sort(() => Math.random() - 0.5).slice(0, 10),
    source: "bank",
  };
}

const toB64 = (file) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.readAsDataURL(file);
  });

export async function ocrTimetable(file, s) {
  const engine = engineOf(s);
  if (engine === "emergent") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append(
      "provider",
      modelOf(s).provider === "gemini" ? "gemini" : "openai",
    );
    const { data } = await http.post("/ai/ocr", fd, { timeout: 120000 });
    return data.classes;
  }
  if (engine === "gemini_key") {
    const raw = await geminiDirect(
      s.settings.geminiKey,
      "Precise timetable OCR. JSON only.",
      [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: file.type, data: await toB64(file) } },
            {
              text: 'Return JSON array [{"code","name","day"(0=Sun..6=Sat),"start":"HH:MM","end":"HH:MM","room","type":"lecture|lab"}]',
            },
          ],
        },
      ],
      true,
    );
    return JSON.parse(raw);
  }
  throw new Error("Live OCR needs internet — use Simulate OCR Extraction");
}

export const SIMULATED_OCR = [
  {
    code: "CS306",
    name: "Compiler Design",
    day: 1,
    start: "11:00",
    end: "12:00",
    room: "LH-206",
    type: "lecture",
  },
  {
    code: "CS306",
    name: "Compiler Design",
    day: 3,
    start: "11:00",
    end: "12:00",
    room: "LH-206",
    type: "lecture",
  },
  {
    code: "CS307",
    name: "Computer Networks",
    day: 2,
    start: "10:00",
    end: "11:00",
    room: "LH-102",
    type: "lecture",
  },
  {
    code: "CS307",
    name: "Networks Lab (Wireshark)",
    day: 4,
    start: "13:00",
    end: "15:00",
    room: "Lab-4",
    type: "lab",
  },
  {
    code: "HS301",
    name: "Professional Ethics",
    day: 5,
    start: "12:00",
    end: "13:00",
    room: "LH-001",
    type: "lecture",
  },
];
