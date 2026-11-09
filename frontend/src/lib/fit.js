const SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";
const TYPES = [
  "com.google.step_count.delta",
  "com.google.distance.delta",
  "com.google.calories.expended",
];

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () =>
      reject(new Error("Could not load Google sign-in (offline?)"));
    document.head.appendChild(s);
  });
}

export const preloadGis = () => loadGis().catch(() => {});

const val = (p) => Number(p?.value?.[0]?.intVal ?? p?.value?.[0]?.fpVal ?? 0);
const sum = (ds) => (ds?.point || []).reduce((a, p) => a + val(p), 0);

export async function readGoogleFit(clientId) {
  if (!/^[0-9]+-[\w-]+\.apps\.googleusercontent\.com$/.test(clientId || ""))
    throw new Error("Add a valid Google OAuth Web Client ID in Settings first");
  await loadGis();
  const token = await new Promise((resolve, reject) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) =>
        r?.access_token
          ? resolve(r.access_token)
          : reject(
              new Error(
                r?.error_description || r?.error || "Authorization failed",
              ),
            ),
      error_callback: (e) =>
        reject(new Error(e?.type || "Authorization popup failed")),
    });
    tc.requestAccessToken({ prompt: "" });
  });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startTimeMillis: start.getTime(),
        endTimeMillis: Date.now(),
        aggregateBy: TYPES.map((dataTypeName) => ({ dataTypeName })),
        bucketByTime: {
          period: {
            type: "day",
            value: 1,
            timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Google Fit ${res.status}`);
  const json = await res.json();
  return (json.bucket || []).map((b) => {
    const d = new Date(Number(b.startTimeMillis));
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      day,
      steps: Math.round(sum(b.dataset?.[0])),
      distance_m: sum(b.dataset?.[1]),
      calories_kcal: sum(b.dataset?.[2]),
    };
  });
}
