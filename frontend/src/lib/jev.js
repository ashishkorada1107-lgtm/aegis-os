import { http } from "./api";

const online = () => navigator.onLine && !!localStorage.getItem("aegis_token");

export async function jevDecide(kind, payload) {
  if (!online()) return null;
  try {
    const { data } = await http.post(
      "/jev/decide",
      { kind, payload },
      { timeout: 6000 },
    );
    return data;
  } catch {
    return null;
  }
}

export const guessPriority = (title) =>
  /exam|quiz|deadline|submit|assignment|mid|viva|due|urgent/i.test(title)
    ? "high"
    : /optional|maybe|someday|video|watch/i.test(title)
      ? "low"
      : "med";
