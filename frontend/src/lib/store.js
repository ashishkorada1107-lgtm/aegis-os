import { useSyncExternalStore } from "react";
import { buildSeed } from "./seed";
import { dayKey, daysBetween, uid } from "./time";

export function getStorageKey() {
  try {
    const raw = localStorage.getItem("aegis_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) return `aegis_db_${u.id}`;
      if (u?.email) return `aegis_db_${u.email.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    }
  } catch {}
  return "aegis_db_v1";
}

export function createStore(init) {
  let s = init;
  const ls = new Set();
  return {
    get: () => s,
    set: (fn) => {
      s = typeof fn === "function" ? fn(s) : { ...s, ...fn };
      ls.forEach((l) => l());
    },
    sub: (l) => {
      ls.add(l);
      return () => ls.delete(l);
    },
  };
}

function ensureToday(s) {
  const today = dayKey();
  const h = s.health;
  let days = h.days;
  if (!days.find((d) => d.date === today)) {
    const last = days[days.length - 1] || {};
    days = [
      ...days,
      {
        date: today,
        steps: 0,
        distance: 0,
        calories: 0,
        sleep: last.sleep || 7,
        sharpness: last.sharpness || 7,
        deepWork: 0,
        water: 0,
      },
    ].slice(-30);
  }
  let coding = s.coding;
  const gap = daysBetween(coding.heatmapEnd, today);
  if (gap > 0)
    coding = {
      ...coding,
      heatmap: [...coding.heatmap, ...Array(Math.min(gap, 140)).fill(0)].slice(
        -140,
      ),
      heatmapEnd: today,
    };
  return { ...s, health: { ...h, days }, coding };
}

function load() {
  try {
    const u = JSON.parse(localStorage.getItem("aegis_user") || "{}");
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    const seed = buildSeed(u?.name, u?.email);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (u?.name) {
        parsed.profile = { ...(parsed.profile || seed.profile), name: u.name, email: u.email || parsed.profile?.email || "" };
      }
      return ensureToday({ ...seed, ...parsed });
    }
    return ensureToday(seed);
  } catch {}
  return ensureToday(buildSeed());
}

const db = createStore(load());
let saveT;
let syncHook = () => {};
export const onLocalChange = (fn) => (syncHook = fn);

const persist = () => {
  try {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(db.get()));
  } catch {}
};

export function initUserStore(user) {
  try {
    const key = user?.id
      ? `aegis_db_${user.id}`
      : user?.email
        ? `aegis_db_${user.email.replace(/[^a-zA-Z0-9_-]/g, "_")}`
        : "aegis_db_v1";
    const raw = localStorage.getItem(key);
    const seed = buildSeed(user?.name, user?.email);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (user?.name) {
        parsed.profile = { ...(parsed.profile || seed.profile), name: user.name, email: user.email || "" };
      }
      db.set(ensureToday({ ...seed, ...parsed }));
    } else {
      db.set(ensureToday(seed));
    }
    persist();
  } catch (err) {
    console.error("Failed to init user store:", err);
  }
}

export function clearUserStore() {
  db.set(ensureToday(buildSeed("Operator")));
}

export const getState = db.get;

export function setState(fn) {
  db.set((s) => {
    const next = typeof fn === "function" ? fn(s) : { ...s, ...fn };
    return {
      ...next,
      meta: { ...next.meta, updated_at: Date.now(), seeded: false },
    };
  });
  clearTimeout(saveT);
  saveT = setTimeout(persist, 250);
  syncHook();
}

export function replaceState(s) {
  db.set(ensureToday(s));
  persist();
}

export const patch = (key, fn) =>
  setState((s) => ({ ...s, [key]: fn(s[key]) }));
export const useStore = (sel) =>
  useSyncExternalStore(db.sub, () => sel(db.get()));

export const ui = createStore({
  drawer: false,
  cmd: false,
  sync: "idle",
  lastSync: 0,
});
export const useUI = (sel) => useSyncExternalStore(ui.sub, () => sel(ui.get()));

export const todayHealth = (s) =>
  s.health.days.find((d) => d.date === dayKey()) ||
  s.health.days[s.health.days.length - 1];
export const patchToday = (fn) =>
  patch("health", (h) => ({
    ...h,
    days: h.days.map((d) => (d.date === dayKey() ? { ...d, ...fn(d) } : d)),
  }));

export function pushNotification(title, body) {
  patch("notifications", (n) =>
    [{ id: uid(), title, body, at: Date.now(), read: false }, ...n].slice(
      0,
      30,
    ),
  );
}

export function executeAction(a) {
  const items = a.items || [];
  if (a.type === "add_tasks")
    patch("tasks", (t) => [
      ...items.map((i) => ({
        id: uid(),
        title: i.title,
        priority: i.priority || "med",
        done: false,
        due: i.due || dayKey(),
      })),
      ...t,
    ]);
  else if (a.type === "add_classes")
    patch("timetable", (t) => [
      ...t,
      ...items.map((i) => ({
        id: uid(),
        type: "lecture",
        room: "TBA",
        ...i,
        day: Number(i.day),
      })),
    ]);
  else if (a.type === "add_exams")
    patch("exams", (e) => [...e, ...items.map((i) => ({ id: uid(), ...i }))]);
  else if (a.type === "set_mode")
    patch("settings", (s) => ({ ...s, mode: a.mode || "exam" }));
}

export function resetToSeed() {
  const keep = getState().settings;
  replaceState({
    ...buildSeed(),
    settings: {
      ...buildSeed().settings,
      geminiKey: keep.geminiKey,
      fitClientId: keep.fitClientId,
    },
  });
  setState((s) => s);
}
