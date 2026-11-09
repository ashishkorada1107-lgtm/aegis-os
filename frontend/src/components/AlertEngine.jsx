import { useEffect } from "react";
import { getState } from "@/lib/store";
import { dayKey, toMin } from "@/lib/time";
import { notify } from "@/lib/notify";

const KEY = "aegis_alerted";
const seen = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};
const mark = (id) => {
  const s = seen();
  s[id] = 1;
  localStorage.setItem(
    KEY,
    JSON.stringify(Object.fromEntries(Object.entries(s).slice(-200))),
  );
};

export const fireClassAlert = (c, mins = 15) =>
  notify(
    `${c.code} starts in ${mins} min`,
    `${c.name} · ${c.room} · ${c.start}–${c.end}`,
    { urgent: true },
  );

function check() {
  const s = getState();
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const today = dayKey();
  for (const c of s.timetable.filter((x) => x.day === now.getDay())) {
    const delta = toMin(c.start) - m;
    const id = `${today}:${c.id}`;
    if (delta > 0 && delta <= 15 && !seen()[id]) {
      mark(id);
      fireClassAlert(c, delta);
    }
  }
  const h = s.health.days.find((d) => d.date === today);
  if (
    now.getHours() >= 18 &&
    h &&
    h.steps < 2000 &&
    !seen()[`steps:${today}`]
  ) {
    mark(`steps:${today}`);
    notify(
      "Movement alert: under 2,000 steps",
      `Only ${h.steps} steps so far. A 15-minute walk adds ~1,800.`,
    );
  }
}

export default function AlertEngine() {
  useEffect(() => {
    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, []);
  return null;
}
