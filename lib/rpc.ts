// Selected RPC endpoint — a censorship-resistance feature: if one endpoint is blocked, switch.
// Persisted in localStorage (best effort; works without it). The Arkiv data source reads
// getRpcUrl() for every request and should call subscribeRpc() to rebuild its client.

import { DEFAULT_RPC } from "./constants";

const KEY_SELECTED = "tankha.rpc";
const KEY_CUSTOM = "tankha.rpc.custom";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

interface RpcState {
  selected: string;
  custom: string[];
}

let state: RpcState = { selected: DEFAULT_RPC, custom: [] };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = { selected: read(KEY_SELECTED, DEFAULT_RPC), custom: read<string[]>(KEY_CUSTOM, []) };
}

export function getRpcState(): RpcState {
  load();
  return state;
}
const SERVER_STATE: RpcState = { selected: DEFAULT_RPC, custom: [] };
export const getServerRpcState = () => SERVER_STATE;

export const getRpcUrl = () => getRpcState().selected;

function emit(next: RpcState) {
  state = next;
  write(KEY_SELECTED, next.selected);
  write(KEY_CUSTOM, next.custom);
  listeners.forEach((l) => l());
}

export function setRpcUrl(url: string) {
  load();
  emit({ ...state, selected: url });
}

export function addCustomRpc(url: string) {
  load();
  const custom = state.custom.includes(url) ? state.custom : [...state.custom, url].slice(-5);
  emit({ selected: url, custom });
}

export function removeCustomRpc(url: string) {
  load();
  emit({
    selected: state.selected === url ? DEFAULT_RPC : state.selected,
    custom: state.custom.filter((u) => u !== url),
  });
}

export function subscribeRpc(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isValidRpcUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
