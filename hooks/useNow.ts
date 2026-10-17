"use client";
import * as React from "react";

/** Current time, re-rendering every `intervalMs`. Returns 0 until mounted to keep SSR output stable. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
