import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Hexagon, Zap, Loader2, WifiOff, UserPlus, LogIn } from "lucide-react";
import { http, saveSession, pullOrPush, formatErr } from "@/lib/api";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(loc.state?.error || "");

  if (localStorage.getItem("aegis_user")) return <Navigate to="/" replace />;

  const finish = (data) => {
    saveSession(data);
    pullOrPush();
    nav("/", { replace: true });
  };

  const run = async (kind) => {
    setBusy(kind);
    setError("");
    try {
      let data;
      if (kind === "demo") {
        const res = await http.post("/auth/demo");
        data = res.data;
      } else if (isRegister) {
        if (!name.trim()) {
          setError("Please enter your name");
          setBusy("");
          return;
        }
        const res = await http.post("/auth/register", {
          name: name.trim(),
          email: email.trim(),
          password,
        });
        data = res.data;
      } else {
        const res = await http.post("/auth/login", {
          email: email.trim(),
          password,
        });
        data = res.data;
      }
      finish(data);
    } catch (e) {
      setError(
        navigator.onLine
          ? formatErr(e)
          : "You're offline — continue in local-only mode below.",
      );
    } finally {
      setBusy("");
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const google = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const offline = () => {
    const offlineUser = {
      name: name.trim() || "Operator",
      email: email.trim() || "offline@local",
      offline: true,
    };
    saveSession({
      access_token: "offline_token",
      refresh_token: "offline_refresh",
      user: offlineUser,
    });
    nav("/", { replace: true });
  };

  return (
    <div className="aegis-canvas flex items-center justify-center px-5 py-10 min-h-screen">
      <div className="topglow" />
      <div className="w-full max-w-md fade-up" data-testid="login-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bento grid place-items-center">
            <Hexagon className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">Aegis OS</div>
            <div className="eyebrow flex items-center gap-2">
              <span className="dot bg-cyan-400" /> Zero AI · standing by
            </div>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter leading-[1.05] mb-3">
          Your command
          <br />
          center awaits.
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Timetable, tasks, health and code, run by Zero. Works fully offline.
        </p>

        <button
          data-testid="demo-login-button"
          onClick={() => run("demo")}
          disabled={!!busy}
          className="press w-full h-14 rounded-xl bg-cyan-500 text-[#06080E] font-semibold flex items-center justify-center gap-2 hover:bg-cyan-400 shadow-[0_0_40px_-8px_rgba(6,182,212,0.7)]"
        >
          {busy === "demo" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}{" "}
          1-Click Demo Login (Arjun - Admin)
        </button>

        <button
          data-testid="google-login-button"
          onClick={google}
          className="press mt-3 w-full h-12 rounded-xl bento text-sm font-medium hover:text-white"
        >
          Continue with Google
        </button>

        <div className="my-6 border-t border-white/10" />

        {/* Tab switch between Sign In and Create Account */}
        <div className="flex border-b border-white/10 mb-4">
          <button
            type="button"
            data-testid="register-login-link"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`pb-2.5 text-xs font-semibold mr-5 flex items-center gap-1.5 transition-colors ${
              !isRegister
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </button>
          <button
            type="button"
            data-testid="login-register-link"
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isRegister
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" /> Create account
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(isRegister ? "register" : "login");
          }}
          className="space-y-3"
        >
          {isRegister && (
            <input
              data-testid="register-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name (e.g. Maya)"
              className="w-full h-12 px-4 rounded-xl bg-[#0D111A] border border-white/10 focus:border-cyan-500/50 outline-none text-sm"
              required
            />
          )}

          <input
            data-testid={isRegister ? "register-email-input" : "login-email-input"}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full h-12 px-4 rounded-xl bg-[#0D111A] border border-white/10 focus:border-cyan-500/50 outline-none text-sm"
            required
          />

          <input
            data-testid={isRegister ? "register-password-input" : "login-password-input"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="w-full h-12 px-4 rounded-xl bg-[#0D111A] border border-white/10 focus:border-cyan-500/50 outline-none text-sm"
            required
          />

          {error && (
            <div data-testid="login-error" className="text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            data-testid={isRegister ? "register-submit-button" : "login-submit-button"}
            disabled={!!busy || !password || !email}
            className="press w-full h-12 rounded-xl border border-white/15 text-sm font-medium hover:border-cyan-500/50 disabled:opacity-40"
          >
            {busy === "register" || busy === "login" ? (
              "Authenticating…"
            ) : isRegister ? (
              "Create Account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <button
          data-testid="offline-mode-button"
          onClick={offline}
          className="press mt-6 w-full text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-2"
        >
          <WifiOff className="h-3.5 w-3.5" /> Continue offline (local-only, no sync)
        </button>
      </div>
    </div>
  );
}
