"use client";
import { useSyncExternalStore } from "react";
import { getOnchain, getServerOnchain, setOnchain, subscribeOnchain } from "@/lib/devMode";

/** Whether to show on-chain details (queries, raw entities, block numbers, raw addresses). */
export function useOnchain(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(subscribeOnchain, getOnchain, getServerOnchain);
  return [on, setOnchain];
}
