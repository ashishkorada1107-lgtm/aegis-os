import { Trash2 } from "lucide-react";
import { useStore, patch } from "@/lib/store";
import { buildContext, engineOf, modelOf } from "@/lib/zero";
import { Bento, Eyebrow, PageHead, Wave, Btn, Tag } from "@/components/ui-kit";
import ZeroChat from "@/components/ZeroChat";
import { buildSeed } from "@/lib/seed";

function ContextPanel() {
  const s = useStore((x) => x);
  const ctx = buildContext(s);
  const rows = [
    ["Open tasks", ctx.open_tasks.length],
    ["Classes today", ctx.today_classes.length],
    ["Free gaps", ctx.free_gaps_today.join(", ") || "—"],
    ["Next exam", ctx.upcoming_exams[0]?.title || "—"],
    ["DSA due", ctx.dsa_due.length],
    ["Sleep / Steps", `${ctx.bio.sleep_h}h / ${ctx.bio.steps}`],
    ["Energy", `${ctx.bio.energy}/10`],
  ];
  return (
    <Bento data-testid="zero-context-panel">
      <Eyebrow className="text-cyan-400 mb-3">
        Live DB Context Zero Reads
      </Eyebrow>
      <div className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-xs">
            <span className="text-slate-500">{k}</span>
            <span className="mono text-slate-200 text-right truncate">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Engine</span>
        <Tag tone="violet" data-testid="zero-engine-tag">
          {engineOf(s) === "emergent"
            ? `${modelOf(s).provider} · ${modelOf(s).model}`
            : engineOf(s)}
        </Tag>
      </div>
    </Bento>
  );
}

export default function ZeroPage() {
  return (
    <div>
      <PageHead
        eyebrow="Module C"
        title={
          <span className="flex items-center gap-4">
            Zero <Wave active bars={14} />
          </span>
        }
        sub="Your AI Chief-of-Staff. Chat or speak — Zero reads your live data and returns 1-click action cards that write straight to your database."
        right={
          <Btn
            data-testid="zero-clear-chat"
            onClick={() => patch("chat", () => buildSeed().chat)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear chat
          </Btn>
        }
      />
      <div className="grid xl:grid-cols-[1fr_320px] gap-4">
        <Bento className="h-[calc(100dvh-260px)] min-h-[480px] flex flex-col">
          <ZeroChat />
        </Bento>
        <ContextPanel />
      </div>
    </div>
  );
}
