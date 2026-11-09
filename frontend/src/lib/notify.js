import { toast } from "sonner";
import { patch } from "./store";
import { uid } from "./time";
import { jevDecide } from "./jev";

export async function requestNotifyPermission() {
  if (!("Notification" in window)) {
    toast.error("This browser does not support notifications");
    return "unsupported";
  }
  const p = await Notification.requestPermission();
  toast(
    p === "granted"
      ? "Device notifications enabled"
      : "Notifications blocked — in-app alerts will still show",
  );
  return p;
}

async function deviceNotify(title, body) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg)
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          tag: title,
        });
      else new Notification(title, { body, icon: "/icon-192.png" });
    }
  } catch {}
}

// urgent: true/false forces the route; undefined lets Jev decide (fallback: urgent).
export async function notify(title, body, { urgent } = {}) {
  let decided = urgent;
  let by = "rule";
  if (decided === undefined) {
    const r = await jevDecide("alert_urgency", { title, body });
    decided = r ? r.urgent : true;
    by = r ? "jev" : "fallback";
  }
  patch("notifications", (n) =>
    [
      {
        id: uid(),
        title,
        body,
        at: Date.now(),
        read: false,
        urgent: decided,
        by,
      },
      ...n,
    ].slice(0, 30),
  );
  if (decided) {
    toast(title, { description: body, duration: 8000 });
    deviceNotify(title, body);
  }
  return decided;
}
