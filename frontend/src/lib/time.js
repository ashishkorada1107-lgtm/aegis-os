export const pad = (n) => String(n).padStart(2, "0");
export const dayKey = (dt = new Date()) =>
  `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
export const shiftKey = (off, base = new Date()) => {
  const x = new Date(base);
  x.setDate(x.getDate() + off);
  return dayKey(x);
};
export const daysBetween = (a, b) =>
  Math.round(
    (new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000,
  );
export const toMin = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return h * 60 + (m || 0);
};
export const fromMin = (m) =>
  `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const uid = () => Math.random().toString(36).slice(2, 10);

const nowMin = (d) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

export function nextClass(tt, now = new Date()) {
  for (let off = 0; off < 8; off++) {
    const day = (now.getDay() + off) % 7;
    const list = tt
      .filter((c) => c.day === day)
      .sort((a, b) => toMin(a.start) - toMin(b.start));
    for (const c of list) {
      const s = toMin(c.start);
      if (off > 0 || s > nowMin(now)) {
        const at = new Date(now);
        at.setDate(now.getDate() + off);
        at.setHours(Math.floor(s / 60), s % 60, 0, 0);
        return { cls: c, at };
      }
    }
  }
  return null;
}

export function currentClass(tt, now = new Date()) {
  const m = nowMin(now);
  return (
    tt.find(
      (c) => c.day === now.getDay() && toMin(c.start) <= m && toMin(c.end) > m,
    ) || null
  );
}

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 23) return `${Math.floor(h / 24)}d ${h % 24}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

export function freeSlots(tt, day, start = 480, end = 1080, min = 60) {
  const list = tt
    .filter((c) => c.day === day)
    .map((c) => [toMin(c.start), toMin(c.end)])
    .sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let cur = start;
  for (const [s, e] of list) {
    if (s - cur >= min) gaps.push({ start: cur, end: s });
    cur = Math.max(cur, e);
  }
  if (end - cur >= min) gaps.push({ start: cur, end });
  return gaps;
}

export const energyScore = (d) =>
  d
    ? Math.round(
        (Math.min(d.sleep || 0, 8) / 8) * 6 + ((d.sharpness || 5) / 10) * 4,
      )
    : 6;

export function recommend(gap, energy, ctx) {
  const len = gap.end - gap.start;
  if (energy >= 7 && len >= 120)
    return {
      kind: "DEEP WORK",
      accent: "violet",
      title: `DSA deep block — ${ctx.dueDsa || "Graphs + DP set"}`,
      why: "Peak energy + 2h window: hardest cognitive work first.",
    };
  if (energy >= 7)
    return {
      kind: "FOCUS SPRINT",
      accent: "cyan",
      title: `Revise ${ctx.weakModule}`,
      why: "High energy, short window: one focused syllabus module.",
    };
  if (energy >= 5 && len >= 120)
    return {
      kind: "BUILD",
      accent: "violet",
      title: `Ship: ${ctx.highTask || "project milestone"}`,
      why: "Moderate energy: execution beats new theory.",
    };
  if (energy >= 5)
    return {
      kind: "REVIEW",
      accent: "cyan",
      title: `10-MCQ rapid quiz — ${ctx.weakCourse}`,
      why: "Active recall fits a mid-energy hour.",
    };
  if (len >= 120)
    return {
      kind: "RECOVER",
      accent: "emerald",
      title: "20-min power nap → admin & lab records",
      why: "Low sleep score: recover first, then light work.",
    };
  return {
    kind: "ADMIN",
    accent: "amber",
    title: "Light admin: inbox, forms, notes cleanup",
    why: "Low energy: protect focus for later.",
  };
}

export const greeting = (d = new Date()) =>
  d.getHours() < 12
    ? "Good morning"
    : d.getHours() < 17
      ? "Good afternoon"
      : "Good evening";
