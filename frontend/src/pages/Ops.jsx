import { useState } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Terminal,
  Image as ImageIcon,
  Film,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, patch, getState } from "@/lib/store";
import { uid } from "@/lib/time";
import { http } from "@/lib/api";
import { startMediaJob, waitMediaJob, useFileUrl } from "@/lib/media";
import { Bento, Eyebrow, PageHead, Btn, Field, Tag } from "@/components/ui-kit";

const COLORS = {
  cyan: "#06B6D4",
  violet: "#8B5CF6",
  emerald: "#10B981",
  amber: "#F59E0B",
};
const VERDICT = { success: "emerald", warning: "amber", failure: "red" };

async function fire(h) {
  let payload = null;
  if (h.payload?.trim()) {
    try {
      payload = JSON.parse(h.payload);
    } catch {
      return {
        ok: false,
        status: 0,
        ms: 0,
        body: "Invalid JSON payload",
        verdict: "failure",
      };
    }
  }
  if (navigator.onLine && localStorage.getItem("aegis_token")) {
    const { data } = await http.post(
      "/webhooks/fire",
      { url: h.url, method: h.method, payload },
      { timeout: 30000 },
    );
    return data;
  }
  const t = performance.now();
  try {
    const r = await fetch(h.url, {
      method: h.method,
      headers: { "Content-Type": "application/json" },
      body: h.method === "GET" ? undefined : JSON.stringify(payload),
    });
    return {
      ok: r.ok,
      status: r.status,
      ms: Math.round(performance.now() - t),
      body: (await r.text()).slice(0, 2000),
      verdict: r.ok ? "success" : "failure",
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - t),
      body: `Direct call failed: ${e.message}`,
      verdict: "failure",
    };
  }
}

function Webhooks() {
  const hooks = useStore((s) => s.webhooks);
  const log = useStore((s) => s.webhookLog);
  const [busy, setBusy] = useState(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({
    name: "",
    url: "",
    method: "POST",
    payload: "{}",
    color: "cyan",
  });
  const launch = async (h) => {
    setBusy(h.id);
    const start = new Date().toLocaleTimeString();
    const r = await fire(h).catch((e) => ({
      ok: false,
      status: 0,
      ms: 0,
      body: e.message,
      verdict: "failure",
    }));
    patch("webhookLog", (l) =>
      [
        {
          id: uid(),
          at: start,
          name: h.name,
          method: h.method,
          url: h.url,
          ...r,
        },
        ...l,
      ].slice(0, 40),
    );
    setBusy(null);
    toast[r.verdict === "failure" ? "error" : "success"](
      `${h.name}: ${r.status || "ERR"} · ${r.verdict || ""}`,
    );
  };
  const add = (e) => {
    e.preventDefault();
    if (!/^https?:\/\//.test(f.url) || !f.name)
      return toast.error("Name and http(s) URL required");
    patch("webhooks", (w) => [...w, { ...f, id: uid() }]);
    setAdding(false);
    setF({ name: "", url: "", method: "POST", payload: "{}", color: "cyan" });
  };
  return (
    <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
      <Bento data-testid="webhook-grid">
        <div className="flex items-center justify-between mb-4">
          <Eyebrow className="text-cyan-400">
            Local Agent Remote Control
          </Eyebrow>
          <Btn
            data-testid="webhook-add-toggle"
            onClick={() => setAdding((a) => !a)}
          >
            <Plus className="h-3.5 w-3.5" /> Add trigger
          </Btn>
        </div>
        {adding && (
          <form
            onSubmit={add}
            className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-lg border border-cyan-500/25 fade-up"
            data-testid="webhook-add-form"
          >
            <Field
              data-testid="webhook-name-input"
              placeholder="Name"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              className="col-span-2"
            />
            <select
              value={f.method}
              onChange={(e) => setF({ ...f, method: e.target.value })}
              className="h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm mono"
            >
              {["POST", "GET", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select
              value={f.color}
              onChange={(e) => setF({ ...f, color: e.target.value })}
              className="h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm"
            >
              {Object.keys(COLORS).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Field
              data-testid="webhook-url-input"
              placeholder="https://xxxx.ngrok-free.app/run"
              value={f.url}
              onChange={(e) => setF({ ...f, url: e.target.value })}
              className="col-span-4 mono text-xs"
            />
            <textarea
              data-testid="webhook-payload-input"
              value={f.payload}
              onChange={(e) => setF({ ...f, payload: e.target.value })}
              className="col-span-4 h-16 mono text-xs bg-[#05070b] border border-white/10 rounded-lg p-2 outline-none"
            />
            <Btn
              tone="primary"
              data-testid="webhook-save-btn"
              className="col-span-4"
            >
              Save trigger
            </Btn>
          </form>
        )}
        <div className="grid grid-cols-2 gap-3">
          {hooks.map((h) => (
            <div key={h.id} className="relative group">
              <button
                data-testid="webhook-launch-btn"
                onClick={() => launch(h)}
                disabled={busy === h.id}
                className="hw-btn w-full p-4 text-left min-h-[110px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: COLORS[h.color],
                      boxShadow: `0 0 10px ${COLORS[h.color]}`,
                    }}
                  />
                  {busy === h.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                  ) : (
                    <Zap
                      className="h-4 w-4"
                      style={{ color: COLORS[h.color] }}
                    />
                  )}
                </div>
                <div className="text-sm font-semibold">{h.name}</div>
                <div className="mono text-[10px] text-slate-500 truncate mt-1">
                  {h.method} {h.url.replace(/^https?:\/\//, "")}
                </div>
              </button>
              <button
                onClick={() =>
                  patch("webhooks", (w) => w.filter((x) => x.id !== h.id))
                }
                className="absolute top-2 right-9 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </Bento>
      <div
        className="bento p-0 overflow-hidden flex flex-col"
        data-testid="webhook-terminal"
      >
        <div className="h-10 px-4 flex items-center gap-2 border-b border-white/10 bg-[#05070b]">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <Terminal className="h-3.5 w-3.5 text-slate-500 ml-3" />
          <span className="mono text-[11px] text-slate-500">
            aegis@zero:~/webhooks — verdicts by Jev
          </span>
          <button
            onClick={() => patch("webhookLog", () => [])}
            className="ml-auto mono text-[10px] text-slate-600 hover:text-slate-300"
            data-testid="webhook-log-clear"
          >
            clear
          </button>
        </div>
        <div className="flex-1 min-h-[320px] max-h-[460px] overflow-y-auto p-4 bg-[#03050a] mono text-[11px] space-y-3">
          {log.length === 0 && (
            <div className="text-slate-600">
              $ waiting for trigger… tap a launch button
            </div>
          )}
          {log.map((l) => (
            <div key={l.id} data-testid="webhook-log-entry" className="fade-up">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-600">[{l.at}]</span>
                <span className="text-cyan-300">{l.method}</span>
                <span className="text-slate-300">{l.name}</span>
                <span className={l.ok ? "text-emerald-400" : "text-red-400"}>
                  {l.status || "ERR"}
                </span>
                <span className="text-slate-600">{l.ms}ms</span>
                {l.verdict && (
                  <Tag tone={VERDICT[l.verdict]} data-testid="webhook-verdict">
                    {l.verdict}
                    {l.ai_classified ? " · jev" : ""}
                  </Tag>
                )}
              </div>
              <pre className="text-slate-500 whitespace-pre-wrap break-all mt-1 max-h-24 overflow-hidden">
                {l.body}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STAGES = [
  ["scripting", "Scripting"],
  ["recording", "Recording"],
  ["editing", "Editing"],
  ["uploaded", "Uploaded"],
];

function MediaSlot({ fileId, kind, thumb }) {
  const url = useFileUrl(fileId);
  if (url && kind === "video")
    return (
      <video
        src={url}
        controls
        className="w-full aspect-video rounded-md bg-black"
        data-testid="video-clip-player"
      />
    );
  if (url)
    return (
      <img
        src={url}
        alt="thumbnail"
        className="w-full aspect-video object-cover rounded-md"
        data-testid="video-thumbnail-img"
      />
    );
  return (
    <div
      className="w-full aspect-video rounded-md grid place-items-center text-center p-3"
      style={{
        background:
          "radial-gradient(ellipse at top left, rgba(139,92,246,0.35), #0b0f17 70%)",
      }}
    >
      <span
        className="font-black text-lg tracking-tight leading-none uppercase"
        style={{ textShadow: "0 2px 0 #000" }}
      >
        {thumb}
      </span>
    </div>
  );
}

function VideoCard({ v }) {
  const [busy, setBusy] = useState("");
  const gen = async (kind) => {
    if (!navigator.onLine || !localStorage.getItem("aegis_token"))
      return toast.error("Needs internet + a signed-in account");
    setBusy(kind);
    const prompt =
      kind === "image"
        ? `Bold YouTube thumbnail, 16:9, cinematic dark tech aesthetic with cyan and violet neon rim light. Large punchy text: "${v.thumb}". Topic: ${v.title}. Setup: ${v.team}.`
        : `Cinematic 5-second b-roll intro for a tech YouTube video titled "${v.title}". Dark desk setup, glowing monitors with code, cyan and violet light, slow dolly-in camera.`;
    try {
      const id = await startMediaJob(kind, prompt);
      toast(
        kind === "image"
          ? "Generating thumbnail… (~30s)"
          : "Generating 5s clip… (1–3 min)",
      );
      const job = await waitMediaJob(id);
      patch("videos", (vs) =>
        vs.map((x) =>
          x.id === v.id
            ? {
                ...x,
                [kind === "image" ? "thumbFileId" : "clipFileId"]: job.file_id,
              }
            : x,
        ),
      );
      toast.success(kind === "image" ? "Thumbnail ready" : "Clip ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally {
      setBusy("");
    }
  };
  const advance = () => {
    const i = STAGES.findIndex(([s]) => s === v.status);
    patch("videos", (vs) =>
      vs.map((x) =>
        x.id === v.id
          ? { ...x, status: STAGES[(i + 1) % STAGES.length][0] }
          : x,
      ),
    );
  };
  return (
    <div
      data-testid="video-card"
      className="rounded-lg bg-[#0D111A] border border-white/10 p-2.5 space-y-2 hover:border-violet-500/40"
    >
      <MediaSlot
        fileId={v.clipFileId || v.thumbFileId}
        kind={v.clipFileId ? "video" : "image"}
        thumb={v.thumb}
      />
      <div className="text-xs font-semibold leading-snug">{v.title}</div>
      <div className="text-[10px] text-slate-500">{v.team}</div>
      <div className="flex flex-wrap gap-1">
        <Tag tone="violet">{v.thumb}</Tag>
        <Tag tone="slate">♫ {v.bgm}</Tag>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <Btn
          data-testid="video-gen-thumb-btn"
          onClick={() => gen("image")}
          disabled={!!busy}
          className="!h-7 !px-1 !text-[10px]"
        >
          {busy === "image" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}{" "}
          Thumb
        </Btn>
        <Btn
          data-testid="video-gen-clip-btn"
          onClick={() => gen("video")}
          disabled={!!busy}
          className="!h-7 !px-1 !text-[10px]"
        >
          {busy === "video" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Film className="h-3 w-3" />
          )}{" "}
          Clip
        </Btn>
        <Btn
          data-testid="video-advance-btn"
          onClick={advance}
          className="!h-7 !px-1 !text-[10px]"
        >
          Next <ChevronRight className="h-3 w-3" />
        </Btn>
      </div>
    </div>
  );
}

function Pipeline() {
  const videos = useStore((s) => s.videos);
  const [f, setF] = useState({ title: "", team: "", thumb: "", bgm: "" });
  const add = (e) => {
    e.preventDefault();
    if (!f.title) return;
    patch("videos", (v) => [
      ...v,
      { id: uid(), ...f, thumb: f.thumb || "NEW DROP", status: "scripting" },
    ]);
    setF({ title: "", team: "", thumb: "", bgm: "" });
  };
  return (
    <Bento data-testid="youtube-pipeline">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow className="text-violet-400">YouTube Showcase Pipeline</Eyebrow>
        <span className="text-[10px] mono text-slate-600">
          AI thumbnails + 5s intro clips
        </span>
      </div>
      <form
        onSubmit={add}
        className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4"
      >
        <Field
          data-testid="video-title-input"
          placeholder="Video title"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          className="col-span-2"
        />
        <Field
          placeholder="Team / setup"
          value={f.team}
          onChange={(e) => setF({ ...f, team: e.target.value })}
        />
        <Field
          placeholder="Thumbnail text"
          value={f.thumb}
          onChange={(e) => setF({ ...f, thumb: e.target.value })}
        />
        <div className="flex gap-2">
          <Field
            placeholder="BGM track"
            value={f.bgm}
            onChange={(e) => setF({ ...f, bgm: e.target.value })}
            className="flex-1 min-w-0"
          />
          <Btn tone="violet" data-testid="video-add-btn">
            <Plus className="h-3.5 w-3.5" />
          </Btn>
        </div>
      </form>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {STAGES.map(([id, label]) => (
          <div
            key={id}
            data-testid={`pipeline-col-${id}`}
            className="rounded-lg border border-white/[0.06] bg-[#06080E]/60 p-2"
          >
            <div className="flex justify-between px-1 mb-2">
              <span className="eyebrow">{label}</span>
              <span className="mono text-[10px] text-slate-600">
                {videos.filter((v) => v.status === id).length}
              </span>
            </div>
            <div className="space-y-2">
              {videos
                .filter((v) => v.status === id)
                .map((v) => (
                  <VideoCard key={v.id} v={v} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </Bento>
  );
}

export default function Ops() {
  return (
    <div>
      <PageHead
        eyebrow="Module G"
        title="Ops & Creator Pipeline"
        sub="Hardware-style launch buttons for your local scripts over Ngrok / Tailscale, plus a production board for showcase videos."
      />
      <div className="space-y-4">
        <Webhooks />
        <Pipeline />
      </div>
    </div>
  );
}
