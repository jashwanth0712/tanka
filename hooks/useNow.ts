"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Current time quantised to `intervalMs`, re-rendering each tick.
 * Returns 0 on the server and during hydration so SSR output stays stable.
 */
export function useNow(intervalMs = 60_000) {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}

/** true after hydration. */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
