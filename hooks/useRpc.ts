"use client";
import { useSyncExternalStore } from "react";
import { getRpcState, getServerRpcState, subscribeRpc } from "@/lib/rpc";

export function useRpcState() {
  return useSyncExternalStore(subscribeRpc, getRpcState, getServerRpcState);
}

export function useRpcUrl() {
  return useRpcState().selected;
}
