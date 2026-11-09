import { lazy, Suspense } from "react";
import { NavLink } from "react-router-dom";
import {
  Hexagon,
  Search,
  Bell,
  Bot,
  X,
  ShieldAlert,
  Cloud,
  CloudOff,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStore, useUI, ui, patch } from "@/lib/store";
import { NAV } from "./nav";
import { NextClassPill } from "./Tickers";
import { Wave, Tag } from "./ui-kit";
import AlertEngine from "./AlertEngine";
import CommandBar from "./CommandBar";

const ZeroChat = lazy(() => import("./ZeroChat"));

const MODES = {
  normal: ["Normal", "slate"],
  exam: ["Exam Mode", "amber"],
  emergency: ["Weekend Emergency", "red"],
};
const NEXT = { normal: "exam", exam: "emergency", emergency: "normal" };

function ModeToggle() {
  const mode = useStore((s) => s.settings.mode);
  const [label, tone] = MODES[mode];
  return (
    <button
      data-testid="exam-mode-toggle"
      onClick={() => patch("settings", (s) => ({ ...s, mode: NEXT[s.mode] }))}
      className={`press h-8 px-3 rounded-full border text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2 ${mode === "normal" ? "border-white/10 text-slate-400 hover:text-slate-200" : tone === "amber" ? "border-amber-500/50 text-amber-300 bg-amber-500/10" : "border-red-500/50 text-red-300 bg-red-500/10"}`}
    >
      <ShieldAlert className="h-3.5 w-3.5" />{" "}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Bell_() {
  const notes = useStore((s) => s.notifications);
  const unread = notes.filter((n) => !n.read).length;
  return (
    <Popover
      onOpenChange={(o) =>
        !o &&
        unread &&
        patch("notifications", (n) => n.map((x) => ({ ...x, read: true })))
      }
    >
      <PopoverTrigger asChild>
        <button
          data-testid="notification-bell"
          className="press relative h-8 w-8 rounded-full border border-white/10 grid place-items-center text-slate-400 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              data-testid="notification-count"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-cyan-500 text-[#06080E] text-[9px] font-bold grid place-items-center mono"
            >
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-[#0D111A] border-white/10"
      >
        <div className="px-4 py-3 border-b border-white/10 eyebrow">
          Notifications
        </div>
        <div
          className="max-h-80 overflow-y-auto"
          data-testid="notification-list"
        >
          {notes.length === 0 && (
            <div className="p-4 text-xs text-slate-500">All clear.</div>
          )}
          {notes.map((n) => (
            <div key={n.id} className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${n.urgent === false ? "bg-slate-600" : "bg-cyan-400"}`}
                />
                <div className="text-xs font-semibold flex-1">{n.title}</div>
                {n.urgent !== undefined && (
                  <Tag tone={n.urgent ? "amber" : "slate"}>
                    {n.urgent ? "urgent" : "quiet"}
                    {n.by === "jev" ? " · jev" : ""}
                  </Tag>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{n.body}</div>
              <div className="text-[10px] text-slate-600 mono mt-1">
                {new Date(n.at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SyncBadge() {
  const sync = useUI((u) => u.sync);
  const on = navigator.onLine;
  return (
    <span
      data-testid="sync-status"
      title={`Sync: ${sync}`}
      className="hidden sm:flex items-center gap-1 text-[10px] mono text-slate-500"
    >
      {on ? (
        <Cloud
          className={`h-3.5 w-3.5 ${sync === "synced" ? "text-emerald-400" : sync === "error" ? "text-red-400" : ""}`}
        />
      ) : (
        <CloudOff className="h-3.5 w-3.5 text-amber-400" />
      )}
      {on ? sync.toUpperCase() : "OFFLINE"}
    </span>
  );
}

function TopBar() {
  return (
    <header
      data-testid="global-header"
      className="sticky top-0 z-40 h-14 flex items-center gap-2 sm:gap-3 px-4 lg:px-8 bg-[#06080E]/95 border-b border-white/[0.06]"
    >
      <div className="lg:hidden flex items-center gap-2 font-bold tracking-tight">
        <Hexagon className="h-5 w-5 text-cyan-400" /> Aegis
      </div>
      <button
        data-testid="cmd-k-trigger"
        onClick={() => ui.set({ cmd: true })}
        className="press hidden md:flex items-center gap-2 h-8 w-72 px-3 rounded-lg border border-white/10 text-xs text-slate-500 hover:border-cyan-500/40"
      >
        <Search className="h-3.5 w-3.5" /> Search or run a command…{" "}
        <span className="ml-auto mono text-[10px] border border-white/10 rounded px-1.5">
          Ctrl K
        </span>
      </button>
      <div className="flex-1" />
      <SyncBadge />
      <NextClassPill />
      <ModeToggle />
      <button
        onClick={() => ui.set({ cmd: true })}
        className="md:hidden h-8 w-8 grid place-items-center rounded-full border border-white/10 text-slate-400"
        data-testid="cmd-k-trigger-mobile"
      >
        <Search className="h-4 w-4" />
      </button>
      <Bell_ />
      <NavLink
        to="/settings"
        data-testid="topbar-settings-button"
        className="h-8 w-8 grid place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
        title="Settings"
      >
        <SettingsIcon className="h-4 w-4" />
      </NavLink>
      <button
        data-testid="zero-hud-trigger"
        onClick={() => ui.set({ drawer: true })}
        className="press h-8 px-3 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 hover:bg-cyan-500/25"
      >
        <Bot className="h-3.5 w-3.5" />{" "}
        <span className="hidden sm:inline">Zero</span>
      </button>
    </header>
  );
}

function SideNav() {
  const mode = useStore((s) => s.settings.mode);
  const mainNav = NAV.filter((n) => n.id !== "settings");
  const items =
    mode === "normal"
      ? mainNav
      : [mainNav[3], ...mainNav.filter((n) => n.id !== "academics")];
  const settingsItem = NAV.find((n) => n.id === "settings");

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-white/[0.06] bg-[#06080E] z-30">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.06] shrink-0">
        <Hexagon className="h-5 w-5 text-cyan-400" />
        <span className="font-bold tracking-tight">Aegis OS</span>
        <span className="ml-auto mono text-[9px] text-slate-600">v1.0</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            data-testid={`nav-${n.id}`}
            className={({ isActive }) =>
              `press flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] ${
                isActive
                  ? "bg-white/[0.06] text-white"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]"
              }`
            }
          >
            <n.icon className="h-4 w-4" /> {n.label}
            {mode !== "normal" && n.id === "academics" && (
              <Tag tone={mode === "exam" ? "amber" : "red"} className="ml-auto">
                Pinned
              </Tag>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Pinned Bottom Area with Settings and Zero AI card */}
      <div className="p-3 border-t border-white/[0.06] shrink-0 space-y-2">
        {settingsItem && (
          <NavLink
            to={settingsItem.to}
            data-testid="nav-settings"
            className={({ isActive }) =>
              `press flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent"
              }`
            }
          >
            <settingsItem.icon className="h-4 w-4" /> {settingsItem.label}
          </NavLink>
        )}
        <div className="p-3 bento">
          <div className="flex items-center gap-2 eyebrow text-cyan-400">
            <span className="dot bg-cyan-400" /> Zero AI · Online
          </div>
          <Wave active={false} className="mt-2.5" />
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const bottomItems = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[5], NAV[7]];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-[#06080E] border-t border-white/[0.08] grid grid-cols-6">
      {bottomItems.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === "/"}
          data-testid={`mnav-${n.id}`}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] ${
              isActive ? "text-cyan-300 font-medium" : "text-slate-500"
            }`
          }
        >
          <n.icon className="h-4 w-4" /> {n.label.split(" ")[0]}
        </NavLink>
      ))}
    </nav>
  );
}

function ZeroDrawer() {
  const open = useUI((u) => u.drawer);
  return (
    <>
      <div
        className={`scrim fixed inset-0 z-50 bg-black/60 ${open ? "open" : ""}`}
        onClick={() => ui.set({ drawer: false })}
      />
      <aside
        data-testid="zero-slideover-hud"
        className={`drawer fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-[#080B12] border-l border-cyan-500/20 flex flex-col ${open ? "open" : ""}`}
      >
        <div
          className="h-14 flex items-center gap-3 px-5 border-b border-white/[0.08]"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(6,182,212,0.12), transparent 70%)",
          }}
        >
          <span className="dot bg-cyan-400" />
          <div className="font-semibold tracking-tight">
            Zero{" "}
            <span className="text-slate-500 font-normal text-xs">
              · Chief-of-Staff HUD
            </span>
          </div>
          <Wave active={open} bars={10} className="ml-auto" />
          <button
            data-testid="zero-hud-close"
            onClick={() => ui.set({ drawer: false })}
            className="text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-4">
          {open && (
            <Suspense fallback={null}>
              <ZeroChat compact />
            </Suspense>
          )}
        </div>
      </aside>
    </>
  );
}

export default function Shell({ children }) {
  const mode = useStore((s) => s.settings.mode);
  return (
    <div className={`aegis-canvas mode-${mode}`}>
      <div className="topglow" />
      <SideNav />
      <div className="lg:pl-60">
        <TopBar />
        <main className="px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-10 max-w-[1600px]">
          {children}
        </main>
      </div>
      <BottomNav />
      <ZeroDrawer />
      <CommandBar />
      <AlertEngine />
    </div>
  );
}
