import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Shell from "@/components/Shell";
import Login from "@/pages/Login";
import { Toaster } from "@/components/ui/sonner";
import { http, saveSession, pullOrPush } from "@/lib/api";
import { clearUserStore } from "@/lib/store";

const Home = lazy(() => import("@/pages/Home"));
const Timetable = lazy(() => import("@/pages/Timetable"));
const ZeroPage = lazy(() => import("@/pages/ZeroPage"));
const Academics = lazy(() => import("@/pages/Academics"));
const Coding = lazy(() => import("@/pages/Coding"));
const Health = lazy(() => import("@/pages/Health"));
const Ops = lazy(() => import("@/pages/Ops"));
const Settings = lazy(() => import("@/pages/Settings"));

export function logout() {
  localStorage.removeItem("aegis_token");
  localStorage.removeItem("aegis_refresh");
  localStorage.removeItem("aegis_user");
  clearUserStore();
  window.location.href = "/login";
}

function ProtectedRoute({ children }) {
  const user = localStorage.getItem("aegis_user");
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AuthHandler() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let sessionId = searchParams.get("session_id");
    if (!sessionId && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, "?"));
      sessionId = hashParams.get("session_id");
    }
    if (sessionId) {
      http
        .post("/auth/google", { session_id: sessionId })
        .then((res) => {
          saveSession(res.data);
          pullOrPush();
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = "/";
        })
        .catch((err) => {
          console.error("Google auth exchange failed:", err);
        });
    }

    const handleLogout = () => logout();
    window.addEventListener("aegis-logout", handleLogout);
    return () => window.removeEventListener("aegis-logout", handleLogout);
  }, []);

  return null;
}

function PageLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL || ""}>
      <AuthHandler />
      <Toaster position="top-right" />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Shell>
                  <Suspense fallback={<PageLoading />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/timetable" element={<Timetable />} />
                      <Route path="/zero" element={<ZeroPage />} />
                      <Route path="/academics" element={<Academics />} />
                      <Route path="/coding" element={<Coding />} />
                      <Route path="/health" element={<Health />} />
                      <Route path="/ops" element={<Ops />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </Shell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
