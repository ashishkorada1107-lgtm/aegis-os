import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  RefreshCw,
  LogOut,
  Bell,
  Smartphone,
  KeyRound,
  Cpu,
  RotateCcw,
  Cloud,
  Paperclip,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStore,
  patch,
  getState,
  replaceState,
  setState,
  resetToSeed,
  useUI,
} from "@/lib/store";
import { pushState, pullOrPush, http } from "@/lib/api";
import { requestNotifyPermission } from "@/lib/notify";
import { dayKey } from "@/lib/time";
import { logout } from "@/App";
import { Bento, Eyebrow, PageHead, Btn, Field, Tag } from "@/components/ui-kit";

const ENGINES = [
  ["emergent", "Emergent AI (GPT / Claude / Gemini)"],
  ["gemini_key", "My Gemini API key (gemini-2.5-flash)"],
  ["offline", "Offline instant replies"],
];
const MODELS = {
  openai: ["gpt-6-luna", "gpt-5.6-terra", "gpt-5.4-mini"],
  anthropic: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"],
  gemini: [
    "gemini-3-flash-preview",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
  ],
};
const PROVIDERS = [
  ["openai", "ChatGPT"],
  ["anthropic", "Claude"],
  ["gemini", "Gemini"],
];

const sel =
  "h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm w-full";

function AiSettings() {
  const st = useStore((s) => s.settings);
  const set = (k, v) => patch("settings", (s) => ({ ...s, [k]: v }));
  const models = st.aiModels || {};
  const p = st.aiProvider || "openai";
  return (
    <Bento data-testid="ai-settings">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="h-4 w-4 text-cyan-400" />
        <Eyebrow className="text-cyan-400">Zero AI Engine</Eyebrow>
      </div>
      <div className="space-y-2 mb-4">
        {ENGINES.map(([id, label]) => (
          <label
            key={id}
            className={`press flex items-center gap-3 rounded-lg border px-3 h-11 cursor-pointer ${st.aiEngine === id ? "border-cyan-500/50 bg-cyan-500/[0.06]" : "border-white/10"}`}
          >
            <input
              type="radio"
              data-testid={`ai-engine-${id}`}
              checked={st.aiEngine === id}
              onChange={() => set("aiEngine", id)}
              className="accent-cyan-500"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
      {st.aiEngine === "emergent" && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <select
            data-testid="ai-provider-select"
            value={p}
            onChange={(e) => set("aiProvider", e.target.value)}
            className={sel}
          >
            {PROVIDERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            data-testid="ai-model-select"
            value={models[p]}
            onChange={(e) =>
              set("aiModels", { ...models, [p]: e.target.value })
            }
            className={`${sel} mono text-xs`}
          >
            {MODELS[p].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      )}
      <label className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <KeyRound className="h-3 w-3" /> Gemini API key (kept on this device
        only)
      </label>
      <Field
        data-testid="gemini-key-input"
        type="password"
        value={st.geminiKey}
        onChange={(e) => set("geminiKey", e.target.value.trim())}
        placeholder="AIza…"
        className="w-full mt-1 mb-3 mono text-xs"
      />
      <label className="flex items-center justify-between text-sm">
        <span>Speak Zero's replies aloud</span>
        <input
          type="checkbox"
          data-testid="voice-replies-toggle"
          checked={!!st.voiceReplies}
          onChange={(e) => set("voiceReplies", e.target.checked)}
          className="accent-cyan-500 h-4 w-4"
        />
      </label>
    </Bento>
  );
}

function Integrations() {
  const st = useStore((s) => s.settings);
  const set = (k) => (e) =>
    patch("settings", (s) => ({
      ...s,
      [k]:
        k.endsWith("Goal") || k === "leetTarget"
          ? Number(e.target.value) || 0
          : e.target.value,
    }));
  const [install, setInstall] = useState(null);
  useEffect(() => {
    const h = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return (
    <Bento data-testid="integration-settings">
      <Eyebrow className="mb-4">Integrations & Goals</Eyebrow>
      <label className="text-[10px] uppercase tracking-wider text-slate-500">
        Google Fit OAuth Web Client ID
      </label>
      <Field
        data-testid="fit-client-id-input"
        value={st.fitClientId}
        onChange={set("fitClientId")}
        placeholder="1234-abc.apps.googleusercontent.com"
        className="w-full mt-1 mb-1 mono text-xs"
      />
      <p className="text-[10px] text-slate-600 mb-4">
        Google Cloud Console → Credentials → OAuth client (Web). Add this site's
        origin as an Authorized JavaScript origin and enable the Fitness API.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          ["stepGoal", "Step goal"],
          ["waterGoal", "Water ml"],
          ["leetTarget", "Weekly solves"],
        ].map(([k, l]) => (
          <label
            key={k}
            className="text-[10px] uppercase tracking-wider text-slate-500"
          >
            {l}
            <Field
              data-testid={`goal-${k}`}
              type="number"
              value={st[k]}
              onChange={set(k)}
              className="w-full mt-1 mono"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn
          data-testid="settings-enable-notifications"
          onClick={requestNotifyPermission}
        >
          <Bell className="h-3.5 w-3.5" /> Enable notifications
        </Btn>
        <Btn
          data-testid="install-pwa-btn"
          disabled={!install}
          onClick={() => install?.prompt()}
        >
          <Smartphone className="h-3.5 w-3.5" />{" "}
          {install ? "Install Aegis OS" : "Install via browser menu"}
        </Btn>
      </div>
    </Bento>
  );
}

function Backup() {
  const sync = useUI((u) => u.sync);
  const last = useUI((u) => u.lastSync);
  const inp = useRef();
  const exportDb = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...getState(),
            settings: { ...getState().settings, geminiKey: "" },
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aegis-backup-${dayKey()}.json`;
    a.click();
    toast.success("Database exported");
  };
  const importDb = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      if (
        !Array.isArray(data.tasks) ||
        !Array.isArray(data.timetable) ||
        !data.health
      )
        throw new Error("Not an Aegis backup");
      replaceState({
        ...data,
        settings: {
          ...data.settings,
          geminiKey: getState().settings.geminiKey,
        },
      });
      setState((s) => s);
      toast.success("Database restored");
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Bento data-testid="backup-settings">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Offline Database & Backup</Eyebrow>
        <Tag
          tone={
            sync === "synced" ? "emerald" : sync === "error" ? "red" : "slate"
          }
          data-testid="settings-sync-status"
        >
          <Cloud className="h-3 w-3" /> {sync}
        </Tag>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        All data lives on this device and works offline. When online, it backs
        up to your account automatically.{" "}
        {last ? (
          <span className="mono text-slate-500">
            Last sync {new Date(last).toLocaleTimeString()}
          </span>
        ) : null}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Btn tone="primary" data-testid="export-db-btn" onClick={exportDb}>
          <Download className="h-3.5 w-3.5" /> Export Full Database JSON
        </Btn>
        <Btn data-testid="import-db-btn" onClick={() => inp.current.click()}>
          <Upload className="h-3.5 w-3.5" /> Import JSON
        </Btn>
        <Btn
          data-testid="sync-now-btn"
          onClick={() => pushState().then(() => toast("Backup pushed"))}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Push backup now
        </Btn>
        <Btn
          data-testid="pull-now-btn"
          onClick={() => pullOrPush().then(() => toast("Sync checked"))}
        >
          <Cloud className="h-3.5 w-3.5" /> Pull latest
        </Btn>
        <Btn
          data-testid="reset-seed-btn"
          onClick={() => {
            resetToSeed();
            toast("Demo data restored");
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
        </Btn>
        <Btn
          data-testid="logout-btn"
          onClick={logout}
          className="hover:!border-red-500/50"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </Btn>
      </div>
      <input
        ref={inp}
        type="file"
        accept="application/json"
        hidden
        data-testid="import-db-input"
        onChange={(e) => e.target.files[0] && importDb(e.target.files[0])}
      />
    </Bento>
  );
}

function FileVault() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const inp = useRef();
  const online = navigator.onLine && localStorage.getItem("aegis_token");
  const load = () =>
    online &&
    http
      .get("/files")
      .then((r) => setFiles(r.data))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const upload = async (file) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await http.post("/files", fd, { timeout: 120000 });
      toast.success("Uploaded");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };
  const open = async (f) => {
    const r = await http.get(`/files/${f.id}/download`, {
      responseType: "blob",
    });
    window.open(URL.createObjectURL(r.data), "_blank");
  };
  return (
    <Bento data-testid="file-vault">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>File Vault</Eyebrow>
        <Btn
          data-testid="file-upload-btn"
          disabled={!online || busy}
          onClick={() => inp.current.click()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}{" "}
          Upload
        </Btn>
      </div>
      <input
        ref={inp}
        type="file"
        hidden
        data-testid="file-upload-input"
        onChange={(e) => e.target.files[0] && upload(e.target.files[0])}
      />
      {!online && (
        <div className="text-xs text-slate-500">
          Sign in and go online to use cloud file storage.
        </div>
      )}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => open(f)}
            data-testid="file-item"
            className="press w-full flex items-center gap-2 text-left text-xs h-9 px-2 rounded-md hover:bg-white/[0.03]"
          >
            <Tag
              tone={
                f.kind === "timetable"
                  ? "amber"
                  : f.kind === "image" || f.kind === "video"
                    ? "violet"
                    : "slate"
              }
            >
              {f.kind}
            </Tag>
            <span className="flex-1 truncate">{f.original_filename}</span>
            <span className="mono text-slate-600">
              {Math.round(f.size / 1024)}KB
            </span>
          </button>
        ))}
        {online && files.length === 0 && (
          <div className="text-xs text-slate-500">
            No files yet — timetable scans and AI media land here.
          </div>
        )}
      </div>
    </Bento>
  );
}

export default function Settings() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("aegis_user")) || {};
    } catch {
      return {};
    }
  })();
  return (
    <div>
      <PageHead
        eyebrow="System"
        title="Settings"
        sub={`Signed in as ${user.name ? `${user.name} (${user.email || "local"})` : user.email || "offline operator"}. Configure Zero, integrations and your offline database.`}
      />
      <div className="grid xl:grid-cols-2 gap-4">
        <AiSettings />
        <Backup />
        <Integrations />
        <FileVault />
      </div>
    </div>
  );
}
