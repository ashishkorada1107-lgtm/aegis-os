import { useEffect, useRef, useState } from "react";
import { Send, Mic, Square, Volume2, Check, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, patch, getState, executeAction } from "@/lib/store";
import { askZero, engineOf, MARK } from "@/lib/zero";
import { recordAndTranscribe, browserRecognition, speak } from "@/lib/voice";
import { uid } from "@/lib/time";
import { Tag, Wave } from "./ui-kit";

const PROMPTS = [
  "Plan my day around free slots",
  "Break my top task into subtasks",
  "How's my energy today?",
  "Add an extra DSA lab",
  "Quiz me for my next exam",
];

function ActionCard({ a, msgId, idx }) {
  const run = () => {
    executeAction(a);
    patch("chat", (c) =>
      c.map((m) =>
        m.id === msgId
          ? {
              ...m,
              actions: m.actions.map((x, i) =>
                i === idx ? { ...x, done: true } : x,
              ),
            }
          : m,
      ),
    );
    toast.success(`Executed: ${a.label || a.type}`);
  };
  const items = a.items || [];
  return (
    <div
      data-testid="zero-action-card"
      className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.04] p-3"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <Tag tone="cyan">{a.type.replace("_", " ")}</Tag>
        <button
          data-testid="action-card-execute-btn"
          disabled={a.done}
          onClick={run}
          className="press h-7 px-3 rounded-md text-[11px] font-semibold bg-cyan-500 text-[#06080E] hover:bg-cyan-400 disabled:bg-emerald-500/20 disabled:text-emerald-300 inline-flex items-center gap-1"
        >
          {a.done ? (
            <>
              <Check className="h-3 w-3" /> Executed
            </>
          ) : (
            <>
              <Zap className="h-3 w-3" /> 1-Click Execute
            </>
          )}
        </button>
      </div>
      <div className="text-xs text-slate-300 font-medium mb-1">{a.label}</div>
      {items.slice(0, 6).map((i, k) => (
        <div key={k} className="text-[11px] text-slate-400 mono truncate">
          ›{" "}
          {i.title || `${i.code} ${i.name} · day ${i.day} ${i.start}-${i.end}`}
        </div>
      ))}
      {a.type === "set_mode" && (
        <div className="text-[11px] text-slate-400 mono">› mode = {a.mode}</div>
      )}
    </div>
  );
}

function Message({ m }) {
  const zero = m.role === "zero";
  return (
    <div
      className={`fade-up flex ${zero ? "" : "justify-end"}`}
      data-testid={zero ? "zero-message" : "user-message"}
    >
      <div
        className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${zero ? "bg-[#0D111A] border border-white/10" : "bg-cyan-500/15 border border-cyan-500/25 text-cyan-50"}`}
      >
        {zero && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="eyebrow text-cyan-400">Zero</span>
            {m.intent && (
              <Tag tone="violet" data-testid="zero-intent-tag">
                {m.intent}
              </Tag>
            )}
            {m.engine && (
              <span className="text-[10px] mono text-slate-600">
                {m.engine}
              </span>
            )}
            {m.text && (
              <button
                onClick={() => speak(m.text)}
                className="ml-auto text-slate-500 hover:text-cyan-300"
                data-testid="zero-speak-btn"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {m.text || <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
        </div>
        {m.note && (
          <div className="text-[10px] text-amber-400/80 mt-2">{m.note}</div>
        )}
        {(m.actions || []).map((a, i) => (
          <ActionCard key={i} a={a} msgId={m.id} idx={i} />
        ))}
      </div>
    </div>
  );
}

export default function ZeroChat({ compact = false }) {
  const chat = useStore((s) => s.chat);
  const voiceReplies = useStore((s) => s.settings.voiceReplies);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState("idle");
  const recRef = useRef(null);
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [chat]);

  const send = async (text, viaVoice = false) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setBusy(true);
    const id = uid();
    const userMsg = { id: uid(), role: "user", text: t };
    patch("chat", (c) =>
      [...c, userMsg, { id, role: "zero", text: "", actions: [] }].slice(-60),
    );
    const upd = (p) =>
      patch("chat", (c) => c.map((m) => (m.id === id ? { ...m, ...p } : m)));
    const history = [
      ...getState().chat.filter((m) => m.text && m.id !== id),
    ].slice(-10);
    const res = await askZero(history, getState(), {
      onDelta: (full) => upd({ text: full.split(MARK)[0] }),
      onIntent: (intent) => upd({ intent }),
    });
    upd({
      text: res.text,
      actions: res.actions,
      engine: res.engine,
      note: res.note,
    });
    setBusy(false);
    if (viaVoice || voiceReplies) speak(res.text);
  };

  const toggleMic = async () => {
    if (voice === "listening") {
      if (recRef.current?.stop) {
        try {
          const text = await recRef.current.stop();
          setVoice("idle");
          send(text, true);
        } catch {
          setVoice("idle");
          toast.error("Transcription failed");
        }
      } else {
        recRef.current?.abort?.();
        setVoice("idle");
      }
      return;
    }
    const s = getState();
    if (
      engineOf(s) === "emergent" &&
      navigator.mediaDevices?.getUserMedia &&
      window.MediaRecorder
    ) {
      try {
        recRef.current = await recordAndTranscribe(setVoice);
        return;
      } catch {}
    }
    const r = browserRecognition(
      (text) => send(text, true),
      () => setVoice("idle"),
    );
    if (!r) return toast.error("Voice input not supported in this browser");
    recRef.current = r;
    setVoice("listening");
  };

  return (
    <div
      data-testid="zero-chat-container"
      className="flex flex-col h-full min-h-0"
    >
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
        {chat.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        <div ref={endRef} />
      </div>
      {!compact || chat.length < 3 ? (
        <div className="flex gap-2 overflow-x-auto pb-3">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              data-testid="zero-quick-prompt"
              className="press shrink-0 h-7 px-3 rounded-full border border-white/10 text-[11px] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#06080E] p-1.5 focus-within:border-cyan-500/50"
      >
        <button
          type="button"
          onClick={toggleMic}
          data-testid="zero-mic-button"
          className={`press h-9 w-9 rounded-lg grid place-items-center ${voice !== "idle" ? "bg-red-500/20 text-red-300" : "text-slate-400 hover:text-cyan-300"}`}
        >
          {voice === "listening" ? (
            <Square className="h-4 w-4" />
          ) : voice === "transcribing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
        {voice !== "idle" && <Wave active bars={8} />}
        <input
          data-testid="zero-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            voice === "listening" ? "Listening… tap ■ to send" : "Command Zero…"
          }
          className="flex-1 bg-transparent outline-none text-sm px-1 placeholder:text-slate-600"
        />
        <button
          data-testid="zero-send-button"
          disabled={busy || !input.trim()}
          className="press h-9 w-9 rounded-lg bg-cyan-500 text-[#06080E] grid place-items-center disabled:opacity-30"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
