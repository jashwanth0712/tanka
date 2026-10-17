// "Show on-chain details" — off by default so the app reads like a social app.
// When on: "Show query" boxes, raw on-chain panels, block numbers and raw wallet addresses appear.
// Persisted in localStorage (best effort; works without it).

const KEY = "tankha.onchain";
let value: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (value !== null) return value;
  try {
    value = typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    value = false;
  }
  return value;
}

export const getOnchain = () => read();
export const getServerOnchain = () => false;

export function setOnchain(next: boolean) {
  value = next;
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function subscribeOnchain(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
