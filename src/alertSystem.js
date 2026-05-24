// Agentique layer — memory (localStorage) + autonomous browser notifications

const STORAGE_KEY = "ocm_signal_history";

export function loadSignalHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSignalToMemory(signal) {
  const history = loadSignalHistory();
  const entry = {
    id: Date.now(),
    date: signal.date,
    score: signal.score,
    zone: signal.zone,
    price: signal.price,
    savedAt: new Date().toISOString(),
  };
  history.unshift(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch {}
  return entry;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendNotification(title, body) {
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, { body });
  setTimeout(() => n.close(), 10000);
}

const ZONE_RANK = { none: -1, neutral: 0, early: 1, watch: 2, strong: 3, bull: 4 };

export function checkZoneTransition(prevZone, newZone, signal) {
  if (!prevZone || prevZone === newZone) return false;
  const prev = ZONE_RANK[prevZone] ?? 0;
  const next = ZONE_RANK[newZone] ?? 0;
  if (next > prev) {
    sendNotification(
      `⚡ OCM Alert — ${newZone.toUpperCase()}`,
      `Score ${signal.score}/100 · $${signal.price?.toLocaleString()} · ${prevZone} → ${newZone}`
    );
    return true;
  }
  return false;
}
