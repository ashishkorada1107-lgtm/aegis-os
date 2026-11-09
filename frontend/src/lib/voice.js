import { http } from "./api";

let audio;
export function stopSpeaking() {
  audio?.pause();
  window.speechSynthesis?.cancel();
}

export async function speak(text) {
  stopSpeaking();
  const clean = text.replace(/[•*#`]/g, "").slice(0, 1200);
  if (navigator.onLine && localStorage.getItem("aegis_token")) {
    try {
      const r = await http.post(
        "/ai/tts",
        { text: clean },
        { responseType: "blob", timeout: 30000 },
      );
      audio = new Audio(URL.createObjectURL(r.data));
      await audio.play();
      return;
    } catch {}
  }
  if (window.speechSynthesis)
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
}

export async function recordAndTranscribe(onState) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  rec.start();
  onState("listening");
  return {
    stop: async () => {
      rec.stop();
      await done;
      stream.getTracks().forEach((t) => t.stop());
      onState("transcribing");
      const fd = new FormData();
      fd.append("file", new Blob(chunks, { type: "audio/webm" }), "voice.webm");
      const { data } = await http.post("/ai/stt", fd, { timeout: 60000 });
      return data.text;
    },
  };
}

export function browserRecognition(onText, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "en-US";
  r.interimResults = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onend = onEnd;
  r.onerror = onEnd;
  r.start();
  return r;
}
