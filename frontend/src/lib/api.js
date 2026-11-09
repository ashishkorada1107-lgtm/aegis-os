import axios from "axios";
import { getState, onLocalChange, replaceState, ui, initUserStore, patch } from "./store";

export const API = `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}/api`;
export const http = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 15000,
});

http.interceptors.request.use((c) => {
  const t = localStorage.getItem("aegis_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

let refreshing = null;
http.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config || {};
    if (
      err.response?.status === 401 &&
      !cfg._retry &&
      !String(cfg.url).includes("/auth/")
    ) {
      cfg._retry = true;
      refreshing =
        refreshing ||
        http
          .post("/auth/refresh", {
            refresh_token: localStorage.getItem("aegis_refresh"),
          })
          .then((r) => saveSession(r.data))
          .finally(() => (refreshing = null));
      try {
        await refreshing;
        return http(cfg);
      } catch {
        window.dispatchEvent(new Event("aegis-logout"));
      }
    }
    throw err;
  },
);

export function saveSession(d) {
  localStorage.setItem("aegis_token", d.access_token);
  localStorage.setItem("aegis_refresh", d.refresh_token);
  localStorage.setItem("aegis_user", JSON.stringify(d.user));
  if (d.user) {
    initUserStore(d.user);
  }
}

export function formatErr(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return String(d);
}

const canSync = () => navigator.onLine && !!localStorage.getItem("aegis_token");
const strip = (s) => ({ ...s, settings: { ...s.settings, geminiKey: "" } });

export async function pushState() {
  if (!canSync()) return;
  ui.set({ sync: "syncing" });
  try {
    const s = getState();
    await http.put("/state", {
      data: strip(s),
      updated_at: s.meta.updated_at || 0,
    });
    ui.set({ sync: "synced", lastSync: Date.now() });
  } catch {
    ui.set({ sync: "error" });
  }
}

export async function pullOrPush() {
  if (!canSync()) return;
  try {
    const { data } = await http.get("/state");
    const local = getState();
    const user = JSON.parse(localStorage.getItem("aegis_user") || "{}");
    if (data?.data && data.updated_at > (local.meta.updated_at || 0)) {
      const merged = {
        ...data.data,
        settings: {
          ...data.data.settings,
          geminiKey: local.settings.geminiKey,
        },
      };
      if (user.name) {
        merged.profile = { ...(merged.profile || {}), name: user.name, email: user.email || "" };
      }
      replaceState(merged);
      ui.set({ sync: "synced", lastSync: Date.now() });
    } else {
      if (data?.data) {
        replaceState(data.data);
      } else {
        if (user.name) {
          patch("profile", (p) => ({ ...p, name: user.name, email: user.email || "" }));
        }
        await pushState();
      }
    }
  } catch {
    ui.set({ sync: "error" });
  }
}

let syncT;
onLocalChange(() => {
  clearTimeout(syncT);
  syncT = setTimeout(pushState, 2500);
});
window.addEventListener("online", () => pullOrPush());
