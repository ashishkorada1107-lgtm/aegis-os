import { useEffect, useState } from "react";
import { http } from "./api";

export async function startMediaJob(kind, prompt) {
  const { data } = await http.post("/media/jobs", { kind, prompt });
  return data.id;
}

export async function waitMediaJob(id, onTick = () => {}) {
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const { data } = await http.get(`/media/jobs/${id}`);
    onTick(i);
    if (data.status === "done") return data;
    if (data.status === "error")
      throw new Error(data.error || "Generation failed");
  }
  throw new Error("Timed out");
}

const cache = new Map();
export function useFileUrl(fileId) {
  const [url, setUrl] = useState(cache.get(fileId) || null);
  useEffect(() => {
    if (!fileId || cache.has(fileId)) return setUrl(cache.get(fileId) || null);
    let alive = true;
    http
      .get(`/files/${fileId}/download`, {
        responseType: "blob",
        timeout: 60000,
      })
      .then((r) => {
        const u = URL.createObjectURL(r.data);
        cache.set(fileId, u);
        if (alive) setUrl(u);
      })
      .catch(() => {});
    return () => (alive = false);
  }, [fileId]);
  return url;
}
