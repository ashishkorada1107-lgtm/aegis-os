import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useUI, ui, useStore, patch, patchToday } from "@/lib/store";
import { NAV } from "./nav";
import { fireClassAlert } from "./AlertEngine";
import { nextClass } from "@/lib/time";
import { getState } from "@/lib/store";

export default function CommandBar() {
  const open = useUI((u) => u.cmd);
  const tasks = useStore((s) => s.tasks);
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.set((u) => ({ ...u, cmd: !u.cmd }));
      }
      if (e.key === "Escape") ui.set({ drawer: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const close = () => ui.set({ cmd: false });
  const run = (fn) => () => {
    fn();
    close();
  };
  const actions = [
    ["Open Zero HUD", () => ui.set({ drawer: true })],
    [
      "Toggle Exam Mode",
      () =>
        patch("settings", (s) => ({
          ...s,
          mode: s.mode === "exam" ? "normal" : "exam",
        })),
    ],
    ["Start 10-MCQ Rapid Quiz", () => nav("/academics?tab=quiz")],
    [
      "Log +250ml water",
      () => {
        patchToday((d) => ({ water: (d.water || 0) + 250 }));
        toast("+250ml logged");
      },
    ],
    [
      "Test 15-min class alert",
      () => {
        const n = nextClass(getState().timetable);
        if (n) fireClassAlert(n.cls);
      },
    ],
    ["Export backup JSON", () => nav("/settings")],
  ];
  return (
    <CommandDialog open={open} onOpenChange={(v) => ui.set({ cmd: v })}>
      <CommandInput
        data-testid="command-bar-input"
        placeholder="Search modules, actions, tasks…"
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV.map((n) => (
            <CommandItem
              key={n.to}
              onSelect={run(() => nav(n.to))}
              data-testid={`cmd-nav-${n.id}`}
            >
              <n.icon className="h-4 w-4 mr-2" /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          {actions.map(([l, fn]) => (
            <CommandItem key={l} onSelect={run(fn)} data-testid="cmd-action">
              {l}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Toggle task">
          {tasks
            .filter((t) => !t.done)
            .slice(0, 6)
            .map((t) => (
              <CommandItem
                key={t.id}
                onSelect={run(() =>
                  patch("tasks", (ts) =>
                    ts.map((x) => (x.id === t.id ? { ...x, done: true } : x)),
                  ),
                )}
              >
                ✓ {t.title}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
